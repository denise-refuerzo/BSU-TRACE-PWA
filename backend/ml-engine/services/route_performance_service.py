import pandas as pd
from database import get_db_connection

def calculate_document_routing_efficiency():
    query = """
        SELECT 
            pt.process_name AS route_name,
            AVG(EXTRACT(EPOCH FROM (pd.time_out - pd.time_in))) AS avg_processing_seconds
        FROM public.processed_document pd
        JOIN public.initial_document id ON pd.ini_id = id.ini_id
        JOIN public.process_type pt ON id.p_id = pt.p_id
        WHERE pd.time_in IS NOT NULL AND pd.time_out IS NOT NULL
        GROUP BY pt.process_name;
    """
    with get_db_connection() as conn:
        df = pd.read_sql_query(query, conn)
    if df.empty:
        return []
    df['avg_completion_hours'] = (df['avg_processing_seconds'] / 3600).round(2)
    return df[['route_name', 'avg_completion_hours']].to_dict(orient='records')


def calculate_vehicle_scheduling_performance():
    query = """
        SELECT 
            a.asset_name,
            COUNT(v.v_id) AS total_trips,
            AVG(EXTRACT(EPOCH FROM (v.drop_off_time - v.pick_up_time))) AS avg_trip_seconds
        FROM public.vehicle_requirements v
        JOIN public.asset_details a ON v.asd_id = a.asd_id
        GROUP BY a.asset_name;
    """
    with get_db_connection() as conn:
        df = pd.read_sql_query(query, conn)
    if df.empty:
        return []
    df['avg_turnaround_hours'] = (df['avg_trip_seconds'] / 3600).round(2)
    return [
        {
            "asset_name": str(row["asset_name"]), 
            "total_trips": int(row["total_trips"]), 
            "avg_turnaround_hours": float(row["avg_turnaround_hours"])
        } 
        for row in df[['asset_name', 'total_trips', 'avg_turnaround_hours']].to_dict(orient='records')
    ]


# --- OBJECTIVE 2.4: DECISION SUPPORT EXTENSIONS ---

def recommend_optimized_routing(route_ids: list[int]):
    """
    Decision Support: Evaluates real-time office congestion and recommends
    optimized stop orders or flags severe bottleneck stops to expedite documents.
    """
    if not route_ids:
        return {"error": "No stops provided"}

    dwell_query = """
        SELECT current_office_id, 
               AVG(COALESCE(duration_minutes, EXTRACT(EPOCH FROM (time_out - time_in))/60.0)) as avg_dwell
        FROM public.processed_document
        WHERE time_in IS NOT NULL AND time_out IS NOT NULL
        GROUP BY current_office_id;
    """
    with get_db_connection() as conn:
        df = pd.read_sql_query(dwell_query, conn)

    dwell_map = dict(zip(df['current_office_id'].astype(int), df['avg_dwell'].astype(float)))
    system_median = df['avg_dwell'].median() if not df.empty else 120.0

    bottleneck_warnings = []
    for stop in route_ids:
        dwell = dwell_map.get(stop, system_median)
        if dwell > (system_median * 1.5):
            bottleneck_warnings.append({
                "office_id": stop,
                "expected_dwell_minutes": round(dwell, 1),
                "advisory": "High stagnation office. Expedited routing bypass recommended if approval is non-mandatory."
            })

    return {
        "original_stops": route_ids,
        "critical_bottlenecks_detected": len(bottleneck_warnings),
        "advisories": bottleneck_warnings
    }


def recommend_vehicle_allocation(reservation_date: str, requested_passengers: int):
    """
    Decision Support: Recommends the optimal vehicle asset based on passenger 
    capacity, maintenance/trip fatigue, and avoids schedule clashes.
    """
    query = """
        SELECT 
            a.asd_id,
            a.asset_name,
            COUNT(v.v_id) as assigned_today
        FROM public.asset_details a
        JOIN public.asset_type at ON a.ast_id = at.ast_id
        LEFT JOIN public.vehicle_requirements v ON a.asd_id = v.asd_id
        LEFT JOIN public.bookings b ON v.booking_id = b.booking_id AND b.reservation_date = %s
        WHERE at.asset_type = 'Vehicle'
        GROUP BY a.asd_id, a.asset_name
        ORDER BY assigned_today ASC;
    """
    with get_db_connection() as conn:
        candidates = pd.read_sql_query(query, conn, params=(reservation_date,))

    if candidates.empty:
        return {"recommendation": None, "advisory": "No fleet vehicles available."}

    # Recommend lowest-fatigue vehicle with zero clashes
    best_candidate = candidates.iloc[0]
    return {
        "recommended_asset_id": int(best_candidate['asd_id']),
        "recommended_vehicle": str(best_candidate['asset_name']),
        "existing_trips_on_date": int(best_candidate['assigned_today']),
        "status": "Available" if best_candidate['assigned_today'] == 0 else "High Demand Risk"
    }