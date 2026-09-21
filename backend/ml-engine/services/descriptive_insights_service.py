import pandas as pd

from database import get_db_connection


def _records(frame, integer_columns=()):
    if frame.empty:
        return []
    for column in integer_columns:
        frame[column] = pd.to_numeric(frame[column], errors='coerce').fillna(0).astype(int)
    return frame.to_dict(orient='records')


def calculate_peak_document_traffic():
    """Monthly request traffic for administrative workload planning."""
    query = """
        SELECT
            TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
            COUNT(*) AS request_count
        FROM public.initial_document
        WHERE created_at IS NOT NULL
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at);
    """
    with get_db_connection() as conn:
        frame = pd.read_sql_query(query, conn)
    return _records(frame, ('request_count',))


def calculate_frequently_requested_documents():
    query = """
        SELECT
            pt.process_name AS name,
            COUNT(*) AS request_count
        FROM public.initial_document idoc
        JOIN public.process_type pt ON idoc.p_id = pt.p_id
        GROUP BY pt.process_name
        ORDER BY request_count DESC, pt.process_name
        LIMIT 8;
    """
    with get_db_connection() as conn:
        frame = pd.read_sql_query(query, conn)
    return _records(frame, ('request_count',))


def calculate_most_utilized_assets():
    query = """
        WITH asset_usage AS (
            SELECT asd_id, SUM(qty_borrowed)::bigint AS usage_count
            FROM public.equipment_ledgers
            GROUP BY asd_id

            UNION ALL

            SELECT asd_id, COUNT(*)::bigint AS usage_count
            FROM public.gm_requirements
            GROUP BY asd_id

            UNION ALL

            SELECT asd_id, COUNT(*)::bigint AS usage_count
            FROM public.vehicle_requirements
            GROUP BY asd_id
        )
        SELECT
            asset.asset_name AS name,
            SUM(usage.usage_count) AS usage_count
        FROM asset_usage usage
        JOIN public.asset_details asset ON usage.asd_id = asset.asd_id
        GROUP BY asset.asset_name
        ORDER BY usage_count DESC, asset.asset_name
        LIMIT 8;
    """
    with get_db_connection() as conn:
        frame = pd.read_sql_query(query, conn)
    return _records(frame, ('usage_count',))


def get_administrative_insights():
    return {
        'peak_traffic': calculate_peak_document_traffic(),
        'frequent_documents': calculate_frequently_requested_documents(),
        'utilized_assets': calculate_most_utilized_assets(),
    }
