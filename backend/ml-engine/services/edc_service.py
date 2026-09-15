import pandas as pd
from database import get_db_connection
from business_calendar import add_business_minutes, MANILA

TRANSFER_MINUTES = 30

def calculate_edc(route_ids=None):
    # 1. Pull historical dwell times per office
    # This query calculates the average time (in hours) a document spends at each office
    dwell_query = """
        SELECT current_office_id,
               AVG(COALESCE(duration_minutes, EXTRACT(EPOCH FROM (time_out - time_in))/60.0)) AS avg_minutes
        FROM public.processed_document
        WHERE time_in IS NOT NULL AND time_out IS NOT NULL
        GROUP BY current_office_id;
    """
    
    with get_db_connection() as conn:
        dwell_df = pd.read_sql_query(dwell_query, conn)
    
    # Create a dictionary for quick lookup: {office_id: avg_hours}
    dwell_map = {
        int(row.current_office_id): float(row.avg_minutes)
        for row in dwell_df.itertuples(index=False)
        if pd.notna(row.current_office_id) and pd.notna(row.avg_minutes)
    }
    
    # 2. Return a prediction based on actual historical data per office
    # If a specific office hasn't been visited yet, we use a global average (e.g., 24 hours)
    global_avg = float(dwell_df['avg_minutes'].mean()) if not dwell_df.empty else 240.0
    
    if route_ids:
        valid_route = [int(stop) for stop in route_ids if stop is not None]
        total_minutes = sum(dwell_map.get(stop, global_avg) for stop in valid_route)
        total_minutes += max(0, len(valid_route) - 1) * TRANSFER_MINUTES
        delivery = add_business_minutes(pd.Timestamp.now(tz=MANILA).to_pydatetime(), total_minutes)
        return [{
            "process_id": None,
            "estimated_hours_to_complete": float(round(total_minutes / 60, 2)),
            "estimated_delivery_date": delivery.date().isoformat(),
        }]
    predictions = []
    # Generate predictions for all process patterns existing in your DB
    query_processes = """
        SELECT p.p_id, r.stop_1, r.stop_2, r.stop_3, r.stop_4, r.stop_5, r.stop_6, r.stop_7
        FROM public.process_type p
        JOIN public.route r ON p.r_id = r.r_id
        WHERE p.is_active IS TRUE
    """
    with get_db_connection() as conn:
        processes = pd.read_sql_query(query_processes, conn)
    
    for _, proc in processes.iterrows():
        # Sum the average dwell times of all active stops in this process
        total_estimated_minutes = 0.0
        stops = [proc['stop_1'], proc['stop_2'], proc['stop_3'], proc['stop_4'], proc['stop_5'], proc['stop_6'], proc['stop_7']]
        
        for stop_id in stops:
            if pd.notna(stop_id):
                total_estimated_minutes += dwell_map.get(int(stop_id), global_avg)

        total_estimated_minutes += max(0, sum(pd.notna(stop_id) for stop_id in stops) - 1) * TRANSFER_MINUTES
        delivery = add_business_minutes(pd.Timestamp.now(tz=MANILA).to_pydatetime(), total_estimated_minutes)
                
        predictions.append({
            "process_id": int(proc['p_id']),
            "estimated_hours_to_complete": float(round(total_estimated_minutes / 60, 2)),
            "estimated_delivery_date": delivery.date().isoformat(),
        })
        
    return predictions
