import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from database import get_db_connection
from business_calendar import add_business_minutes, MANILA

TRANSFER_MINUTES = 30

def train_linear_edc_model():
    """
    Pulls historical tracked documents and trains a Ridge Regularized 
    Log-Linear Regression model with engineered routing features.
    """
    dwell_query = """
        SELECT current_office_id,
               AVG(COALESCE(duration_minutes, EXTRACT(EPOCH FROM (time_out - time_in))/60.0)) AS avg_minutes,
               COALESCE(STDDEV(COALESCE(duration_minutes, EXTRACT(EPOCH FROM (time_out - time_in))/60.0)), 30.0) AS std_minutes
        FROM public.processed_document
        WHERE time_in IS NOT NULL AND time_out IS NOT NULL
        GROUP BY current_office_id;
    """
    doc_history_query = """
        SELECT 
            id.ini_id,
            id.created_at,
            id.route_snapshot,
            EXTRACT(EPOCH FROM (MAX(pd.time_out) - MIN(pd.time_in))) / 60.0 AS actual_total_minutes,
            COUNT(pd.pd_id) AS total_hops,
            BOOL_OR(pd.is_adhoc) AS had_detour
        FROM public.initial_document id
        JOIN public.processed_document pd ON id.ini_id = pd.ini_id
        WHERE pd.time_in IS NOT NULL AND pd.time_out IS NOT NULL AND id.route_snapshot IS NOT NULL
        GROUP BY id.ini_id, id.created_at, id.route_snapshot
        HAVING COUNT(pd.pd_id) >= 2;
    """
    with get_db_connection() as conn:
        dwell_df = pd.read_sql_query(dwell_query, conn)
        docs_df = pd.read_sql_query(doc_history_query, conn)

    dwell_mean_map = dict(zip(dwell_df['current_office_id'].astype(int), dwell_df['avg_minutes'].astype(float)))
    dwell_std_map = dict(zip(dwell_df['current_office_id'].astype(int), dwell_df['std_minutes'].astype(float)))
    
    global_mean = float(dwell_df['avg_minutes'].mean()) if not dwell_df.empty else 240.0
    global_std = float(dwell_df['std_minutes'].mean()) if not dwell_df.empty else 60.0

    if len(docs_df) < 20:
        return None, dwell_mean_map, global_mean

    # Filter extreme right-tail outlier anomalies (> 99th percentile)
    upper_threshold = docs_df['actual_total_minutes'].quantile(0.99)
    docs_df = docs_df[docs_df['actual_total_minutes'] <= upper_threshold].copy()

    X, y = [], []
    for _, row in docs_df.iterrows():
        route = [int(s) for s in row['route_snapshot'] if s is not None]
        base_dwell_sum = sum(dwell_mean_map.get(s, global_mean) for s in route)
        dwell_volatility = sum(dwell_std_map.get(s, global_std) for s in route)
        hops = float(row['total_hops'])
        detour = 1.0 if row['had_detour'] else 0.0
        
        # Day of week feature (Thu/Fri submission captures weekend lag)
        created_dt = pd.to_datetime(row['created_at'])
        weekend_risk = 1.0 if created_dt.weekday() in [3, 4] else 0.0

        X.append([base_dwell_sum, dwell_volatility, hops, detour, weekend_risk])
        y.append(np.log1p(row['actual_total_minutes']))

    model = Ridge(alpha=1.0)
    model.fit(X, y)
    return model, dwell_mean_map, global_mean


def calculate_edc(route_ids=None):
    model, dwell_map, global_avg = train_linear_edc_model()
    now_manila = pd.Timestamp.now(tz=MANILA)
    weekend_risk = 1.0 if now_manila.weekday() in [3, 4] else 0.0

    if route_ids:
        valid_route = [int(stop) for stop in route_ids if stop is not None]
        base_sum = sum(dwell_map.get(stop, global_avg) for stop in valid_route)
        hops = float(len(valid_route))
        
        if model is not None:
            features = np.array([[base_sum, hops * 30.0, hops, 0.0, weekend_risk]])
            pred_minutes = float(np.expm1(model.predict(features)[0]))
            pred_minutes = max(base_sum, pred_minutes)
        else:
            pred_minutes = base_sum + max(0, len(valid_route) - 1) * TRANSFER_MINUTES

        delivery = add_business_minutes(now_manila.to_pydatetime(), pred_minutes)
        return [{
            "process_id": None,
            "estimated_hours_to_complete": float(round(pred_minutes / 60.0, 2)),
            "estimated_delivery_date": delivery.date().isoformat(),
        }]

    query_processes = """
        SELECT p.p_id, r.stop_1, r.stop_2, r.stop_3, r.stop_4, r.stop_5, r.stop_6, r.stop_7
        FROM public.process_type p
        JOIN public.route r ON p.r_id = r.r_id
        WHERE p.is_active IS TRUE
    """
    with get_db_connection() as conn:
        processes = pd.read_sql_query(query_processes, conn)

    predictions = []
    for _, proc in processes.iterrows():
        raw_stops = [proc[f'stop_{i}'] for i in range(1, 8)]
        valid_stops = [int(s) for s in raw_stops if pd.notna(s)]
        base_sum = sum(dwell_map.get(s, global_avg) for s in valid_stops)
        hops = float(len(valid_stops))

        if model is not None:
            features = np.array([[base_sum, hops * 30.0, hops, 0.0, weekend_risk]])
            pred_minutes = float(np.expm1(model.predict(features)[0]))
            pred_minutes = max(base_sum, pred_minutes)
        else:
            pred_minutes = base_sum + max(0, len(valid_stops) - 1) * TRANSFER_MINUTES

        delivery = add_business_minutes(now_manila.to_pydatetime(), pred_minutes)
        predictions.append({
            "process_id": int(proc['p_id']),
            "estimated_hours_to_complete": float(round(pred_minutes / 60.0, 2)),
            "estimated_delivery_date": delivery.date().isoformat(),
        })

    return predictions