import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from database import get_db_connection
import warnings
from statsmodels.tools.sm_exceptions import ConvergenceWarning

warnings.simplefilter('ignore', ConvergenceWarning)

def calculate_peak_demand():
    """
    Trains Holt-Winters Exponential Smoothing models on business-day historical 
    booking data to forecast future resource demand for the next 30 business days.
    """
    query = """
        SELECT 
            reservation_date, 
            booking_type,
            COUNT(booking_id) as daily_demand
        FROM public.bookings
        WHERE status = 'Confirmed'
        GROUP BY reservation_date, booking_type
        ORDER BY reservation_date;
    """
    with get_db_connection() as conn:
        df = pd.read_sql_query(query, conn)
        
    if df.empty or len(df) < 14:
        return {"message": "Not enough historical data to train the forecast."}
        
    df['reservation_date'] = pd.to_datetime(df['reservation_date'])
    df['category'] = df['booking_type'].apply(lambda x: 'vehicle_demand' if x == 'Vehicle' else 'facility_demand')
    
    pivot_df = df.pivot_table(index='reservation_date', columns='category', values='daily_demand', aggfunc='sum').fillna(0)
    for col in ['vehicle_demand', 'facility_demand']:
        if col not in pivot_df.columns:
            pivot_df[col] = 0
            
    # Resample strictly to Business Days (Monday to Friday) matching university operations
    pivot_df = pivot_df.resample('B').sum().fillna(0)
    
    def safe_forecast(series, periods=30):
            try:
                model = ExponentialSmoothing(
                    series + 0.001, 
                    trend=None, 
                    seasonal=None
                ).fit(smoothing_level=0.2, optimized=False)
                return model.forecast(periods)
            except Exception:
                future_index = pd.bdate_range(start=series.index[-1] + pd.Timedelta(days=1), periods=periods)
                return pd.Series([float(series.tail(14).mean())] * periods, index=future_index)

    vehicle_forecast = safe_forecast(pivot_df['vehicle_demand'])
    facility_forecast = safe_forecast(pivot_df['facility_demand'])
    
    historical_data = [
        {
            "date": date.strftime("%Y-%m-%d"), 
            "vehicle_demand": int(row['vehicle_demand']),
            "facility_demand": int(row['facility_demand']),
            "type": "historical"
        }
        for date, row in pivot_df.tail(60).iterrows()
    ]
    
    forecast_data = [
        {
            "date": vehicle_forecast.index[i].strftime("%Y-%m-%d"), 
            "vehicle_demand": max(0, round(float(vehicle_forecast.iloc[i]), 2)),
            "facility_demand": max(0, round(float(facility_forecast.iloc[i]), 2)),
            "type": "forecast"
        }
        for i in range(len(vehicle_forecast))
    ]
    
    return historical_data + forecast_data