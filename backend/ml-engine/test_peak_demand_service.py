import unittest

import pandas as pd

from services.peak_demand_service import FORECAST_DAYS, build_peak_demand_projection


class PeakDemandProjectionTests(unittest.TestCase):
    def test_sparse_history_still_produces_next_30_calendar_days(self):
        history = pd.DataFrame([
            {'reservation_date': '2026-08-03', 'booking_type': 'Vehicle', 'daily_demand': 1},
            {'reservation_date': '2026-08-14', 'booking_type': 'Room', 'daily_demand': 2},
            {'reservation_date': '2026-09-05', 'booking_type': 'Vehicle', 'daily_demand': 1},
            {'reservation_date': '2026-09-18', 'booking_type': 'Gymnasium', 'daily_demand': 1},
        ])

        rows = build_peak_demand_projection(history, today='2026-09-24')
        forecast = [row for row in rows if row['type'] == 'forecast']

        self.assertEqual(len(forecast), FORECAST_DAYS)
        self.assertEqual(forecast[0]['date'], '2026-09-25')
        self.assertEqual(forecast[-1]['date'], '2026-10-24')
        self.assertTrue(all(row['vehicle_demand'] is not None for row in forecast))
        self.assertTrue(all(row['facility_demand'] is not None for row in forecast))
        self.assertTrue(all(row['vehicle_demand'] >= 0 for row in forecast))
        self.assertTrue(all(row['facility_demand'] >= 0 for row in forecast))
        self.assertIn('baseline', forecast[0]['model_note'])

    def test_future_bookings_are_not_treated_as_history(self):
        history = pd.DataFrame([
            {'reservation_date': '2026-09-20', 'booking_type': 'Vehicle', 'daily_demand': 1},
            {'reservation_date': '2026-10-10', 'booking_type': 'Vehicle', 'daily_demand': 9},
        ])

        rows = build_peak_demand_projection(history, today='2026-09-24')
        historical = [row for row in rows if row['type'] == 'historical']
        forecast = [row for row in rows if row['type'] == 'forecast']

        self.assertEqual(historical[-1]['date'], '2026-09-24')
        self.assertEqual(forecast[0]['date'], '2026-09-25')


if __name__ == '__main__':
    unittest.main()
