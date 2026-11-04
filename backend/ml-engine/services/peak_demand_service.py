"""Thirty daily request forecasts; weekly views sum the same daily estimates."""
from copy import deepcopy
from hashlib import sha256
from threading import Lock
import numpy as np
import pandas as pd
from scipy.stats import poisson
from sklearn.feature_extraction import DictVectorizer
from sklearn.linear_model import PoissonRegressor, LogisticRegression
from sklearn.pipeline import make_pipeline
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from database import get_db_connection
from business_calendar import MANILA, HOLIDAYS

FORECAST_DAYS = 30
CATEGORIES = ('vehicle_demand', 'facility_demand')
METHODS = ('recent_mean', 'seasonal_naive', 'weekday', 'weekday_28', 'weekday_180', 'weekday_365',
           'day_type_84',
           'booking_pickup_28', 'booking_pickup_180', 'booking_pickup_adaptive',
           'calendar_poisson', 'seasonal_smoothing', 'seasonal_level', 'seasonal_blend')
LABELS = {'recent_mean':'Recent 28-day mean baseline', 'seasonal_naive':'Last-week seasonal baseline',
          'weekday':'Recent weekday baseline', 'calendar_poisson':'Calendar Poisson regression',
          'seasonal_smoothing':'Additive Holt-Winters with damped trend',
          'weekday_180':'180-day weekday averages', 'weekday_365':'365-day weekday averages',
          'weekday_28':'28-day weekday averages', 'day_type_84':'84-day weekday/weekend averages',
          'booking_pickup_28':'Advance bookings + 28-day weekday pickup forecast',
          'booking_pickup_180':'Advance bookings + 180-day weekday pickup forecast',
          'booking_pickup_adaptive':'Advance-booking-adjusted weekday pickup forecast',
          'seasonal_level':'Seasonal exponential smoothing without trend',
          'seasonal_blend':'Seasonal smoothing / weekday ensemble'}
VALIDATION_PERIODS = 6
_PROJECTION_CACHE = {}
_PROJECTION_LOCK = Lock()


def load_booking_history():
    # All statuses, grouped by reservation AND creation date to support as-of tests.
    with get_db_connection() as conn:
        return pd.read_sql_query("""SELECT reservation_date, booking_type, created_at::date AS created_date,
            COUNT(booking_id) AS daily_demand,
            BOOL_AND(purpose LIKE 'Synthetic %') AS synthetic
            FROM public.bookings WHERE reservation_date IS NOT NULL
            GROUP BY reservation_date, booking_type, created_at::date
            ORDER BY reservation_date""", conn)


def daily_history(df, end):
    end = pd.Timestamp(end).normalize().tz_localize(None)
    df = df.copy()
    df['reservation_date'] = pd.to_datetime(df.reservation_date).dt.normalize()
    df = df[df.reservation_date <= end]
    if 'created_date' in df:
        df = df[pd.to_datetime(df.created_date) <= end]
    if df.empty:
        return pd.DataFrame(columns=CATEGORIES, index=pd.DatetimeIndex([]), dtype=float)
    df['category'] = df.booking_type.map(lambda x: 'vehicle_demand' if str(x).strip().lower()=='vehicle' else 'facility_demand')
    p = df.pivot_table(index='reservation_date',columns='category',values='daily_demand',aggfunc='sum')
    return p.reindex(index=pd.date_range(p.index.min(),end),columns=CATEGORIES).fillna(0).astype(float)


def calendar_features(index):
    # No suspension information from the future is used in model features.
    return [{'weekday':str(d.weekday()), 'month':str(d.month),
             'holiday':str(d.date() in HOLIDAYS),
             'trend': (d-pd.Timestamp('2020-01-01')).days/365.25} for d in index]


def forecast_series(series, method, days=FORECAST_DAYS):
    index = pd.date_range(series.index[-1]+pd.Timedelta(days=1), periods=days)
    if method == 'recent_mean':
        values = np.repeat(series.tail(28).mean(), days)
    elif method == 'seasonal_naive':
        values = np.resize(series.tail(7).to_numpy(), days)
    elif method == 'day_type_84':
        recent = series.tail(84)
        averages = recent.groupby(recent.index.dayofweek<5).mean()
        values = [averages.get(d.weekday()<5,recent.mean()) for d in index]
    elif method in ('weekday_28', 'weekday_180', 'weekday_365'):
        recent = series.tail(int(method.split('_')[1]))
        averages = recent.groupby(recent.index.dayofweek).mean()
        values = [averages.get(d.weekday(),recent.mean()) for d in index]
    elif method == 'weekday':
        recent = series.tail(84)
        stats = recent.groupby(recent.index.dayofweek).agg(['sum','count'])
        values = [(stats.loc[d.weekday(),'sum']+2*recent.mean())/(stats.loc[d.weekday(),'count']+2)
                  if d.weekday() in stats.index else recent.mean() for d in index]
    elif method == 'calendar_poisson' and series.sum() > 0:
        model = make_pipeline(DictVectorizer(sparse=False), PoissonRegressor(alpha=0.1,max_iter=300))
        model.fit(calendar_features(series.index),series.to_numpy())
        values = model.predict(calendar_features(index))
    elif method in ('seasonal_smoothing','seasonal_level') and len(series) >= 28 and series.sum() > 0:
        has_trend = method == 'seasonal_smoothing'
        model = ExponentialSmoothing(series+0.001, trend='add' if has_trend else None, damped_trend=has_trend,
                                     seasonal='add',seasonal_periods=7).fit(optimized=True)
        values = model.forecast(days).to_numpy()
    elif method == 'seasonal_blend':
        values = (forecast_series(series,'seasonal_level',days).to_numpy()+
                  forecast_series(series,'weekday_180',days).to_numpy())/2
    else:
        values = np.repeat(series.mean(),days)
    values = np.asarray(values,dtype=float)
    if not np.isfinite(values).all():
        raise ValueError('Nonfinite demand forecast')
    return pd.Series(np.maximum(values,0),index=index)


def select_demand_method(df, end, category):
    # Model choice targets the whole horizon, never final test scores.
    scores = {}
    end = pd.Timestamp(end).normalize().tz_localize(None)
    for method in METHODS:
        errors, total_errors = [], []
        for offset in range(VALIDATION_PERIODS*FORECAST_DAYS,0,-FORECAST_DAYS):
            cutoff = end-pd.Timedelta(days=offset)
            train = daily_history(df,cutoff)
            if len(train) < 90:
                continue
            actual = daily_history(df,cutoff+pd.Timedelta(days=30))[category]
            try:
                pred = forecast_demand(df,cutoff,category,method)
            except (ValueError, RuntimeError, np.linalg.LinAlgError):
                errors = []
                break
            residual = actual.reindex(pred.index).to_numpy()-pred.to_numpy()
            errors.extend(residual.tolist())
            total_errors.append(float(residual.sum()))
        if errors:
            errors = np.asarray(errors)
            scores[method] = {'total_mae':float(np.abs(total_errors).mean()),
                             'total_rmse':float(np.sqrt(np.mean(np.square(total_errors)))),
                             'mae':float(np.abs(errors).mean()),'rmse':float(np.sqrt(np.mean(errors**2))),
                             'validation_periods':len(total_errors)}
    method = min(scores,key=lambda m:(scores[m]['total_mae'],scores[m]['rmse'])) if scores else 'weekday'
    return method, scores


def booking_pickup_components(df, end, category, base):
    """Use known reservations as features, never future-created rows as outcomes.

    Historical lead times estimate the fraction of eventual requests which have
    not arrived yet at each horizon. Same-day creation is included only through
    the end of the cutoff date, matching the existing date-level backtest.
    """
    index = base.index
    if 'created_date' not in df:
        return np.zeros(len(index)),base.to_numpy()
    rows=df.copy()
    rows['reservation_date']=pd.to_datetime(rows.reservation_date).dt.normalize()
    rows['created_date']=pd.to_datetime(rows.created_date).dt.normalize()
    is_vehicle=rows.booking_type.astype(str).str.strip().str.lower().eq('vehicle')
    rows=rows[is_vehicle if category=='vehicle_demand' else ~is_vehicle]
    rows=rows[rows.created_date<=pd.Timestamp(end)]
    pending=rows[rows.reservation_date>pd.Timestamp(end)].groupby('reservation_date').daily_demand.sum()
    known=pending.reindex(index,fill_value=0).to_numpy(dtype=float)
    historical=rows[(rows.reservation_date<=pd.Timestamp(end)) &
                    (rows.reservation_date>pd.Timestamp(end)-pd.Timedelta(days=365))].copy()
    if historical.empty or historical.daily_demand.sum()<=0:
        return known,base.to_numpy()
    leads=(historical.reservation_date-historical.created_date).dt.days
    weights=historical.daily_demand.to_numpy()
    fraction=np.array([weights[leads.to_numpy()<(d-pd.Timestamp(end)).days].sum()/weights.sum() for d in index])
    return known,base.to_numpy()*fraction


def forecast_demand(df, end, category, method):
    series=daily_history(df,end)[category]
    if method.startswith('booking_pickup_'):
        adaptive = method=='booking_pickup_adaptive'
        base=forecast_series(series,'weekday_180' if adaptive else 'weekday_'+method.rsplit('_',1)[1])
        known,remaining=booking_pickup_components(df,end,category,base)
        if adaptive:
            # Gamma-Poisson level update: a one-week-equivalent prior tempers
            # the signal from reservations already known for the coming horizon.
            prior_requests=max(float(series.tail(180).mean()*7),1.)
            expected_known=float(np.maximum(base.to_numpy()-remaining,0).sum())
            level=(float(known.sum())+prior_requests)/(expected_known+prior_requests)
            remaining=remaining*level
        return pd.Series(known+remaining,index=base.index)
    return forecast_series(series,method)


def peak_probabilities(series, index, threshold, method):
    """Probability of exceeding a fixed historical count threshold, not a count forecast."""
    labels = (series > threshold).astype(float)
    prior = float(labels.mean())
    if method == 'constant' or labels.nunique() < 2:
        return np.repeat(prior,len(index))
    if method == 'calendar_logistic':
        model = make_pipeline(DictVectorizer(sparse=False), LogisticRegression(C=0.1,max_iter=300))
        model.fit(calendar_features(series.index),labels)
        return model.predict_proba(calendar_features(index))[:,1]
    if method == 'weekday_recent':
        labels = labels.tail(180)
    stats = labels.groupby(labels.index.dayofweek).agg(['sum','count'])
    return np.array([(stats.loc[d.weekday(),'sum']+2*prior)/(stats.loc[d.weekday(),'count']+2)
                     if d.weekday() in stats.index else prior for d in index])


def forecast_peak_probabilities(df, end, category, index, threshold, method):
    series=daily_history(df,end)[category]
    if method=='booking_pickup':
        base=forecast_series(series,'weekday_180',len(index))
        known,remaining=booking_pickup_components(df,end,category,base)
        return poisson.sf(threshold-known,remaining)
    return peak_probabilities(series,index,threshold,method)


def select_peak_warning(df, end, category):
    """Select probabilities by Brier score, then a warning cutoff by validation F1.

    The peak count threshold is frozen using history before the first validation
    window, so labels do not use validation or final-test outcomes.
    """
    end = pd.Timestamp(end).normalize().tz_localize(None)
    first = end-pd.Timedelta(days=VALIDATION_PERIODS*FORECAST_DAYS)
    initial = daily_history(df,first)
    if len(initial)<90:
        history = daily_history(df,end)
        return {'method':'constant','count_threshold':float(history[category].quantile(.9)),
                'probability_cutoff':1.0,'available':False,'validation':{}}
    threshold = float(initial[category].quantile(.9))
    scores, outputs = {}, {}
    observed = []
    for offset in range(VALIDATION_PERIODS*FORECAST_DAYS,0,-FORECAST_DAYS):
        cutoff = end-pd.Timedelta(days=offset)
        index = pd.date_range(cutoff+pd.Timedelta(days=1),periods=FORECAST_DAYS)
        actual = daily_history(df,index[-1])[category].reindex(index)
        observed.extend((actual>threshold).astype(int).tolist())
        for method in ('constant','weekday','weekday_recent','calendar_logistic','booking_pickup'):
            outputs.setdefault(method,[]).extend(forecast_peak_probabilities(df,cutoff,category,index,threshold,method).tolist())
    y = np.asarray(observed)
    for method,p in outputs.items():
        scores[method] = {'brier':float(np.mean((np.asarray(p)-y)**2))}
    method = min(scores,key=lambda m:scores[m]['brier'])
    p = np.asarray(outputs[method])
    cutoffs = []
    for cutoff in np.arange(.10,.81,.05):
        flags = p>=cutoff
        tp = int(np.sum(flags & (y==1)))
        precision = tp/flags.sum() if flags.any() else 0.
        recall = tp/y.sum() if y.sum() else 0.
        f1 = 2*precision*recall/(precision+recall) if precision+recall else 0.
        cutoffs.append((f1,precision,float(cutoff)))
    f1,precision,cutoff = max(cutoffs)
    return {'method':method,'count_threshold':threshold,'probability_cutoff':cutoff,
            'available':bool(y.sum()),'validation':scores,'validation_f1':f1,
            'validation_precision':precision,'validation_observations':len(y)}


def forecast_daily(df, end):
    history = daily_history(df,end)
    if history.empty:
        return history, {}, {}
    predictions, selection = {}, {}
    for col in CATEGORIES:
        method,scores = select_demand_method(df,end,col)
        predictions[col] = forecast_demand(df,end,col,method)
        selection[col] = {'method':method,'validation':scores}
    return history, pd.DataFrame(predictions), selection


def aggregate_forecast_weeks(rows):
    forecast = sorted((r for r in rows if r['type']=='forecast'),key=lambda r:r['date'])
    result = []
    for start in range(0,len(forecast),7):
        group = forecast[start:start+7]
        result.append({'period':start//7+1,'start_date':group[0]['date'],'end_date':group[-1]['date'],
                       'days':len(group),'partial':len(group)<7,
                       **{c:round(sum(r[c] for r in group),2) for c in CATEGORIES}})
    return result


def build_peak_demand_projection(df, today=None):
    if df.empty:
        return []
    # Explicit today is a closed historical cutoff. Live use excludes the incomplete day.
    end = (pd.Timestamp(today).normalize().tz_localize(None) if today is not None else
           pd.Timestamp.now(tz=MANILA).tz_localize(None).normalize()-pd.Timedelta(days=1))
    history, forecast, selection = forecast_daily(df,end)
    if history.empty:
        return []
    warnings = {c:select_peak_warning(df,end,c) for c in CATEGORIES}
    probabilities = {c:forecast_peak_probabilities(df,end,c,forecast.index,warnings[c]['count_threshold'],
                                                  warnings[c]['method']) for c in CATEGORIES}
    methods = {c:LABELS[selection[c]['method']] for c in CATEGORIES}
    metadata = {'projection_available':True,'forecast_days':FORECAST_DAYS,'history_days':len(history),
                'history_end':end.date().isoformat(),
                'vehicle_projection_method':methods['vehicle_demand'],
                'facility_projection_method':methods['facility_demand'],
                'projection_method':f"Vans: {methods['vehicle_demand']}; facilities: {methods['facility_demand']}",
                'model_note':'30-day forecast of all booking requests by reservation date. Selection minimizes total-demand error on earlier validation periods; a baseline may be selected.',
                'peak_definition':'Above the pre-validation history 90th percentile of daily request counts',
                'peak_warning_note':'Risk warnings use separately evaluated probabilities, not confirmed bookings or guaranteed peaks.',
                'synthetic_history':bool(df.synthetic.all()) if 'synthetic' in df else None}
    last_nonzero = history.index[history.sum(axis=1)>0].max()
    metadata['days_since_last_request'] = int((end-last_nonzero).days) if pd.notna(last_nonzero) else len(history)
    metadata['history_gap_warning'] = metadata['days_since_last_request']>7
    historical = [{'date':d.date().isoformat(),'type':'historical',**{c:int(row[c]) for c in CATEGORIES},**metadata}
                  for d,row in history[history.index>=end-pd.DateOffset(months=12)].iterrows()]
    projected = [{'date':d.date().isoformat(),'type':'forecast',
                  **{c:round(float(row[c]),2) for c in CATEGORIES},
                  **{c+'_peak':bool(warnings[c]['available'] and probabilities[c][i]>=warnings[c]['probability_cutoff']) for c in CATEGORIES},
                  **{c+'_peak_probability':round(float(probabilities[c][i]),4) for c in CATEGORIES},
                  **{c+'_peak_threshold':warnings[c]['count_threshold'] for c in CATEGORIES},
                  **{c+'_peak_probability_cutoff':warnings[c]['probability_cutoff'] for c in CATEGORIES},
                  **{c+'_peak_warning_available':warnings[c]['available'] for c in CATEGORIES},**metadata}
                 for i,(d,row) in enumerate(forecast.iterrows())]
    return historical+projected


def calculate_peak_demand():
    df=load_booking_history()
    day=pd.Timestamp.now(tz=MANILA).date().isoformat()
    key=(day,sha256(pd.util.hash_pandas_object(df,index=True).values.tobytes()).hexdigest())
    # Refit when the local day or source records change, not on every page refresh.
    with _PROJECTION_LOCK:
        if _PROJECTION_CACHE.get('key')!=key:
            rows=build_peak_demand_projection(df)
            _PROJECTION_CACHE.update(key=key,rows=rows)
        return deepcopy(_PROJECTION_CACHE['rows'])
