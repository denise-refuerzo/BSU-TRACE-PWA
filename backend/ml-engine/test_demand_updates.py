import unittest
from unittest.mock import patch, mock_open
import numpy as np
import pandas as pd
from booking_snapshot import load_booking_snapshot
from services.peak_demand_service import (forecast_demand, forecast_peak_probabilities,
    select_demand_method, select_peak_warning, calculate_peak_demand, _PROJECTION_CACHE)
from validate_models import warning_metrics


def bookings(days=400):
    dates=pd.date_range('2024-01-01',periods=days)
    return pd.DataFrame({'reservation_date':dates,'created_date':dates-pd.Timedelta(days=10),
                         'booking_type':'Vehicle','daily_demand':np.where(dates.weekday<5,3,0)})


class DemandUpdateTests(unittest.TestCase):
    def test_snapshot_reads_only_booking_copy_data(self):
        data_text=("DROP TABLE public.bookings;\n"
                "COPY public.bookings (reservation_date, booking_type, created_at, purpose) FROM stdin;\n"
                "2025-01-02\tVehicle\t2025-01-01 10:00:00\tSynthetic booking\n"
                "\\.\nSELECT dangerous_function();\n")
        with patch('builtins.open',mock_open(read_data=data_text)):
            data=load_booking_snapshot('dump.sql')
        self.assertEqual(data.daily_demand.sum(),1)
        self.assertTrue(data.synthetic.all())

    def test_known_reservations_are_used_but_future_created_rows_are_not(self):
        df=bookings(100)
        end=df.reservation_date.max()
        first=end+pd.Timedelta(days=1)
        known=pd.DataFrame([dict(reservation_date=first,created_date=end,
                                booking_type='Vehicle',daily_demand=8)])
        with_known=pd.concat([df,known],ignore_index=True)
        base=forecast_demand(df,end,'vehicle_demand','booking_pickup_28')
        pred=forecast_demand(with_known,end,'vehicle_demand','booking_pickup_28')
        self.assertEqual(pred.iloc[0]-base.iloc[0],8)
        poison=known.copy()
        poison['created_date']=end+pd.Timedelta(days=1)
        poison['daily_demand']=100000
        pd.testing.assert_series_equal(pred,forecast_demand(pd.concat([with_known,poison]),
                                    end,'vehicle_demand','booking_pickup_28'))
        pd.testing.assert_series_equal(forecast_demand(with_known,end,'vehicle_demand','booking_pickup_adaptive'),
            forecast_demand(pd.concat([with_known,poison]),end,'vehicle_demand','booking_pickup_adaptive'))
        p=forecast_peak_probabilities(with_known,end,'vehicle_demand',pred.index,4,'booking_pickup')
        self.assertEqual(p[0],1.)
        self.assertTrue(np.all((p>=0)&(p<=1)))

    def test_selection_prioritizes_total_error_over_daily_error(self):
        df=bookings()
        df['daily_demand']=2
        def forecast(_df,end,_category,method):
            values=np.tile([1.,3.],15) if method=='seasonal_naive' else np.repeat(2.2,30)
            return pd.Series(values,index=pd.date_range(end+pd.Timedelta(days=1),periods=30))
        with patch('services.peak_demand_service.METHODS',('seasonal_naive','recent_mean')), \
             patch('services.peak_demand_service.forecast_demand',side_effect=forecast):
            method,scores=select_demand_method(df,df.reservation_date.max(),'vehicle_demand')
        self.assertEqual(method,'seasonal_naive')
        self.assertGreater(scores[method]['mae'],scores['recent_mean']['mae'])

    def test_future_outcomes_do_not_change_selection_or_warning_cutoff(self):
        df=bookings()
        end=df.reservation_date.iloc[349]
        poisoned=df.copy()
        poisoned.loc[poisoned.reservation_date>end,'daily_demand']=99999
        with patch('services.peak_demand_service.METHODS',('recent_mean','booking_pickup_28')):
            self.assertEqual(select_demand_method(df,end,'vehicle_demand'),
                             select_demand_method(poisoned,end,'vehicle_demand'))
        self.assertEqual(select_peak_warning(df,end,'vehicle_demand'),
                         select_peak_warning(poisoned,end,'vehicle_demand'))

    def test_peak_metrics_include_false_alarms_and_misses(self):
        result=warning_metrics([1,1,0,0],[.9,.2,.8,.1],.5)
        self.assertEqual(result['precision'],.5)
        self.assertEqual(result['recall'],.5)
        self.assertEqual(result['false_alarms'],1)
        self.assertEqual(result['missed_peaks'],1)

    def test_new_category_keeps_known_reservations(self):
        df=bookings(100)
        end=df.reservation_date.max()
        df=pd.concat([df,pd.DataFrame([dict(reservation_date=end+pd.Timedelta(days=1),
            created_date=end,booking_type='Room',daily_demand=6)])],ignore_index=True)
        pred=forecast_demand(df,end,'facility_demand','booking_pickup_adaptive')
        self.assertEqual(pred.iloc[0],6)
        self.assertTrue(np.isfinite(pred).all())

    def test_projection_cache_refreshes_on_data_change_and_returns_copies(self):
        df=bookings(3)
        changed=df.copy()
        changed.loc[0,'daily_demand']=20
        with patch.dict(_PROJECTION_CACHE,{},clear=True), \
             patch('services.peak_demand_service.load_booking_history',side_effect=[df,df.copy(),changed]), \
             patch('services.peak_demand_service.build_peak_demand_projection',return_value=[{'value':1}]) as build:
            first=calculate_peak_demand()
            first[0]['value']=999
            self.assertEqual(calculate_peak_demand(),[{'value':1}])
            self.assertEqual(build.call_count,1)
            calculate_peak_demand()
            self.assertEqual(build.call_count,2)


if __name__=='__main__':
    unittest.main()
