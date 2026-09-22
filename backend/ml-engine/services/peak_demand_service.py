import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from database import get_db_connection
import warnings
from statsmodels.tools.sm_exceptions import ConvergenceWarning

warnings.simplefilter('ignore', ConvergenceWarning)

def calculate_peak_demand():
    """
    Produces a short-term planning projection only when business-day booking
    history demonstrates a repeatable weekly pattern.
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
        GROUP BY reservation_date, booking_type
        ORDER BY reservation_date;
    """
    with get_db_connection() as conn:
        df = pd.read_sql_query(query, conn)
        
    if df.empty:
        return []
        
    df['reservation_date'] = pd.to_datetime(df['reservation_date'])
    df['category'] = df['booking_type'].apply(lambda x: 'vehicle_demand' if x == 'Vehicle' else 'facility_demand')
    
    pivot_df = df.pivot_table(index='reservation_date', columns='category', values='daily_demand', aggfunc='sum').fillna(0)
    for col in ['vehicle_demand', 'facility_demand']:
        if col not in pivot_df.columns:
            pivot_df[col] = 0
            
    # Resample strictly to Business Days (Monday to Friday) matching university operations
    pivot_df = pivot_df.resample('B').sum().fillna(0)
    
    def weekly_seasonality_score(series):
        if len(series) < 40 or series.nunique() < 2:
            return 0.0
        score = series.autocorr(lag=5)
        return 0.0 if pd.isna(score) else round(float(score), 3)

    def safe_seasonal_projection(series, periods=30):
        future_index = pd.bdate_range(start=series.index[-1] + pd.Timedelta(days=1), periods=periods)
        try:
            model = ExponentialSmoothing(
                series + 0.001,
                trend='add',
                damped_trend=True,
                seasonal='add',
                seasonal_periods=5
            ).fit(optimized=True)
            return model.forecast(periods)
        except Exception:
            weekday_averages = series.groupby(series.index.dayofweek).mean()
            values = [float(weekday_averages.get(date.dayofweek, series.mean())) for date in future_index]
            return pd.Series(values, index=future_index)

    vehicle_seasonality_score = weekly_seasonality_score(pivot_df['vehicle_demand'])
    facility_seasonality_score = weekly_seasonality_score(pivot_df['facility_demand'])
    vehicle_projection_available = vehicle_seasonality_score >= 0.30
    facility_projection_available = facility_seasonality_score >= 0.30
    projection_available = vehicle_projection_available or facility_projection_available
    projection_method = 'Weekly seasonal exponential smoothing'

    if vehicle_projection_available and facility_projection_available:
        model_note = 'A recurring weekly pattern was detected for both van and facility bookings.'
    elif vehicle_projection_available:
        model_note = 'A recurring weekly pattern was detected for van bookings only; no facility projection is shown.'
    elif facility_projection_available:
        model_note = 'A recurring weekly pattern was detected for facility bookings only; no van projection is shown.'
    elif len(pivot_df) < 40:
        model_note = 'Historical usage only. At least 40 business days are required to evaluate a recurring weekly pattern.'
    else:
        model_note = 'Historical usage only. No reliable recurring weekly pattern was detected, so no future projection is shown.'

    future_index = pd.bdate_range(start=pivot_df.index[-1] + pd.Timedelta(days=1), periods=30)
    vehicle_projection = (
        safe_seasonal_projection(pivot_df['vehicle_demand'])
        if vehicle_projection_available else pd.Series([None] * 30, index=future_index)
    )
    facility_projection = (
        safe_seasonal_projection(pivot_df['facility_demand'])
        if facility_projection_available else pd.Series([None] * 30, index=future_index)
    )
    
    # Keep a full year so the 3/6/9/12-month UI filter has distinct windows.
    historical_cutoff = pivot_df.index.max() - pd.DateOffset(months=12)
    historical_window = pivot_df[pivot_df.index >= historical_cutoff]

    historical_data = [
        {
            "date": date.strftime("%Y-%m-%d"), 
            "vehicle_demand": int(row['vehicle_demand']),
            "facility_demand": int(row['facility_demand']),
            "type": "historical",
            "projection_available": projection_available,
            "vehicle_projection_available": vehicle_projection_available,
            "facility_projection_available": facility_projection_available,
            "projection_method": projection_method,
            "seasonality_validated": projection_available,
            "vehicle_seasonality_score": vehicle_seasonality_score,
            "facility_seasonality_score": facility_seasonality_score,
            "model_note": model_note,
            "history_business_days": int(len(pivot_df))
        }
        for date, row in historical_window.iterrows()
    ]
    
    forecast_data = [
        {
            "date": vehicle_projection.index[i].strftime("%Y-%m-%d"),
            "vehicle_demand": max(0, round(float(vehicle_projection.iloc[i]), 2)) if vehicle_projection_available else None,
            "facility_demand": max(0, round(float(facility_projection.iloc[i]), 2)) if facility_projection_available else None,
            "type": "forecast",
            "projection_available": True,
            "vehicle_projection_available": vehicle_projection_available,
            "facility_projection_available": facility_projection_available,
            "projection_method": projection_method,
            "seasonality_validated": True,
            "vehicle_seasonality_score": vehicle_seasonality_score,
            "facility_seasonality_score": facility_seasonality_score,
            "model_note": model_note,
            "history_business_days": int(len(pivot_df))
        }
        for i in range(len(future_index))
    ] if projection_available else []
    
    return historical_data + forecast_data
