import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from datetime import datetime
from unittest.mock import patch
from contextlib import redirect_stdout
from io import StringIO
import numpy as np
import pandas as pd
from business_calendar import add_business_minutes, business_minutes_between, MANILA
from services.edc_service import EDCModel, prediction_record, temporal_split, prepare_edc_history
from services.peak_demand_service import daily_history, aggregate_forecast_weeks, build_peak_demand_projection
from validate_models import compute_statistical_metrics, validate_peak_demand_time_series, print_key_results


class WorkingCalendarTests(unittest.TestCase):
    def test_friday_to_monday_and_lunch(self):
        start = datetime(2026,10,16,15,tzinfo=MANILA)
        end = add_business_minutes(start,360)
        self.assertEqual(end,datetime(2026,10,19,12,tzinfo=MANILA))
        self.assertEqual(business_minutes_between(start,end),360)
        self.assertEqual(add_business_minutes(datetime(2026,10,19,11,tzinfo=MANILA),120),
                         datetime(2026,10,19,14,tzinfo=MANILA))

    def test_holiday_and_partial_suspension(self):
        start = datetime(2026,4,8,16,tzinfo=MANILA)
        self.assertEqual(add_business_minutes(start,120),datetime(2026,4,10,9,tzinfo=MANILA))
        self.assertEqual(business_minutes_between(datetime(2025,7,21,8),datetime(2025,7,21,17)),240)

    def test_calendar_inverse(self):
        for start in [datetime(2026,10,16,15),datetime(2026,10,17,12),datetime(2026,10,19,12,30)]:
            for duration in (1,60,360,1440,2000):
                self.assertAlmostEqual(business_minutes_between(start,add_business_minutes(start,duration)),duration)


class EDCTests(unittest.TestCase):
    def test_history_ignores_stored_minutes_and_includes_transfer(self):
        steps=pd.DataFrame([
            dict(ini_id=1,route_snapshot=[1,2],pd_id=1,s_id=3,current_office_id=1,time_in=pd.Timestamp('2026-10-19 11:00'),time_out=pd.Timestamp('2026-10-19 14:00'),duration_minutes=9999),
            dict(ini_id=1,route_snapshot=[1,2],pd_id=2,s_id=5,current_office_id=2,time_in=pd.Timestamp('2026-10-19 15:00'),time_out=pd.Timestamp('2026-10-19 16:00'),duration_minutes=9999)])
        docs=prepare_edc_history(steps)
        self.assertEqual(docs.iloc[0].minutes,240)
        self.assertEqual(docs.iloc[0].transfers,[(1,2,60)])
        model=EDCModel().fit(docs)
        self.assertEqual(model.predict(docs)[0],240)
        record=prediction_record(model,[1,2],datetime(2026,10,19,11,tzinfo=MANILA))
        self.assertEqual(record['estimated_hours_to_complete'],4)
        self.assertEqual(record['buffered_working_hours'],28)
        self.assertEqual(business_minutes_between(datetime.fromisoformat(record['estimated_completion_at']),
                                                datetime.fromisoformat(record['buffered_delivery_at'])),1440)
        steps.loc[1,'s_id']=3
        self.assertTrue(prepare_edc_history(steps).empty)

    def test_split_excludes_unfinished_training_records(self):
        docs=pd.DataFrame({'start':pd.date_range('2026-01-01',periods=10),
                           'end':pd.date_range('2026-01-02',periods=10)})
        docs.loc[0,'end']=pd.Timestamp('2026-02-01')
        train,test=temporal_split(docs)
        self.assertTrue((train.end<test.start.min()).all())
        self.assertNotIn(0,train.index)

    def test_unseen_office_uses_training_only_fallback(self):
        train=pd.DataFrame([dict(route=[1,2],start=pd.Timestamp('2026-10-19'),minutes=90,
                                dwells=[(1,30),(2,40)],transfers=[(1,2,20)])])
        model=EDCModel().fit(train)
        self.assertEqual(model.predict(pd.DataFrame([dict(route=[99,100],start=pd.Timestamp('2026-10-20'))]))[0],90)


class DemandTests(unittest.TestCase):
    def test_full_horizon_metrics_and_concise_output(self):
        dates=pd.date_range('2025-01-01',periods=540)
        history=pd.DataFrame({'vehicle_demand':np.tile([1.,3.],270),
                              'facility_demand':np.tile([1.,3.],270)},index=dates)
        bookings=pd.DataFrame({'reservation_date':dates,'synthetic':True})
        def daily(_df,cutoff):
            return history.loc[:pd.Timestamp(cutoff)]
        def forecast(_df,_end,_category,_method):
            return pd.Series(np.repeat(2.,30))
        with patch('validate_models.load_booking_history',return_value=bookings), \
             patch('validate_models.daily_history',side_effect=daily), \
             patch('validate_models.select_demand_method',return_value=('recent_mean',{})), \
             patch('validate_models.select_peak_warning',return_value={'method':'constant','count_threshold':4,'probability_cutoff':.5}), \
             patch('validate_models.forecast_demand',side_effect=forecast), \
             patch('validate_models.booking_pickup_components',return_value=(np.zeros(30),np.zeros(30))), \
             patch('validate_models.forecast_peak_probabilities',return_value=np.zeros(30)):
            demand=validate_peak_demand_time_series()
        result=demand['categories']['vehicle_demand']
        self.assertEqual(result['daily']['selected']['MAE'],1.)
        self.assertEqual(result['total_30_days']['selected']['MAE'],0.)
        self.assertEqual(result['total_30_days']['selected']['Observations'],6)
        self.assertIsNone(result['total_30_days']['selected']['R-squared'])
        output=StringIO()
        with redirect_stdout(output):
            print_key_results({'edc':{'Status':'No documents'},'demand':demand})
        self.assertIn('total_30_days',output.getvalue())
        self.assertNotIn('weekly_complete',output.getvalue())
        self.assertIn('only 6 test observations',output.getvalue())

    def test_creation_date_cutoff_and_missing_category(self):
        df=pd.DataFrame([dict(reservation_date='2026-10-01',created_date='2026-09-30',booking_type='Vehicle',daily_demand=2),
                         dict(reservation_date='2026-10-01',created_date='2026-10-05',booking_type='Room',daily_demand=50)])
        history=daily_history(df,'2026-10-02')
        self.assertEqual(history.vehicle_demand.sum(),2)
        self.assertEqual(history.facility_demand.sum(),0)
        self.assertEqual(len(history),2)

    def test_weekly_totals_conserve_all_30_days(self):
        rows=[dict(date=d.date().isoformat(),type='forecast',vehicle_demand=1.5,facility_demand=2)
              for d in pd.date_range('2026-10-22',periods=30)]
        weeks=aggregate_forecast_weeks(rows)
        self.assertEqual([w['days'] for w in weeks],[7,7,7,7,2])
        self.assertEqual(sum(w['vehicle_demand'] for w in weeks),45)
        self.assertTrue(weeks[-1]['partial'])

    def test_future_rows_do_not_change_forecast(self):
        df=pd.DataFrame([dict(reservation_date=d,booking_type='Vehicle',daily_demand=d.day%4)
                         for d in pd.date_range('2026-01-01',periods=140)])
        original=build_peak_demand_projection(df,today='2026-05-20')
        poisoned=pd.concat([df,pd.DataFrame([dict(reservation_date=pd.Timestamp('2026-06-01'),booking_type='Vehicle',daily_demand=100000)])])
        self.assertEqual(original,build_peak_demand_projection(poisoned,today='2026-05-20'))

    def test_metrics_preserve_negative_r2_and_undefined_constant_r2(self):
        self.assertEqual(compute_statistical_metrics([10,20,30],[25,25,25])['R-squared'],-.375)
        metrics=compute_statistical_metrics([0,0],[0,0])
        self.assertIsNone(metrics['R-squared'])
        self.assertIsNone(metrics['MAPE (%)'])


if __name__=='__main__':
    unittest.main()
