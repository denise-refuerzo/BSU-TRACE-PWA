from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone


MANILA = timezone(timedelta(hours=8))
WORK_START = time(8, 0)
WORK_END = time(17, 0)
FIXED_HOLIDAYS = {(1, 1), (2, 24), (4, 9), (5, 1), (6, 12), (8, 21), (11, 1), (11, 30), (12, 25), (12, 30)}


def is_workday(day: date) -> bool:
    return day.weekday() < 5 and (day.month, day.day) not in FIXED_HOLIDAYS


def next_workday(day: date) -> date:
    candidate = day + timedelta(days=1)
    while not is_workday(candidate):
        candidate += timedelta(days=1)
    return candidate


def normalize_start(value: datetime) -> datetime:
    if value.tzinfo is None:
        value = value.replace(tzinfo=MANILA)
    else:
        value = value.astimezone(MANILA)
    if not is_workday(value.date()) or value.time() >= WORK_END:
        return datetime.combine(next_workday(value.date()), WORK_START, tzinfo=MANILA)
    if value.time() < WORK_START:
        return datetime.combine(value.date(), WORK_START, tzinfo=MANILA)
    return value


def add_business_minutes(value: datetime, minutes: float) -> datetime:
    current = normalize_start(value)
    remaining = max(0.0, float(minutes))
    while remaining > 0:
        end = datetime.combine(current.date(), WORK_END, tzinfo=MANILA)
        available = (end - current).total_seconds() / 60
        if remaining <= available:
            return current + timedelta(minutes=remaining)
        remaining -= available
        current = datetime.combine(next_workday(current.date()), WORK_START, tzinfo=MANILA)
    return current
