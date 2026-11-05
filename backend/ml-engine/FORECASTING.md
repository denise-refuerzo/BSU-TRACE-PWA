# Forecasting behavior and evaluation

## EDC

The target is working minutes from first scan to final completion, including working-time transfers. The shared calendar counts Monday-Friday 08:00-12:00 and 13:00-17:00, excluding recorded holidays and suspensions. Naive PostgreSQL timestamps are interpreted as Manila wall time.

Completed, non-overlapping histories with at least two steps and positive working duration are eligible. Invalid/incomplete histories are excluded and counted. There is no top-percentile trimming. Stored duration_minutes is not used: the synthetic generator counted lunch as working time, so the new target must be recomputed from timestamps. Database records are not rewritten.

Candidates are a training-only office dwell plus office-pair transfer average, standardized Ridge on working minutes, and Ridge on log1p(working minutes) with a training-only smearing correction. Features use the planned route and first-scan hour, weekday and month; they do not use the final realized hop count or eventual detours. Selection minimizes MAE on an inner chronological split, using RMSE to break ties. Training documents that finish on or after the validation boundary are purged. The service refits the selected method on available completed history and caches it for up to 15 minutes, invalidating sooner when either source gains completed steps. Unseen offices/pairs use training-only global means.

The API preserves estimated_hours_to_complete as the RAW working duration. safety_buffer_working_hours is 24; buffered_working_hours includes it. estimated_completion_at is the raw date/time; estimated_delivery_date and buffered_delivery_at include the safety allowance. Route previews assume the first scan occurs at the request time (normalized to office hours); they are not forecasts of waiting before first scan. Existing saved document deadlines are not retroactively rewritten.

The validator reserves the latest approximately 20% of documents as a final test, purges crossing documents, selects only within the earlier development portion and refits before testing. It reports selected, dwell-transfer and training-mean baselines on the same test. Buffer coverage is reported separately, not as model accuracy.

## Demand

The target is all booking requests by reservation date, regardless of current status. Each booking row counts once. Vehicle requests form one series; other booking types form the facility series. Current reservation dates are used; original dates before rescheduling cannot be reconstructed from this table. The SQL snapshot loader reads only the bookings COPY section and never executes SQL or restores a database.

History includes zero-count calendar days. Creation dates enforce as-of availability. Live history ends yesterday in Manila, and the forecast starts today for 30 dates. Future reservation dates are not training outcomes. Booking-aware candidates use requests for those dates only when their creation date is on or before the forecast cutoff. Missing records are assumed zero requests; a gap of more than seven days since the last observed request is flagged in the dashboard, not silently filled with invented demand. This snapshot ends on 2026-10-09, so a later live forecast differs from the historical tests.

Forecast candidates include recent means; last-week seasonal naive; weekday averages over several history windows; pooled weekday/weekend averages; calendar Poisson regression; damped additive Holt-Winters; seasonal smoothing without trend; a smoothing/weekday ensemble; and booking pickup methods. The pickup methods combine already-submitted requests with expected requests still to arrive. The latter use weekday averages and a lead-time distribution estimated from past reservations. An adaptive pickup candidate adjusts the remaining count using advance bookings, with a one-week-equivalent prior to temper the adjustment. These are modeling assumptions, not guaranteed arrival distributions.

At each origin, six earlier non-overlapping 30-day validation windows select a method by 30-day-total MAE, with daily RMSE breaking ties. A baseline may win. Live and validation forecasts use the same functions, including creation-date filtering and model reselection. The API caches the projection until the combined source data or Manila date changes. Daily and weekly views derive from the same 30 daily counts. Weekly totals comprise four complete seven-day periods and a labeled two-day partial period. Fractional forecasts are expected counts.

Peak warnings are separate from count forecasts. A peak exceeds the daily 90th percentile of history before the first inner validation window. Candidate probabilities are historical prevalence, smoothed weekday frequencies (all/recent history), calendar logistic regression, and a booking-aware Poisson tail probability. The booking-aware method accounts for requests already known and models remaining arrivals with a Poisson distribution. Inner validation Brier score selects the probability method. Inner validation F1 selects a probability cutoff from 0.10 through 0.80 in 0.05 steps, with precision and then higher cutoff as tie breakers. The threshold and configuration are frozen for each forecast horizon. Precision, recall, F1, Brier score, false alarms and misses are reported against constant-probability, weekday, always-warn and never-warn baselines. These warnings do not assess asset availability or confirm a future peak.

The retrospective evaluation uses six final non-overlapping 30-day periods (180 days). At each origin, it reselects and refits using only available earlier information, including outcomes from earlier test periods as they become observable. All 30-day totals and per-origin selections are saved. The final 90 days are also reported separately for comparison with the earlier evaluation dates. Some test results were already inspected in prior development and during this update: these are retrospective development comparisons, not a fresh untouched final test. Six total-demand observations are a small sample; do not conceal negative R-squared or claim real-world validation.

## Calendar maintenance

Edit office_calendar.json to add officially confirmed dates and partial-day closure intervals; restart the service to reload it. The initial list is carried from the existing synthetic generator's reference calendar, with its July 21, 2025 afternoon suspension represented as partial-day. It is not a complete university suspension register. Listed coverage is 2023-10-16 through 2026-12-31; API calendar_coverage_available flags estimates beyond that range. Date coverage does not certify all local suspensions are known. Verify official notices and extend the list before operational use, especially beyond 2026. Unexpected closures cannot be anticipated.

## Data sources

When the Python service has distinct `ML_DATABASE_URL` and `DATABASE_URL` values, analytics read synthetic records from the ML database and non-synthetic records from the live database. Source filters use the existing `Synthetic ` prefix on booking purposes and document titles, and `Synthetic Requestor` on equipment ledgers. Joins happen within each database before records are combined. Document office IDs are mapped by office name to live IDs; current process routes and vehicle availability use the live database. Both connections are read-only. If only one URL is configured, analytics read that database once without source filtering.

This source split avoids counting copied synthetic rows twice. It assumes live user records do not use those synthetic markers. It does not yet weight real and synthetic training history differently or expose an ICT Admin history setting. The existing retrospective reports above describe the earlier synthetic-only snapshot and are not validation of the combined live system.

## Run

From the repository root:

```powershell
python -B -m unittest discover -s backend/ml-engine -p 'test_*.py'
python -B backend/ml-engine/validate_models.py --output backend/ml-engine/reports/validation.json
```

The default console summary shows EDC, daily demand and total demand over each full 30-day horizon, alongside practical baselines. It shows MAE, RMSE, R-squared, wMAPE and observation counts. The 30-day total metrics aggregate predictions and actuals separately within each test horizon before calculating errors; they have only six observations and can hide errors in timing. Peak-warning metrics are also shown in the concise output. They do not establish peak-detection performance. Add --details to display the full report, including MAPE, other baselines, weekly/partial-period metrics and peak diagnostics. --output saves the full report regardless of console detail level.

Add --audits for descriptive/decision service smoke checks. They are not predictive-quality tests. Both database connections use read-only transactions. No migrations, synthetic regeneration or database updates are required.

MAE/RMSE remain in their original units. R-squared may be negative; zero-variance targets produce null, not a fabricated score. MAPE omits zero targets and reports that count; wMAPE includes their absolute errors. No NMAE/NRMSE is substituted. All results here concern synthetic data, not demonstrated real-world performance. Do not compare the old elapsed-hour CV and confirmed-only weekly holdout with the new working-hour and all-request chronological tests as if only the algorithm changed.

### Evaluate the supplied snapshot without a database connection

```powershell
python -B backend/ml-engine/validate_models.py --demand-only --booking-snapshot "C:\Users\alex denise\Downloads\ML_database.sql" --output backend/ml-engine/reports/demand-validation.json
```

This skips EDC; the existing EDC evaluation is unchanged. Without --booking-snapshot, booking data comes from the configured read-only database connections. Without --demand-only, EDC still requires those connections. No database alteration or migration is required.
