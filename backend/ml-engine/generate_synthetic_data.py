"""Generate reproducible synthetic analytics data for the ML child branch.

This script intentionally uses existing users, offices, process types, route
definitions, assets, and statuses from the database. It does not create or
modify reference data. Use --replace only when the target branch is the
disposable ML/testing branch.
"""

from __future__ import annotations

import argparse
import random
import uuid
from datetime import date, datetime, time, timedelta, timezone
from typing import Any

from psycopg2.extras import Json, execute_values

from business_calendar import add_business_minutes, is_workday, normalize_start, MANILA
from database import get_db_connection


FIXED_HOLIDAYS = {(1, 1), (2, 24), (4, 9), (5, 1), (6, 12), (8, 21), (11, 1), (11, 30), (12, 25), (12, 30)}
TRANSACTION_TABLES = (
    "booking_checklists",
    "chat_messages",
    "chat_rooms",
    "equipment_ledgers",
    "gm_requirements",
    "office_action_history",
    "processed_document",
    "vehicle_requirements",
    "initial_document",
    "bookings",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--end-date", type=date.fromisoformat, default=date.today())
    parser.add_argument("--documents", type=int, default=3000)
    parser.add_argument("--bookings", type=int, default=1800)
    parser.add_argument("--seed", type=int, default=20260915)
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Clear transaction tables before loading synthetic records.",
    )
    return parser.parse_args()


def working_timestamp(day: date, hour: int = 8) -> datetime:
    return datetime.combine(day, time(hour, 0))


def is_non_working_day(day: date) -> bool:
    return not is_workday(day)


def choose_workday(rng: random.Random, start: date, end: date) -> date:
    span = (end - start).days
    while True:
        candidate = start + timedelta(days=rng.randint(0, span))
        if not is_non_working_day(candidate):
            # Academic and administrative demand is intentionally uneven.
            month_weight = {1: 1.25, 2: 0.9, 3: 1.05, 4: 0.85, 5: 1.15, 6: 1.3,
                            7: 0.85, 8: 1.35, 9: 1.25, 10: 0.95, 11: 1.1, 12: 1.35}.get(candidate.month, 1.0)
            if rng.random() < min(0.98, month_weight / 1.5):
                return candidate


def is_peak_period(day: date) -> bool:
    return day.month in {1, 6, 8, 9, 12}


def duration_minutes(rng: random.Random, office_name: str, peak: bool = False, bottleneck: bool = False) -> int:
    name = office_name.lower()
    if "vice chancellor" in name or name in {"office of the chancellor", "accounting", "budget"}:
        base = 300
    elif any(word in name for word in ("research", "quality", "procurement", "records")):
        base = 180
    else:
        base = 100
    multiplier = (1.25 if peak else 1.0) * (rng.uniform(1.4, 2.5) if bottleneck else 1.0)
    value = int(rng.lognormvariate(0, 0.45) * base * multiplier)
    return max(10, min(value, 3600))


def load_reference_data(cur: Any) -> dict[str, Any]:
    cur.execute('SELECT u_id FROM public."User" WHERE is_active IS TRUE ORDER BY u_id')
    users = [row[0] for row in cur.fetchall()]
    if not users:
        raise RuntimeError("No active users are available for synthetic records.")

    cur.execute("SELECT o_id, office_name FROM public.offices ORDER BY o_id")
    offices = {row[0]: row[1] for row in cur.fetchall()}

    cur.execute(
        """
        SELECT p.p_id, p.process_name, p.r_id,
               r.stop_1, r.stop_2, r.stop_3, r.stop_4, r.stop_5, r.stop_6, r.stop_7,
               r.stop_1_group_id, r.stop_2_group_id, r.stop_3_group_id,
               r.stop_4_group_id, r.stop_5_group_id, r.stop_6_group_id, r.stop_7_group_id
        FROM public.process_type p
        JOIN public.route r ON r.r_id = p.r_id
        WHERE p.is_active IS TRUE
        ORDER BY p.p_id
        """
    )
    processes = cur.fetchall()
    if not processes:
        raise RuntimeError("No active process routes are available.")

    cur.execute(
        """
        SELECT m.group_id, m.office_id
        FROM public.office_route_group_members m
        JOIN public.office_route_groups g ON g.group_id = m.group_id
        WHERE g.is_active IS TRUE
        ORDER BY m.group_id, m.office_id
        """
    )
    group_members: dict[int, list[int]] = {}
    for group_id, office_id in cur.fetchall():
        group_members.setdefault(group_id, []).append(office_id)

    cur.execute("SELECT asd_id, asset_name FROM public.asset_details ORDER BY asd_id")
    assets = cur.fetchall()

    return {
        "users": users,
        "offices": offices,
        "processes": processes,
        "group_members": group_members,
        "assets": assets,
    }


def resolve_route(row: tuple[Any, ...], group_members: dict[int, list[int]], rng: random.Random) -> list[int]:
    stops = list(row[3:10])
    groups = list(row[10:17])
    resolved: list[int] = []
    for office_id, group_id in zip(stops, groups):
        if group_id:
            candidates = group_members.get(group_id, [])
            if not candidates:
                raise RuntimeError(f"Route references empty office group {group_id}.")
            resolved.append(rng.choice(candidates))
        elif office_id:
            resolved.append(office_id)
    if len(resolved) < 2:
        raise RuntimeError("Every synthetic process route must contain at least two stops.")
    return resolved


def clear_transactions(cur: Any) -> None:
    cur.execute(
        "TRUNCATE TABLE "
        + ", ".join(f"public.{table}" for table in TRANSACTION_TABLES)
        + " RESTART IDENTITY"
    )


def generate_documents(
    cur: Any,
    refs: dict[str, Any],
    rng: random.Random,
    start: date,
    end: date,
    count: int,
) -> tuple[int, int]:
    documents: list[tuple[Any, ...]] = []
    processed: list[tuple[Any, ...]] = []
    history: list[tuple[Any, ...]] = []
    completed_count = 0
    processed_id = 1
    history_id = 1

    for index in range(count):
        process = rng.choice(refs["processes"])
        created_day = choose_workday(rng, start, end)
        created = add_business_minutes(working_timestamp(created_day).replace(tzinfo=MANILA), rng.randint(0, 420))
        route = resolve_route(process, refs["group_members"], rng)
        user_id = rng.choice(refs["users"])
        document_id = index + 1
        qr_code = f"TRK-SYNTH-{uuid.UUID(int=rng.getrandbits(128))}"

        # Most records are complete; a minority remain active or require revision.
        complete = rng.random() < 0.88
        stop_count = len(route) if complete else rng.randint(1, len(route))
        current = created
        total_minutes = 0
        peak = is_peak_period(created_day)
        bottleneck_offices = {1, 10, 28, 32, 34, 39}

        for stop_index, office_id in enumerate(route[:stop_count]):
            office_name = refs["offices"].get(office_id, "Unknown office")
            arrival = normalize_start(add_business_minutes(current, rng.randint(10, 180)))
            bottleneck = office_id in bottleneck_offices and rng.random() < (0.18 if peak else 0.08)
            dwell = duration_minutes(rng, office_name, peak=peak, bottleneck=bottleneck)
            departure = add_business_minutes(arrival, dwell)
            is_last = stop_index == stop_count - 1
            has_departure = complete or not is_last
            status_id = 5 if has_departure and is_last and complete else (3 if has_departure else 1)
            next_office = route[stop_index + 1] if stop_index + 1 < len(route) else None
            processed.append(
                (
                    processed_id,
                    document_id,
                    status_id,
                    office_id,
                    next_office,
                    arrival.replace(tzinfo=None),
                    departure.replace(tzinfo=None) if has_departure else None,
                    dwell if has_departure else None,
                    False,
                    None,
                    False,
                )
            )
            history.append((history_id, document_id, user_id, office_id, "Scanned In", arrival))
            history_id += 1
            if has_departure:
                history.append((history_id, document_id, user_id, office_id, "Approved & Signed", departure - timedelta(minutes=2)))
                history_id += 1
                history.append((history_id, document_id, user_id, office_id, "Scanned Out", departure))
                history_id += 1
            current = departure
            total_minutes += dwell
            processed_id += 1

            # A small share of documents is returned for revision and re-enters
            # the same office later, creating realistic repeated-office work.
            if has_departure and rng.random() < 0.06:
                revision_in = normalize_start(add_business_minutes(departure, rng.uniform(240, 480)))
                revision_dwell = duration_minutes(rng, office_name, peak=peak, bottleneck=bottleneck)
                revision_out = add_business_minutes(revision_in, revision_dwell)
                processed.append((
                    processed_id, document_id, 3, office_id, next_office,
                    revision_in.replace(tzinfo=None), revision_out.replace(tzinfo=None),
                    revision_dwell, False, None, True,
                ))
                history.append((history_id, document_id, user_id, office_id, "Sent Back for Revision", departure + timedelta(minutes=2)))
                history_id += 1
                history.append((history_id, document_id, user_id, office_id, "Scanned In", revision_in))
                history_id += 1
                history.append((history_id, document_id, user_id, office_id, "Approved & Signed", revision_out - timedelta(minutes=2)))
                history_id += 1
                history.append((history_id, document_id, user_id, office_id, "Scanned Out", revision_out))
                history_id += 1
                current = revision_out
                total_minutes += revision_dwell
                processed_id += 1

            # Ad-hoc detours are outside the saved standard route but return to
            # the route's current office afterward.
            if has_departure and not is_last and rng.random() < 0.07:
                candidates = [candidate for candidate in refs["offices"] if candidate not in route]
                if candidates:
                    detour_office = rng.choice(candidates)
                    detour_in = normalize_start(add_business_minutes(current, rng.randint(15, 90)))
                    detour_dwell = duration_minutes(rng, refs["offices"][detour_office], peak=peak)
                    detour_out = add_business_minutes(detour_in, detour_dwell)
                    processed.append((
                        processed_id, document_id, 3, detour_office, office_id,
                        detour_in.replace(tzinfo=None), detour_out.replace(tzinfo=None),
                        detour_dwell, True, office_id, True,
                    ))
                    history.append((history_id, document_id, user_id, office_id, "Ad-Hoc Detour Routed", detour_in - timedelta(minutes=1)))
                    history_id += 1
                    history.append((history_id, document_id, user_id, detour_office, "Scanned In", detour_in))
                    history_id += 1
                    history.append((history_id, document_id, user_id, detour_office, "Scanned Out", detour_out))
                    history_id += 1
                    current = detour_out
                    total_minutes += detour_dwell
                    processed_id += 1

        edc = (created + timedelta(minutes=total_minutes + (len(route) * 90))).date() if complete else None
        documents.append(
            (
                document_id,
                process[0],
                user_id,
                f"Synthetic {process[1]} {index + 1:04d}",
                edc,
                qr_code,
                created,
                route[0],
                route,
            )
        )
        if complete:
            completed_count += 1

    execute_values(
        cur,
        """INSERT INTO public.initial_document
        (ini_id,p_id,u_id,title,edc,qr_code,created_at,submission_office_id,route_snapshot)
        VALUES %s""",
        documents,
    )
    execute_values(
        cur,
        """INSERT INTO public.processed_document
        (pd_id,ini_id,s_id,current_office_id,next_office_id,time_in,time_out,duration_minutes,is_adhoc,adhoc_return_office_id,is_returned_from_adhoc)
        VALUES %s""",
        processed,
    )
    execute_values(
        cur,
        """INSERT INTO public.office_action_history
        (history_id,ini_id,u_id,o_id,action_type,action_timestamp,legacy_manila_wall_time)
        VALUES %s""",
        [(row[0], row[1], row[2], row[3], row[4], row[5], False) for row in history],
    )
    return len(documents), completed_count


def generate_bookings(cur: Any, refs: dict[str, Any], rng: random.Random, start: date, end: date, count: int) -> int:
    bookings: list[tuple[Any, ...]] = []
    vehicle_rows: list[tuple[Any, ...]] = []
    facility_rows: list[tuple[Any, ...]] = []
    vehicle_assets = [row for row in refs["assets"] if "van" in row[1].lower() or "vehicle" in row[1].lower()]
    facility_assets = [row for row in refs["assets"] if row not in vehicle_assets]
    if not facility_assets:
        facility_assets = refs["assets"]

    for index in range(count):
        booking_id = index + 1
        booking_type = rng.choices(["Vehicle", "Gym", "Room"], weights=[0.35, 0.35, 0.30])[0]
        reservation = choose_workday(rng, start, end)
        created = working_timestamp(reservation - timedelta(days=rng.randint(2, 45)))
        status = rng.choices(["Confirmed", "Reserved"], weights=[0.78, 0.22])[0]
        user_id = rng.choice(refs["users"])
        bookings.append((booking_id, user_id, booking_type, rng.choice(["CICS", "CTE", "CAS", "Administration"]), reservation, f"Synthetic {booking_type} booking", created, status, created))
        if booking_type == "Vehicle":
            asset_id = rng.choice(vehicle_assets or refs["assets"])[0]
            vehicle_rows.append((asset_id, 3, booking_id, rng.choice(["Batangas City", "Lipa", "Alangilan"]), rng.randint(5, 35), time(8, 0), time(17, 0), [], None, None, None, None, None, None, None, None, None, None))
        else:
            asset_id = rng.choice(facility_assets)[0]
            facility_rows.append((asset_id, booking_id, time(8, 0), time(rng.choice([12, 13, 17]), 0), rng.randint(10, 250), Json({"synthetic": True})))

    execute_values(cur, """INSERT INTO public.bookings
        (booking_id,u_id,booking_type,department,reservation_date,purpose,created_at,status,updated_at)
        VALUES %s""", bookings)
    if vehicle_rows:
        execute_values(cur, """INSERT INTO public.vehicle_requirements
            (v_id,asd_id,sv_id,booking_id,destination,passenger_count,pick_up_time,drop_off_time,official_passengers,prepared_by_name,prepared_by_position,recommending_approval_name,recommending_approval_position,vehicle_to_be_used,designated_driver,plate_number,license_number,assigned_vehicle_id,assigned_driver_id)
            VALUES %s""", [(i + 1, *row) for i, row in enumerate(vehicle_rows)])
    if facility_rows:
        execute_values(cur, """INSERT INTO public.gm_requirements
            (gm_id,asd_id,booking_id,start_time,end_time,expected_attendees,request_details)
            VALUES %s""", [(i + 1, *row) for i, row in enumerate(facility_rows)])
    return len(bookings)


def main() -> None:
    args = parse_args()
    if args.documents < 1 or args.bookings < 1:
        raise SystemExit("documents and bookings must be positive")
    start = args.end_date - timedelta(days=3 * 365 - 1)
    rng = random.Random(args.seed)

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            refs = load_reference_data(cur)
            if args.replace:
                clear_transactions(cur)
            document_count, completed_count = generate_documents(cur, refs, rng, start, args.end_date, args.documents)
            booking_count = generate_bookings(cur, refs, rng, start, args.end_date, args.bookings)
        conn.commit()

    print(f"Generated {document_count} documents ({completed_count} completed) and {booking_count} bookings.")
    print(f"Date range: {start.isoformat()} through {args.end_date.isoformat()}")
    print(f"Seed: {args.seed}")


if __name__ == "__main__":
    main()
