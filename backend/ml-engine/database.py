import psycopg2
import pandas as pd
from contextlib import contextmanager
from config import settings


def analytics_sources():
    """Use both databases when distinct; otherwise read the configured database once."""
    ml_url, live_url = settings.ML_DATABASE_URL, settings.DATABASE_URL
    if ml_url and live_url and ml_url != live_url:
        return [('ml', ml_url, True), ('live', live_url, False)]
    url = live_url or ml_url
    if not url:
        raise RuntimeError('Configure ML_DATABASE_URL or DATABASE_URL for analytics.')
    return [('live' if live_url else 'ml', url, None)]


@contextmanager
def get_db_connection(source='ml'):
    """Context manager to ensure database connections are cleaned up safely."""
    url = (settings.DATABASE_URL or settings.ML_DATABASE_URL) if source == 'live' else settings.ML_DATABASE_URL
    if not url:
        raise RuntimeError(f'{source} database URL is not configured.')
    conn = psycopg2.connect(url, connect_timeout=20)
    try:
        conn.set_session(readonly=True)
        yield conn
    finally:
        conn.close()


def read_combined_query(query, params=(), predicates=None):
    """Read comparable rows from both sources, excluding copied/non-synthetic ML rows.

    Each predicate describes a record's synthetic marker in its own database.
    Queries perform their joins inside each source before their results are merged.
    """
    predicates = predicates or {}
    frames = []
    for source, _, synthetic_only in analytics_sources():
        source_query = query
        for token, predicate in predicates.items():
            # psycopg uses %-style parameters; escape LIKE wildcards only when
            # this query also has bound parameters.
            if params:
                predicate = predicate.replace('%', '%%')
            condition = ('TRUE' if synthetic_only is None else
                         f'({predicate}) IS {"TRUE" if synthetic_only else "FALSE"}')
            source_query = source_query.replace('{' + token + '}', condition)
        with get_db_connection(source) as conn:
            frame = pd.read_sql_query(source_query, conn, params=params or None)
        frame['_source'] = source
        frames.append(frame)
    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()


def read_live_query(query, params=()):
    """Read current operational state and reference IDs from the live database."""
    with get_db_connection('live') as conn:
        return pd.read_sql_query(query, conn, params=params)
