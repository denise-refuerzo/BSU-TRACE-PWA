from database import analytics_sources, get_db_connection, read_combined_query

def get_database_status():
    """
    Pings the PostgreSQL database to ensure active connections are healthy.
    """
    try:
        for source, _, _ in analytics_sources():
            with get_db_connection(source) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
        return "HEALTHY"
    except Exception:
        return "DISCONNECTED"

def run_data_quality_audit():
    """
    Executes automated checks to verify null value constraints 
    and identify missing timestamps within processed documents.
    """
    query = """
        SELECT 
            COUNT(*) AS total_documents,
            COUNT(CASE WHEN time_in IS NULL THEN 1 END) AS missing_time_in_records,
            COUNT(CASE WHEN time_out IS NULL THEN 1 END) AS missing_time_out_records,
            COUNT(CASE WHEN time_in IS NULL OR time_out IS NULL THEN 1 END) AS invalid_records
        FROM public.processed_document pd
        JOIN public.initial_document doc ON pd.ini_id = doc.ini_id
        WHERE {document_filter};
    """
    
    df = read_combined_query(query, predicates={
        'document_filter': "doc.title LIKE 'Synthetic %'",
    })
        
    if df.empty:
        return {
            "status": "PASS", 
            "integrity_score_percentage": 100.0, 
            "audit_details": {}
        }
        
    total_documents = int(df['total_documents'].sum())
    missing_time_in = int(df['missing_time_in_records'].sum())
    missing_time_out = int(df['missing_time_out_records'].sum())
    invalid_docs = int(df['invalid_records'].sum())
    
    if total_documents == 0:
        integrity_score = 100.0
    else:
        integrity_score = ((total_documents - invalid_docs) / total_documents) * 100.0
        
    return {
        "status": "PASS" if integrity_score >= 95.0 else "WARNING",
        "integrity_score_percentage": round(integrity_score, 2),
        "audit_details": {
            "missing_time_in_records": missing_time_in,
            "missing_time_out_records": missing_time_out,
            "total_records_scanned": total_documents
        }
    }

def get_system_health_metrics():
    """
    Aggregates database connectivity and data quality audit results.
    """
    return {
        "database_connection": get_database_status(),
        "data_quality_audit": run_data_quality_audit()
    }
