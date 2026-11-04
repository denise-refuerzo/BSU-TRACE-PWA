# Validation results - 2026-10-21

Read-only evaluation of existing synthetic history. No database records were altered. Full metrics, baseline comparisons and selection scores are in validation-2026-10-21.json.

| Target | MAE | RMSE | R-squared |
|---|---:|---:|---:|
| Document duration, working hours | 1.4463 | 1.9142 | 0.0917 |
| Vehicle requests/day | 1.2603 | 1.8038 | 0.4170 |
| Facility requests/day | 1.5245 | 2.1351 | 0.3076 |
| Vehicle requests/complete week | 4.3442 | 6.0996 | -0.2979 |
| Facility requests/complete week | 5.5084 | 7.2481 | -1.1090 |

## EDC

Raw-minute Ridge selected using the earlier inner validation partition. Final test: 9,800 documents with the first test start on 2026-04-24 and completions through 2026-10-13. Development: 39,166 documents; 34 documents crossing the boundary were excluded from training. All 49,000 source documents were synthetic and passed eligibility checks.

On the same final test, dwell-plus-transfer MAE/RMSE were 1.4678/1.9689 working hours and R-squared 0.0391. The selected model provides a modest improvement over that baseline. The 24-working-hour allowance covered 100% of this synthetic test, but that is not 100% prediction accuracy or a real-world guarantee.

The old result of 15.1799 hours MAE used elapsed time, different evaluation splits and percentile trimming. It is not a directly comparable measure of improvement. The generator did not pause for lunch; working targets are recomputed under the newly agreed schedule without changing its records.

## Demand

Seasonal smoothing was selected for both categories using earlier daily MAE. Final test dates: 2026-07-12 through 2026-10-09, comprising three rolling 30-day forecasts (90 daily observations, 12 complete weeks). The two remaining days in each horizon are evaluated separately in the JSON, not mixed into complete weeks.

Daily MAE/RMSE beat both the recent-mean and seasonal-naive baselines. Weekly totals remain weak: vehicle MAE beats recent mean (4.5833), but its RMSE is worse than recent mean (5.6310); facility weekly MAE/RMSE also trail recent mean (4.7500/5.6106).

Daily peak recall is 0 for both categories at a training-only threshold above 4 requests/day. Vehicle weekly peak recall is 0; facility weekly peak precision is 0.5 and recall 0.2857 at a threshold above 18 requests/week. These results do not establish reliable peak-event forecasting. The synthetic random request generation and lack of event/workload predictors limit predictability. No method was retuned against these final outcomes to manufacture a better R-squared.

MAPE excludes 27 vehicle zero-demand days and 29 facility zero-demand days. These percentage metrics should not replace original-unit errors. Training and final test periods differ from the old eight-week confirmed/approved-only evaluation, so the previous table is not an apples-to-apples benchmark.

## Verification

Passed: 12 Python tests, 5 JavaScript tests, and the production frontend build. Targeted lint passes for the analytics, submission modal, processor, and dashboard changes. The originator hook retains its 10 pre-existing lint findings (8 errors, 2 warnings); comparison against HEAD confirmed the same rules and messages. See FORECASTING.md for behavior, repeatable commands and calendar limitations. These are local changes; no deployment or database migration was performed.
