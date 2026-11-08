"""Read only public.bookings COPY data from a plain pg_dump; never execute SQL."""
import re
import pandas as pd


def load_booking_snapshot(path):
    records = []
    columns = None
    with open(path, encoding='utf-8-sig') as source:
        for line in source:
            if columns is None:
                match = re.fullmatch(r'COPY public\.bookings \((.+)\) FROM stdin;\s*', line)
                if match:
                    columns = [c.strip() for c in match.group(1).split(',')]
                continue
            if line.rstrip('\r\n') == r'\.':
                break
            values = line.rstrip('\r\n').split('\t')
            if len(values) != len(columns):
                raise ValueError('Malformed bookings COPY row')
            row = dict(zip(columns, values))
            if row['reservation_date'] == r'\N':
                continue
            records.append({
                'reservation_date': row['reservation_date'],
                'booking_type': row['booking_type'],
                'created_date': None if row['created_at'] == r'\N' else row['created_at'][:10],
                'synthetic': row['purpose'].startswith('Synthetic '),
                'daily_demand': 1,
            })
    if columns is None or not records:
        raise ValueError('No public.bookings COPY records found in snapshot')
    df = pd.DataFrame(records)
    df['reservation_date'] = pd.to_datetime(df.reservation_date)
    df['created_date'] = pd.to_datetime(df.created_date)
    return df.groupby(['reservation_date','booking_type','created_date'],dropna=False).agg(
        daily_demand=('daily_demand','sum'),synthetic=('synthetic','all')).reset_index()
