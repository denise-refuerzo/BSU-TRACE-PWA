import pandas as pd
from database import read_combined_query

def calculate_office_dwell_times(start_date=None, end_date=None):
    """
    Queries historical tracking data and runs an analytical evaluation process 
    to group and rank average office dwell times. 
    """
    filters = []
    params = []
    if start_date:
        filters.append("pdoc.time_out::date >= %s")
        params.append(start_date)
    if end_date:
        filters.append("pdoc.time_out::date <= %s")
        params.append(end_date)
    date_filter = ''.join(f" AND {condition}" for condition in filters)
    query = f"""
        SELECT 
            off.office_name,
            pdoc.time_in,
            pdoc.time_out,
            EXTRACT(EPOCH FROM (pdoc.time_out - pdoc.time_in))/3600 as dwell_time_hours
        FROM public.processed_document pdoc
        JOIN public.initial_document doc ON pdoc.ini_id = doc.ini_id
        JOIN public.offices off ON pdoc.current_office_id = off.o_id
        WHERE pdoc.time_in IS NOT NULL 
          AND pdoc.time_out IS NOT NULL
          AND {{document_filter}}
          {date_filter};
    """
    
    df = read_combined_query(query, params=tuple(params),
                             predicates={'document_filter': "doc.title LIKE 'Synthetic %'"})
        
    if df.empty:
        return []
        
    # Aggregate data: Calculate the mean dwell time per office hierarchy node
    heatmap_data = df.groupby('office_name')['dwell_time_hours'].mean().reset_index()
    
    # Sort to surface the highest stagnation offices at the top
    heatmap_data = heatmap_data.sort_values(by='dwell_time_hours', ascending=False)
    
    return heatmap_data.to_dict(orient='records')
