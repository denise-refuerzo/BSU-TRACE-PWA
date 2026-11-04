"""Shared working-time calendar. Naive DB timestamps represent Manila wall time."""
from datetime import date, datetime, time, timedelta, timezone
from functools import lru_cache
import json
from pathlib import Path

MANILA = timezone(timedelta(hours=8))
WORK_START, WORK_END = time(8), time(17)
CALENDAR = json.loads(Path(__file__).with_name('office_calendar.json').read_text())
HOLIDAYS = {date.fromisoformat(d) for d in CALENDAR['holidays']}
CALENDAR_NOTE = CALENDAR['note']


def local(value):
    return value.replace(tzinfo=MANILA) if value.tzinfo is None else value.astimezone(MANILA)


@lru_cache(maxsize=4096)
def work_intervals(day):
    if day.weekday() >= 5 or day in HOLIDAYS:
        return ()
    intervals = [(datetime.combine(day, time(a), MANILA), datetime.combine(day, time(b), MANILA))
                 for a, b in ((8, 12), (13, 17))]
    for closure in CALENDAR['suspensions']:
        if closure['date'] != day.isoformat():
            continue
        start = datetime.combine(day, time.fromisoformat(closure['start']), MANILA)
        end = datetime.combine(day, time.fromisoformat(closure['end']), MANILA)
        remaining = []
        for a, b in intervals:
            if end <= a or start >= b:
                remaining.append((a, b))
            else:
                if a < start:
                    remaining.append((a, start))
                if end < b:
                    remaining.append((end, b))
        intervals = remaining
    return tuple(intervals)


def is_workday(day):
    return bool(work_intervals(day))


def next_workday(day):
    day += timedelta(days=1)
    while not is_workday(day):
        day += timedelta(days=1)
    return day


def normalize_start(value):
    value = local(value)
    while True:
        for start, end in work_intervals(value.date()):
            if value < end:
                return max(value, start)
        value = datetime.combine(value.date() + timedelta(days=1), WORK_START, MANILA)


def business_minutes_between(start, end):
    start, end = local(start), local(end)
    if end < start:
        raise ValueError('End precedes start')
    day, minutes = start.date(), 0.0
    while day <= end.date():
        for a, b in work_intervals(day):
            minutes += max(0.0, (min(end, b) - max(start, a)).total_seconds() / 60)
        day += timedelta(days=1)
    return minutes


def add_business_minutes(value, minutes):
    if minutes < 0:
        raise ValueError('Working duration must not be negative')
    current, remaining = normalize_start(value), float(minutes)
    while remaining > 0:
        end = next(b for a, b in work_intervals(current.date()) if a <= current < b)
        available = (end - current).total_seconds() / 60
        if remaining <= available:
            return current + timedelta(minutes=remaining)
        remaining -= available
        current = normalize_start(end)
    return current


def calendar_covers(start, end):
    return (CALENDAR['coverage_start'] <= start.date().isoformat()
            and end.date().isoformat() <= CALENDAR['coverage_end'])
