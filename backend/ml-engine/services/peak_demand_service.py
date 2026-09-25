import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from database import get_db_connection
import warnings
from statsmodels.tools.sm_exceptions import ConvergenceWarning

warnings.simplefilter('ignore', ConvergenceWarning)

FORECAST_DAYS = 30
MIN_HISTORY_DAYS = 40
MIN_SEASONALITY_SCORE = 0.30


def build_peak_demand_projection(df, today=None):
    """Build a rolling 30-calendar-day demand forecast from booking history."""
    if df.empty:
        return []

    history_end = pd.Timestamp(today).normalize() if today is not None else pd.Timestamp.today().normalize()
    df = df.copy()
    df['reservation_date'] = pd.to_datetime(df['reservation_date']).dt.normalize()
    df = df[df['reservation_date'] <= history_end]
    if df.empty:
        return []

    df['category'] = df['booking_type'].apply(
        lambda value: 'vehicle_demand' if str(value).strip().lower() == 'vehicle' else 'facility_demand'
    )
    pivot_df = df.pivot_table(
        index='reservation_date',
        columns='category',
        values='daily_demand',
        aggfunc='sum'
    ).fillna(0)
    for col in ['vehicle_demand', 'facility_demand']:
        if col not in pivot_df.columns:
            pivot_df[col] = 0

    # Preserve weekend activity and fill every unrecorded calendar day with zero.
    history_index = pd.date_range(start=pivot_df.index.min(), end=history_end, freq='D')
    pivot_df = pivot_df.reindex(history_index, fill_value=0).astype(float)

    def weekly_seasonality_score(series):
        if len(series) < MIN_HISTORY_DAYS or series.nunique() < 2:
            return 0.0
        score = series.autocorr(lag=7)
        return 0.0 if pd.isna(score) else round(float(score), 3)

    future_index = pd.date_range(
        start=history_end + pd.Timedelta(days=1),
        periods=FORECAST_DAYS,
        freq='D'
    )

    def seasonal_projection(series):
        model = ExponentialSmoothing(
            series + 0.001,
            trend='add',
            damped_trend=True,
            seasonal='add',
            seasonal_periods=7
        ).fit(optimized=True)
        prediction = model.forecast(FORECAST_DAYS)
        prediction.index = future_index
        return prediction

    def weekday_baseline_projection(series):
        # Recent history is more representative, while light shrinkage toward the
        # overall mean prevents a single unusual weekday from dominating.
        recent = series.tail(min(84, len(series)))
        overall_mean = float(recent.mean()) if len(recent) else 0.0
        weekday_stats = recent.groupby(recent.index.dayofweek).agg(['sum', 'count'])
        prior_days = 2
        values = []
        for date in future_index:
            if date.dayofweek in weekday_stats.index:
                total = float(weekday_stats.loc[date.dayofweek, 'sum'])
                count = float(weekday_stats.loc[date.dayofweek, 'count'])
                values.append((total + prior_days * overall_mean) / (count + prior_days))
            else:
                values.append(overall_mean)
        return pd.Series(values, index=future_index)

    def project(series, score):
        if score >= MIN_SEASONALITY_SCORE:
            try:
                return seasonal_projection(series), 'Weekly seasonal exponential smoothing'
            except Exception:
                pass
        return weekday_baseline_projection(series), 'Recency-weighted weekday baseline'

    vehicle_seasonality_score = weekly_seasonality_score(pivot_df['vehicle_demand'])
    facility_seasonality_score = weekly_seasonality_score(pivot_df['facility_demand'])
    vehicle_projection, vehicle_method = project(pivot_df['vehicle_demand'], vehicle_seasonality_score)
    facility_projection, facility_method = project(pivot_df['facility_demand'], facility_seasonality_score)
    vehicle_seasonality_validated = vehicle_seasonality_score >= MIN_SEASONALITY_SCORE
    facility_seasonality_validated = facility_seasonality_score >= MIN_SEASONALITY_SCORE

    if vehicle_seasonality_validated and facility_seasonality_validated:
        model_note = 'A 30-day forecast is shown using validated weekly patterns for vans and facilities.'
    elif vehicle_seasonality_validated:
        model_note = 'A 30-day forecast is shown. Vans use a validated weekly pattern; facilities use a conservative weekday baseline.'
    elif facility_seasonality_validated:
        model_note = 'A 30-day forecast is shown. Facilities use a validated weekly pattern; vans use a conservative weekday baseline.'
    else:
        model_note = 'A 30-day forecast is shown using a conservative weekday baseline because no reliable weekly pattern was detected.'

    metadata = {
        "projection_available": True,
        "vehicle_projection_available": True,
        "facility_projection_available": True,
        "projection_method": f"Vans: {vehicle_method}; facilities: {facility_method}",
        "vehicle_projection_method": vehicle_method,
        "facility_projection_method": facility_method,
        "seasonality_validated": vehicle_seasonality_validated or facility_seasonality_validated,
        "vehicle_seasonality_score": vehicle_seasonality_score,
        "facility_seasonality_score": facility_seasonality_score,
        "model_note": model_note,
        "history_days": int(len(pivot_df)),
        "history_business_days": int(len(pivot_df)),
        "forecast_days": FORECAST_DAYS
    }

    historical_cutoff = history_end - pd.DateOffset(months=12)
    historical_window = pivot_df[pivot_df.index >= historical_cutoff]
    historical_data = [
        {
            "date": date.strftime("%Y-%m-%d"),
            "vehicle_demand": int(row['vehicle_demand']),
            "facility_demand": int(row['facility_demand']),
            "type": "historical",
            **metadata
        }
        for date, row in historical_window.iterrows()
    ]
    forecast_data = [
        {
            "date": date.strftime("%Y-%m-%d"),
            "vehicle_demand": max(0, round(float(vehicle_projection.loc[date]), 2)),
            "facility_demand": max(0, round(float(facility_projection.loc[date]), 2)),
            "type": "forecast",
            **metadata
        }
        for date in future_index
    ]
    return historical_data + forecast_data

def calculate_peak_demand():
    """
    Produces a 30-calendar-day planning projection. Reliable weekly patterns
    use seasonal smoothing; irregular demand uses a conservative baseline.
    """
    query = """
        SELECT
            reservation_date,
            booking_type,
            COUNT(booking_id) as daily_demand
        FROM public.bookings
        WHERE status IN (
            'Confirmed', 'Approved', 'Ongoing', 'Delayed',
            'Rescheduled', 'Resource Reassigned', 'Completed'
        )
          AND reservation_date <= CURRENT_DATE
        GROUP BY reservation_date, booking_type
        ORDER BY reservation_date;
    """
    with get_db_connection() as conn:
        df = pd.read_sql_query(query, conn)

    return build_peak_demand_projection(df)
