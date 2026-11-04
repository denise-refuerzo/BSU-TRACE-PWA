"""EDC in working minutes: first scan to completion, including transfers.

Selection uses an inner chronological holdout; the validator reserves a separate
final test. The 24-working-hour allowance never enters the training target.
"""
from collections import defaultdict
from threading import Lock
from time import monotonic
import numpy as np
import pandas as pd
from sklearn.feature_extraction import DictVectorizer
from sklearn.linear_model import Ridge
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from database import get_db_connection
from business_calendar import (add_business_minutes, business_minutes_between,
                               calendar_covers, normalize_start, CALENDAR_NOTE, MANILA)

BUFFER_HOURS = 24
METHODS = ('dwell_transfer', 'ridge', 'ridge_log')
_MODEL_CACHE = {}
_MODEL_LOCK = Lock()


def load_edc_history():
    query = """
        SELECT d.ini_id, d.route_snapshot, d.title LIKE 'Synthetic %%' AS synthetic,
               pd.pd_id, pd.s_id, pd.current_office_id, pd.time_in, pd.time_out
        FROM public.initial_document d
        JOIN public.processed_document pd ON pd.ini_id = d.ini_id
        WHERE d.route_snapshot IS NOT NULL
        ORDER BY d.ini_id, pd.time_in NULLS LAST, pd.pd_id
    """
    with get_db_connection() as conn:
        steps = pd.read_sql_query(query.replace('%%', '%'), conn)
    return prepare_edc_history(steps)


def prepare_edc_history(steps):
    records, excluded = [], 0
    for ini_id, group in steps.groupby('ini_id', sort=False):
        group = group.sort_values(['time_in', 'pd_id'])
        route = [int(x) for x in group.iloc[0].route_snapshot if x is not None]
        if (len(group) < 2 or not route or group[['time_in', 'time_out']].isna().any().any()
                or int(group.iloc[-1].s_id) != 5):
            excluded += 1
            continue
        dwells, transfers, previous = [], [], None
        invalid = False
        for row in group.itertuples():
            start, end = pd.Timestamp(row.time_in).to_pydatetime(), pd.Timestamp(row.time_out).to_pydatetime()
            if end < start or (previous is not None and start < previous[1]):
                invalid = True
                break
            dwells.append((int(row.current_office_id), business_minutes_between(start, end)))
            if previous is not None:
                transfers.append((previous[0], int(row.current_office_id),
                                  business_minutes_between(previous[1], start)))
            previous = (int(row.current_office_id), end)
        if invalid:
            excluded += 1
            continue
        start, end = pd.Timestamp(group.iloc[0].time_in), pd.Timestamp(group.iloc[-1].time_out)
        target = business_minutes_between(start.to_pydatetime(), end.to_pydatetime())
        if target <= 0:
            excluded += 1
            continue
        records.append(dict(ini_id=int(ini_id), route=route, start=start, end=end,
                            minutes=target, dwells=dwells, transfers=transfers,
                            synthetic=bool(group.iloc[0].get('synthetic', False))))
    docs = pd.DataFrame(records, columns=['ini_id','route','start','end','minutes','dwells','transfers','synthetic'])
    docs = docs.sort_values(['start', 'ini_id']).reset_index(drop=True)
    docs.attrs['excluded_documents'] = excluded
    return docs


def temporal_split(docs, fraction=0.8):
    """Do not train on documents whose completion was unknown at prediction time."""
    if len(docs) < 2:
        return docs.iloc[:0], docs
    boundary = docs.iloc[min(len(docs)-1, max(1, int(len(docs)*fraction)))].start
    return docs[(docs.start < boundary) & (docs.end < boundary)], docs[docs.start >= boundary]


class EDCModel:
    def __init__(self, method='dwell_transfer'):
        self.method = method

    def fit(self, docs):
        dwell, transfer = defaultdict(list), defaultdict(list)
        for row in docs.itertuples():
            for office, minutes in row.dwells:
                dwell[office].append(minutes)
            for a, b, minutes in row.transfers:
                transfer[(a, b)].append(minutes)
        all_dwell = [x for values in dwell.values() for x in values]
        all_transfer = [x for values in transfer.values() for x in values]
        self.global_dwell = float(np.mean(all_dwell)) if all_dwell else 240.0
        self.global_transfer = float(np.mean(all_transfer)) if all_transfer else 30.0
        self.dwell = {k: float(np.mean(v)) for k,v in dwell.items()}
        self.transfer = {k: float(np.mean(v)) for k,v in transfer.items()}
        self.pipeline = None
        if self.method != 'dwell_transfer' and len(docs) >= 20:
            self.pipeline = make_pipeline(DictVectorizer(sparse=False), StandardScaler(), Ridge(alpha=10))
            y = docs.minutes.to_numpy(float)
            target = np.log1p(y) if self.method == 'ridge_log' else y
            features = [self.features(row.route, row.start) for row in docs.itertuples()]
            self.pipeline.fit(features, target)
            # Training-only retransformation correction for log predictions.
            self.smearing = float(np.mean(np.exp(target-self.pipeline.predict(features)))) if self.method == 'ridge_log' else 1
        return self

    def features(self, route, start):
        start = pd.Timestamp(start)
        f = {'dwell': sum(self.dwell.get(x, self.global_dwell) for x in route),
             'transfer': sum(self.transfer.get((a,b), self.global_transfer) for a,b in zip(route,route[1:])),
             'stops': len(route), 'start_hour': start.hour + start.minute/60,
             'weekday': str(start.weekday()), 'month': str(start.month)}
        for office in route:
            key = f'office_{office}'
            f[key] = f.get(key, 0) + 1
        return f

    def predict(self, docs):
        features = [self.features(row.route, row.start) for row in docs.itertuples()]
        if not features:
            return np.array([])
        if self.pipeline is None:
            return np.array([f['dwell'] + f['transfer'] for f in features])
        pred = self.pipeline.predict(features)
        if self.method == 'ridge_log':
            pred = np.exp(pred) * self.smearing - 1
        return np.maximum(pred, 0)


def select_edc_model(docs):
    train, validation = temporal_split(docs)
    scores = {}
    if len(train) >= 50 and len(validation) >= 20:
        for method in METHODS:
            pred = EDCModel(method).fit(train).predict(validation)
            error = validation.minutes.to_numpy(float) - pred
            scores[method] = {'mae_minutes': float(np.abs(error).mean()),
                              'rmse_minutes': float(np.sqrt(np.mean(error**2)))}
    method = min(scores, key=lambda m: (scores[m]['mae_minutes'], scores[m]['rmse_minutes'])) if scores else 'dwell_transfer'
    return EDCModel(method).fit(docs), scores


def prediction_record(model, route, start, process_id=None):
    raw = float(model.predict(pd.DataFrame([{'route':route, 'start':start}]))[0])
    raw_end = add_business_minutes(start, raw)
    buffered_end = add_business_minutes(start, raw + BUFFER_HOURS*60)
    return {'process_id': process_id, 'estimated_hours_to_complete': round(raw/60, 2),
            'safety_buffer_working_hours': BUFFER_HOURS,
            'buffered_working_hours': round(raw/60 + BUFFER_HOURS, 2),
            'estimated_completion_at': raw_end.isoformat(),
            'estimated_delivery_date': buffered_end.date().isoformat(),
            'buffered_delivery_at': buffered_end.isoformat(),
            'prediction_method': model.method, 'duration_unit': 'working hours',
            'estimate_start': start.isoformat(),
            'calendar_coverage_available': calendar_covers(start, buffered_end),
            'calendar_note': CALENDAR_NOTE}


def serving_model():
    # Repeated route previews should not reread/retrain the full history.
    with _MODEL_LOCK:
        if not _MODEL_CACHE or monotonic()-_MODEL_CACHE['at'] >= 900:
            docs = load_edc_history()
            now = pd.Timestamp.now(tz=MANILA).tz_localize(None)
            docs = docs[docs.end <= now]
            model, _ = select_edc_model(docs)
            _MODEL_CACHE.update(model=model, at=monotonic())
        return _MODEL_CACHE['model']


def calculate_edc(route_ids=None):
    model = serving_model()
    start = normalize_start(pd.Timestamp.now(tz=MANILA).to_pydatetime())
    if route_ids:
        route = [int(x) for x in route_ids if x is not None]
        return [prediction_record(model, route, start)]
    with get_db_connection() as conn:
        processes = pd.read_sql_query("""SELECT p.p_id, r.stop_1,r.stop_2,r.stop_3,r.stop_4,r.stop_5,r.stop_6,r.stop_7
            FROM public.process_type p JOIN public.route r ON p.r_id=r.r_id WHERE p.is_active IS TRUE""", conn)
    return [prediction_record(model, [int(getattr(p,f'stop_{i}')) for i in range(1,8)
                                      if pd.notna(getattr(p,f'stop_{i}'))], start, int(p.p_id))
            for p in processes.itertuples()]
