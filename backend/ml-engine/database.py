import psycopg2
from contextlib import contextmanager
from config import settings

@contextmanager
def get_db_connection():
    """Context manager to ensure database connections are cleaned up safely."""
    conn = psycopg2.connect(settings.ML_DATABASE_URL, connect_timeout=20)
    try:
        conn.set_session(readonly=True)
        yield conn
    finally:
        conn.close()
