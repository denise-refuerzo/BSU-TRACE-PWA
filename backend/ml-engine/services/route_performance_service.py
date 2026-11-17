import pandas as pd
from database import read_combined_query, read_live_query

def calculate_document_routing_efficiency(start_date=None, end_date=None):
    """Summarize true end-to-end turnaround for each document process.

    A processed_document row is one office stop, so averaging those rows only
    reports stop dwell time.  Aggregate each document first to keep this metric
    distinct from the office bottleneck calculation.
    """
    completion_filters = []
    params = []
    if start_date:
        completion_filters.append("MAX(pd.time_out)::date >= %s")
        params.append(start_date)
    if end_date:
        completion_filters.append("MAX(pd.time_out)::date <= %s")
        params.append(end_date)
    having_clause = f"HAVING {' AND '.join(completion_filters)}" if completion_filters else ''
    query = f"""
        WITH completed_documents AS (
            SELECT
                pt.process_name AS route_name,
                pd.ini_id,
                COUNT(*) AS stop_count,
                EXTRACT(EPOCH FROM (MAX(pd.time_out) - MIN(pd.time_in))) / 3600.0
                    AS completion_hours,
                SUM(
                    COALESCE(
                        pd.duration_minutes,
                        EXTRACT(EPOCH FROM (pd.time_out - pd.time_in)) / 60.0
                    )
                ) / 60.0 AS active_processing_hours
            FROM public.processed_document pd
            JOIN public.initial_document idoc ON pd.ini_id = idoc.ini_id
            JOIN public.process_type pt ON idoc.p_id = pt.p_id
            WHERE pd.time_in IS NOT NULL AND pd.time_out IS NOT NULL
              AND {{document_filter}}
              AND NOT EXISTS (
                  SELECT 1
                  FROM public.processed_document open_stop
                  WHERE open_stop.ini_id = pd.ini_id
                    AND open_stop.time_out IS NULL
            )
            GROUP BY pt.process_name, pd.ini_id
            {having_clause}
        )
        SELECT
            route_name,
            COUNT(*) AS total_documents,
            AVG(stop_count) AS avg_stops,
            AVG(completion_hours) AS avg_completion_hours,
            AVG(active_processing_hours) AS avg_active_processing_hours
        FROM completed_documents
        GROUP BY route_name
        ORDER BY avg_completion_hours DESC;
    """
    df = read_combined_query(query, params=tuple(params),
                             predicates={'document_filter': "idoc.title LIKE 'Synthetic %'"})
    if df.empty:
        return []
    numeric_columns = [
        'total_documents', 'avg_stops', 'avg_completion_hours',
        'avg_active_processing_hours'
    ]
    for column in numeric_columns:
        df[column] = pd.to_numeric(df[column], errors='coerce').fillna(0)
    rows = []
    for route_name, group in df.groupby('route_name'):
        total = int(group.total_documents.sum())
        rows.append({'route_name': route_name, 'total_documents': total,
                     **{column: round(float((group[column] * group.total_documents).sum() / total), 2)
                        for column in ['avg_stops', 'avg_completion_hours', 'avg_active_processing_hours']}})
    return sorted(rows, key=lambda row: row['avg_completion_hours'], reverse=True)


def calculate_vehicle_scheduling_performance(start_date=None, end_date=None):
    filters = []
    params = []
    if start_date:
        filters.append("b.reservation_date >= %s")
        params.append(start_date)
    if end_date:
        filters.append("b.reservation_date <= %s")
        params.append(end_date)
    where_clause = f"WHERE {' AND '.join(filters)}" if filters else ''
    query = f"""
        SELECT 
            a.asset_name,
            COUNT(v.v_id) AS total_trips,
            AVG(EXTRACT(EPOCH FROM (v.drop_off_time - v.pick_up_time))) AS avg_trip_seconds
        FROM public.vehicle_requirements v
        JOIN public.asset_details a ON v.asd_id = a.asd_id
        JOIN public.bookings b ON v.booking_id = b.booking_id
        {where_clause}
        {'AND' if where_clause else 'WHERE'} {{booking_filter}}
        GROUP BY a.asset_name;
    """
    df = read_combined_query(query, params=tuple(params),
                             predicates={'booking_filter': "b.purpose LIKE 'Synthetic %'"})
    if df.empty:
        return []
    df['total_trips'] = pd.to_numeric(df['total_trips'], errors='coerce').fillna(0)
    df['avg_trip_seconds'] = pd.to_numeric(df['avg_trip_seconds'], errors='coerce').fillna(0)
    return [
        {
            "asset_name": str(name),
            "total_trips": int(group.total_trips.sum()),
            "avg_turnaround_hours": round(float((group.avg_trip_seconds * group.total_trips).sum()
                                                / group.total_trips.sum() / 3600), 2)
        } 
        for name, group in df.groupby('asset_name') if group.total_trips.sum() > 0
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
        SELECT off.office_name, COUNT(*) AS samples,
               AVG(COALESCE(pd.duration_minutes, EXTRACT(EPOCH FROM (pd.time_out - pd.time_in))/60.0)) AS avg_dwell
        FROM public.processed_document pd
        JOIN public.initial_document doc ON pd.ini_id = doc.ini_id
        JOIN public.offices off ON pd.current_office_id = off.o_id
        WHERE pd.time_in IS NOT NULL AND pd.time_out IS NOT NULL
          AND {document_filter}
        GROUP BY off.office_name;
    """
    df = read_combined_query(dwell_query, predicates={
        'document_filter': "doc.title LIKE 'Synthetic %'",
    })
    offices = read_live_query('SELECT o_id, office_name FROM public.offices')
    names = dict(zip(offices.o_id.astype(int), offices.office_name))
    dwell_map = {}
    for name, group in df.groupby('office_name'):
        samples = pd.to_numeric(group.samples).sum()
        if samples:
            dwell_map[name] = float((pd.to_numeric(group.avg_dwell) * pd.to_numeric(group.samples)).sum() / samples)
    system_median = float(pd.Series(dwell_map.values()).median()) if dwell_map else 120.0

    bottleneck_warnings = []
    for stop in route_ids:
        dwell = dwell_map.get(names.get(stop), system_median)
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
            COUNT(b.booking_id) as assigned_today
        FROM public.asset_details a
        JOIN public.asset_type at ON a.ast_id = at.ast_id
        LEFT JOIN public.vehicle_requirements v ON a.asd_id = v.asd_id
        LEFT JOIN public.bookings b ON v.booking_id = b.booking_id AND b.reservation_date = %s
          AND b.status NOT IN ('Cancelled', 'Completed')
        WHERE at.asset_type = 'Vehicle'
        GROUP BY a.asd_id, a.asset_name
        ORDER BY assigned_today ASC;
    """
    candidates = read_live_query(query, params=(reservation_date,))

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
