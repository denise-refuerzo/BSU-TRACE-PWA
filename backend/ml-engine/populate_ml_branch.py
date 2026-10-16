"""Populate an empty, isolated ML branch with reproducible synthetic history.

Run from the repository root. This script refuses to use DATABASE_URL, a pooled
target, or a target that already has transaction rows. All writes are atomic.
The generated data is for analytics testing, not evidence of real operations.
"""

from __future__ import annotations

import argparse
import os
import random
from collections import Counter
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse

import psycopg2
from dotenv import load_dotenv
from psycopg2.extras import Json, execute_values


MANILA = timezone(timedelta(hours=8))
TODAY = datetime.now(MANILA).date()
START = date(TODAY.year - 3, TODAY.month, TODAY.day)
END = TODAY - timedelta(days=7)
RNG = random.Random(20261016)

# Official nationwide regular and special non-working days that fall in the
# selected window. Working observances, such as EDSA Day, are excluded.
# Sources: PCO Proclamations 90/359/425 (2023), 368/453/514/579/665 (2024),
# 727/839/911 (2025), and 1006/1189/1264 (2026).
HOLIDAY_STRINGS = """
2023-10-30 2023-11-01 2023-11-02 2023-12-08 2023-12-25 2023-12-26 2023-12-30
2024-01-01 2024-02-09 2024-02-10 2024-03-28 2024-03-29 2024-03-30
2024-04-09 2024-04-10 2024-05-01 2024-06-12 2024-06-17 2024-08-23
2024-08-26 2024-11-01 2024-11-02 2024-11-30 2024-12-08 2024-12-24
2024-12-25 2024-12-30 2024-12-31
2025-01-01 2025-01-29 2025-04-01 2025-04-09 2025-04-17 2025-04-18
2025-04-19 2025-05-01 2025-06-06 2025-06-12 2025-08-21 2025-08-25
2025-10-31 2025-11-01 2025-11-30 2025-12-08 2025-12-24 2025-12-25
2025-12-30 2025-12-31
2026-01-01 2026-02-17 2026-03-20 2026-04-02 2026-04-03 2026-04-04
2026-04-09 2026-05-01 2026-05-27 2026-06-12 2026-08-21 2026-08-31
2026-11-01 2026-11-02 2026-11-30 2026-12-08 2026-12-24 2026-12-25
2026-12-30 2026-12-31
"""
HOLIDAYS = {date.fromisoformat(value) for value in HOLIDAY_STRINGS.split()}
# Verified Batangas government work suspensions and a BatStateU notice:
# PCO MC 88/89/90 (Jul 21-23 2025), BatStateU BAC notice (Jul 25),
# PCO MC 94-A (Aug 26), and PCO MC 97 (Sep 22). Jul 21 began at 13:00;
# treating the full day as closed is conservative for synthetic office work.
EXTRA_CLOSURES = {date.fromisoformat(value) for value in (
    "2025-07-21", "2025-07-22", "2025-07-23", "2025-07-25",
    "2025-08-26", "2025-09-22",
)}

DOCS_PER_PROCESS = 7000
REQUESTS_PER_ASSET = 1000
TRANSACTION_TABLES = (
    "booking_checklists", "booking_status_updates", "bookings",
    "chat_messages", "chat_rooms", "document_activity_history",
    "document_collaborators", "document_user_archives", "equipment_ledgers",
    "gm_requirements", "initial_document", "office_action_history",
    "processed_document", "vehicle_requirements", "asset_blackouts",
)


def workday(day: date) -> bool:
    return day.weekday() < 5 and day not in HOLIDAYS and day not in EXTRA_CLOSURES


def next_workday(day: date) -> date:
    candidate = day + timedelta(days=1)
    while not workday(candidate):
        candidate += timedelta(days=1)
    return candidate


def previous_workday(day: date) -> date:
    candidate = day - timedelta(days=1)
    while not workday(candidate):
        candidate -= timedelta(days=1)
    return candidate


def add_work_minutes(value: datetime, minutes: int) -> datetime:
    assert value.tzinfo == MANILA
    if not workday(value.date()) or value.time() >= time(17):
        value = datetime.combine(next_workday(value.date()), time(8), MANILA)
    if value.time() < time(8):
        value = datetime.combine(value.date(), time(8), MANILA)
    remaining = minutes
    while remaining:
        close = datetime.combine(value.date(), time(17), MANILA)
        available = int((close - value).total_seconds() / 60)
        if remaining <= available:
            return value + timedelta(minutes=remaining)
        remaining -= available
        value = datetime.combine(next_workday(value.date()), time(8), MANILA)
    return value


WORKDAYS = [START + timedelta(days=i) for i in range((END - START).days + 1)
            if workday(START + timedelta(days=i))]


def sample_day() -> date:
    # Month and recency affect demand, without making any date deterministic.
    while True:
        day = RNG.choice(WORKDAYS)
        month_weight = {1: 1.1, 5: 1.15, 6: 1.3, 8: 1.4, 9: 1.25,
                        12: 1.3}.get(day.month, 1.0)
        recency_weight = 1.25 if day.year == TODAY.year else 1.0
        if RNG.random() < month_weight * recency_weight / 1.8:
            return day


def timestamp(day: date) -> datetime:
    minute = RNG.randint(0, 8 * 60 + 15)
    return datetime.combine(day, time(8), MANILA) + timedelta(minutes=minute)


def wall(value: datetime) -> datetime:
    return value.replace(tzinfo=None)


def entry_time(value: datetime) -> datetime:
    # 17:00 is a valid departure time, but a new office visit starts tomorrow.
    if value.time() >= time(17):
        return datetime.combine(next_workday(value.date()), time(8), MANILA)
    return value


def office_minutes(name: str, day: date, process_id: int) -> int:
    lower = name.lower()
    base = 135 if any(token in lower for token in ("chancellor", "budget", "accounting")) else 85
    if any(token in lower for token in ("research", "quality", "records")):
        base += 35
    if process_id in (1, 2):
        base *= 1.2
    if day.month in (6, 8, 9, 12):
        base *= 1.18
    noise = RNG.lognormvariate(0, 0.5)
    if RNG.random() < 0.065:
        noise *= RNG.uniform(1.7, 3.0)  # occasional queue or revision delay
    return max(12, min(650, int(base * noise)))


def rows(cur, query: str):
    cur.execute(query)
    return cur.fetchall()


def references(cur):
    users = [row[0] for row in rows(cur, 'SELECT u_id FROM public."User" WHERE is_active ORDER BY u_id')]
    offices = dict(rows(cur, "SELECT o_id, office_name FROM public.offices"))
    groups = {}
    for group, office in rows(cur, "SELECT m.group_id,m.office_id FROM public.office_route_group_members m JOIN public.office_route_groups g USING (group_id) WHERE g.is_active"):
        groups.setdefault(group, []).append(office)
    processes = rows(cur, """SELECT p.p_id,p.process_name,
        r.stop_1,r.stop_2,r.stop_3,r.stop_4,r.stop_5,r.stop_6,r.stop_7,
        r.stop_1_group_id,r.stop_2_group_id,r.stop_3_group_id,r.stop_4_group_id,
        r.stop_5_group_id,r.stop_6_group_id,r.stop_7_group_id
        FROM public.process_type p JOIN public.route r ON r.r_id=p.r_id
        WHERE p.is_active ORDER BY p.p_id""")
    assets = rows(cur, "SELECT a.asd_id,t.asset_type,a.asset_name,a.quantity FROM public.asset_details a JOIN public.asset_type t USING (ast_id) WHERE a.is_active ORDER BY a.asd_id")
    status = dict(rows(cur, "SELECT s_id,current_status FROM public.status"))
    if not users or not processes or not assets or status.get(5) != "Completed":
        raise RuntimeError("Required users, processes, assets, or status reference rows are missing")
    return users, offices, groups, processes, assets


def resolve_route(process, groups):
    result = []
    for office_id, group_id in zip(process[2:9], process[9:16]):
        if group_id:
            result.append(RNG.choice(groups[group_id]))
        elif office_id:
            result.append(office_id)
    if len(result) < 2:
        raise RuntimeError(f"Process {process[0]} has fewer than two offices")
    return result


def insert(cur, table: str, columns: str, values: list[tuple]):
    if values:
        execute_values(cur, f"INSERT INTO public.{table} ({columns}) VALUES %s", values, page_size=500)


def generate_documents(cur, users, offices, groups, processes, per_process=DOCS_PER_PROCESS, coverage_floor=1000):
    next_doc = next_step = next_action = 1
    coverage = Counter()
    for process in processes:
        # Five historical non-pending statuses each appear at least 1,000
        # times per process. The remaining cases are weighted unevenly.
        intermediate = [status for status in (2, 3, 4, 6, 7) for _ in range(coverage_floor)]
        intermediate += RNG.choices((2, 3, 4, 6, 7), weights=(12, 58, 5, 12, 13), k=per_process - len(intermediate))
        RNG.shuffle(intermediate)
        for offset in range(0, per_process, 250):
            documents, steps, actions = [], [], []
            for status in intermediate[offset:offset + 250]:
                document_id = next_doc
                next_doc += 1
                route = resolve_route(process, groups)
                created = timestamp(sample_day())
                user = RNG.choice(users)
                first_in = entry_time(add_work_minutes(created, RNG.randint(5, 75)))
                cursor_time = first_in
                for index, office in enumerate(route):
                    arrival = cursor_time if index == 0 else entry_time(add_work_minutes(cursor_time, RNG.randint(10, 105)))
                    dwell = office_minutes(offices[office], arrival.date(), process[0])
                    departure = add_work_minutes(arrival, dwell)
                    last = index == len(route) - 1
                    step_status = 5 if last else status
                    next_office = None if last else route[index + 1]
                    steps.append((next_step, document_id, step_status, office, next_office,
                                  wall(arrival), wall(departure), dwell, False, None, False))
                    actions.append((next_action, document_id, user, office, "Scanned In", arrival, False))
                    next_action += 1
                    if step_status == 4:
                        actions.append((next_action, document_id, user, office,
                                        "Sent Back for Revision", add_work_minutes(arrival, max(1, dwell // 2)), False))
                        next_action += 1
                    actions.append((next_action, document_id, user, office, "Approved & Signed", departure, False))
                    next_action += 1
                    actions.append((next_action, document_id, user, office, "Scanned Out", departure, False))
                    next_action += 1
                    next_step += 1
                    cursor_time = departure
                    coverage[(process[0], step_status)] += 1
                documents.append((document_id, process[0], user,
                                  f"Synthetic {process[1]} {document_id:06d}",
                                  cursor_time.date(), f"TRK-SYNTH-{document_id:08d}",
                                  wall(created), route[0], route))
            insert(cur, "initial_document", "ini_id,p_id,u_id,title,edc,qr_code,created_at,submission_office_id,route_snapshot", documents)
            insert(cur, "processed_document", "pd_id,ini_id,s_id,current_office_id,next_office_id,time_in,time_out,duration_minutes,is_adhoc,adhoc_return_office_id,is_returned_from_adhoc", steps)
            insert(cur, "office_action_history", "history_id,ini_id,u_id,o_id,action_type,action_timestamp,legacy_manila_wall_time", actions)
        print(f"Prepared process {process[0]}: {per_process} completed documents", flush=True)
    return next_doc - 1, coverage


def generate_requests(cur, users, assets, per_asset=REQUESTS_PER_ASSET):
    booking_id = gm_id = vehicle_id = ledger_id = update_id = 1
    for asset_id, kind, name, quantity in assets:
        bookings, gm, vehicles, ledgers, updates = [], [], [], [], []
        for index in range(per_asset):
            day = sample_day()
            request_time = timestamp(day)
            user = RNG.choice(users)
            department = RNG.choice(("CICS", "CTE", "CAS", "CABE", "Administration"))
            if kind == "Furniture":
                borrowed = request_time
                expected = add_work_minutes(borrowed, RNG.randint(80, 850))
                outstanding = day >= END - timedelta(days=60) and RNG.random() < 0.12
                returned = None if outstanding else add_work_minutes(expected, RNG.randint(0, 160))
                ledgers.append((ledger_id, asset_id, "Synthetic Requestor", department,
                                f"Synthetic {name} use", RNG.randint(1, min(quantity, 18)),
                                wall(borrowed), wall(expected), wall(returned) if returned else None,
                                "Borrowed" if outstanding else "Returned", user,
                                None if outstanding else RNG.choices(("Good", "Fair", "Needs Repair"), (92, 7, 1))[0], None))
                ledger_id += 1
                continue
            cancelled = RNG.random() < 0.085
            had_delay = RNG.random() < 0.10
            current = "Cancelled" if cancelled else "Completed"
            booking_type = "Vehicle" if kind == "Vehicle" else ("Gym" if kind == "Gymnasium" else "Room")
            request_day = day
            for _ in range(RNG.randint(2, 18)):
                request_day = previous_workday(request_day)
            if request_day < START:
                request_day = START if workday(START) else next_workday(START)
            created = timestamp(request_day)
            completed_at = add_work_minutes(request_time, RNG.randint(60, 210))
            bookings.append((booking_id, user, booking_type, department, day,
                             f"Synthetic {name} request", wall(created), current, wall(completed_at)))
            history = ["Reserved", "Approved"]
            if had_delay:
                history.append(RNG.choice(("Delayed", "Rescheduled", "Resource Reassigned")))
            history.append(current)
            previous = "Pending"
            for position, next_status in enumerate(history):
                updated = (completed_at
                           if next_status in ("Completed", "Cancelled") else
                           add_work_minutes(created, position * 12))
                updates.append((update_id, booking_id, previous, next_status,
                                "Synthetic scheduling variation" if position > 1 else None,
                                f"Synthetic {next_status.lower()} update", user, wall(updated)))
                update_id += 1
                previous = next_status
            if kind == "Vehicle":
                vehicles.append((vehicle_id, asset_id, 3, booking_id, RNG.choice(("Batangas City", "Lipa", "Nasugbu")),
                                 RNG.randint(2, 15), time(8), time(16), []))
                vehicle_id += 1
            else:
                gm.append((gm_id, asset_id, booking_id, time(8), time(RNG.choice((12, 15, 17))),
                           RNG.randint(15, 180), Json({"synthetic": True, "purpose": "facility event"})))
                gm_id += 1
            booking_id += 1
        insert(cur, "bookings", "booking_id,u_id,booking_type,department,reservation_date,purpose,created_at,status,updated_at", bookings)
        insert(cur, "gm_requirements", "gm_id,asd_id,booking_id,start_time,end_time,expected_attendees,request_details", gm)
        insert(cur, "vehicle_requirements", "v_id,asd_id,sv_id,booking_id,destination,passenger_count,pick_up_time,drop_off_time,official_passengers", vehicles)
        insert(cur, "equipment_ledgers", "log_id,asd_id,requestor_name,department,purpose,qty_borrowed,borrowed_at,expected_return,returned_at,status,processed_by,condition_on_return,damage_notes", ledgers)
        insert(cur, "booking_status_updates", "update_id,booking_id,previous_status,new_status,reason,notification_message,updated_by,created_at", updates)
        print(f"Prepared asset {asset_id} ({name}): {per_asset} requests", flush=True)
    return booking_id - 1, ledger_id - 1


def sync_sequences(cur):
    for table, column, sequence in (
        ("initial_document", "ini_id", "initial_document_ini_id_seq"),
        ("processed_document", "pd_id", "processed_document_pd_id_seq"),
        ("office_action_history", "history_id", "office_action_history_history_id_seq"),
        ("bookings", "booking_id", "bookings_booking_id_seq"),
        ("gm_requirements", "gm_id", "gm_requirements_gm_id_seq"),
        ("vehicle_requirements", "v_id", "vehicle_requirements_v_id_seq"),
        ("equipment_ledgers", "log_id", "equipment_ledgers_log_id_seq"),
        ("booking_status_updates", "update_id", "booking_status_updates_update_id_seq"),
    ):
        cur.execute(f"SELECT setval('public.{sequence}', (SELECT max({column}) FROM public.{table}), true)")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="Commit synthetic rows to the ML branch")
    parser.add_argument("--sample-rollback", action="store_true", help="Insert a tiny sample and roll it back after schema checks")
    parser.add_argument("--replace-synthetic", action="store_true", help="Atomically rebuild the current synthetic dataset")
    args = parser.parse_args()
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
    ml_url = os.environ.get("ML_DATABASE_URL")
    main_url = os.environ.get("DATABASE_URL")
    if not ml_url or not main_url:
        raise SystemExit("Both ML_DATABASE_URL and DATABASE_URL must be configured")
    ml_host, main_host = urlparse(ml_url).hostname, urlparse(main_url).hostname
    if not ml_host or ml_host == main_host or "-pooler" in ml_host:
        raise SystemExit("Refusing target: ML must use a separate direct-connection host")
    conn = psycopg2.connect(ml_url, connect_timeout=20)
    try:
        with conn.cursor() as cur:
            counts = {}
            for table in TRANSACTION_TABLES:
                cur.execute(f"SELECT count(*) FROM public.{table}")
                counts[table] = cur.fetchone()[0]
            if any(counts.values()):
                if not (args.write and args.replace_synthetic):
                    raise SystemExit(f"Refusing nonempty transaction tables: { {k:v for k,v in counts.items() if v} }")
                if (counts["initial_document"], counts["bookings"], counts["equipment_ledgers"]) != (49000, 4000, 2000):
                    raise SystemExit("Refusing replacement: transaction counts differ from this generator's prior run")
                for table, condition in (
                    ("initial_document", "title NOT LIKE 'Synthetic %'"),
                    ("bookings", "purpose NOT LIKE 'Synthetic %'"),
                    ("equipment_ledgers", "requestor_name <> 'Synthetic Requestor'"),
                ):
                    cur.execute(f"SELECT count(*) FROM public.{table} WHERE {condition}")
                    if cur.fetchone()[0]:
                        raise SystemExit(f"Refusing replacement: {table} contains non-synthetic rows")
                if any(counts[table] for table in ("chat_messages", "chat_rooms", "document_activity_history", "document_collaborators", "document_user_archives", "asset_blackouts")):
                    raise SystemExit("Refusing replacement: auxiliary transaction tables contain rows")
                cur.execute("TRUNCATE TABLE " + ", ".join(f"public.{table}" for table in TRANSACTION_TABLES) + " RESTART IDENTITY")
                print("Existing synthetic dataset cleared inside the uncommitted transaction", flush=True)
            refs = references(cur)
            print(f"Target host: {ml_host}; {'replacing synthetic rows' if args.replace_synthetic else 'empty transactions'}; {len(refs[3])} processes; {len(refs[4])} assets")
            print(f"Range: {START} through {END}; {len(WORKDAYS)} workdays; {DOCS_PER_PROCESS} documents/process; {REQUESTS_PER_ASSET} requests/asset")
            if not args.write and not args.sample_rollback:
                conn.rollback()
                print("Dry run only. Add --write to populate this branch.")
                return
            sample = args.sample_rollback
            doc_count, coverage = generate_documents(cur, *refs[:3], refs[3][:1] if sample else refs[3],
                                                     per_process=5 if sample else DOCS_PER_PROCESS,
                                                     coverage_floor=1 if sample else 1000)
            booking_count, equipment_count = generate_requests(cur, refs[0], refs[4],
                                                               per_asset=2 if sample else REQUESTS_PER_ASSET)
            if not sample and any(coverage[(process[0], status)] < 1000 for process in refs[3] for status in (2, 3, 4, 5, 6, 7)):
                raise RuntimeError("Per-process historical status coverage is below target")
            print("Validating rows and sequences...", flush=True)
            if not sample:
                sync_sequences(cur)
            cur.execute("SELECT count(*) FROM public.processed_document WHERE s_id=1 OR time_out IS NULL")
            if cur.fetchone()[0]:
                raise RuntimeError("Pending or incomplete document step found")
            cur.execute("SELECT count(*) FROM (SELECT DISTINCT ON (ini_id) ini_id,s_id FROM public.processed_document ORDER BY ini_id,pd_id DESC) latest WHERE s_id<>5")
            if cur.fetchone()[0]:
                raise RuntimeError("A document is not completed")
        if sample:
            conn.rollback()
            print("Sample inserts validated and rolled back.")
            return
        conn.commit()
        print(f"Committed {doc_count} completed documents, {booking_count} bookings, {equipment_count} equipment requests")
    except BaseException:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
