import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from contextlib import contextmanager
from unittest.mock import patch

import pandas as pd

from database import analytics_sources, read_combined_query
from services.edc_service import load_edc_history
from services.descriptive_insights_service import calculate_peak_document_traffic
from services.route_performance_service import (calculate_document_routing_efficiency,
                                                calculate_vehicle_scheduling_performance)
from services.system_health_service import run_data_quality_audit


class DualSourceTests(unittest.TestCase):
    def test_distinct_urls_read_both_sources_and_filter_copied_rows(self):
        with patch('database.settings.ML_DATABASE_URL', 'ml'), \
             patch('database.settings.DATABASE_URL', 'live'):
            self.assertEqual([source for source, _, _ in analytics_sources()], ['ml', 'live'])

            @contextmanager
            def connection(source):
                yield source

            queries = []

            def read(query, conn, params):
                queries.append((query, conn, params))
                return pd.DataFrame({'value': [1 if conn == 'ml' else 2]})

            with patch('database.get_db_connection', side_effect=connection), \
                 patch('database.pd.read_sql_query', side_effect=read):
                frame = read_combined_query('SELECT value WHERE {booking_filter}',
                                            params=('date',), predicates={
                                                'booking_filter': "purpose LIKE 'Synthetic %'",
                                            })

        self.assertEqual(frame.value.tolist(), [1, 2])
        self.assertEqual(frame._source.tolist(), ['ml', 'live'])
        self.assertIn("(purpose LIKE 'Synthetic %%') IS TRUE", queries[0][0])
        self.assertIn("(purpose LIKE 'Synthetic %%') IS FALSE", queries[1][0])
        self.assertEqual(queries[0][2], ('date',))

    def test_shared_url_is_queried_once_without_source_filter(self):
        with patch('database.settings.ML_DATABASE_URL', 'same'), \
             patch('database.settings.DATABASE_URL', 'same'):
            self.assertEqual(analytics_sources(), [('live', 'same', None)])

            @contextmanager
            def connection(source):
                yield source

            with patch('database.get_db_connection', side_effect=connection), \
                 patch('database.pd.read_sql_query', return_value=pd.DataFrame({'value': [3]})) as read:
                frame = read_combined_query('SELECT value WHERE {booking_filter}', predicates={
                    'booking_filter': "purpose LIKE 'Synthetic %'",
                })
        self.assertEqual(frame.value.tolist(), [3])
        self.assertIn('WHERE TRUE', read.call_args.args[0])
        self.assertEqual(read.call_count, 1)

    def test_edc_separates_colliding_document_ids_and_maps_office_ids(self):
        steps = pd.DataFrame([
            dict(_source=source, ini_id=1, route_snapshot=route, pd_id=step,
                 s_id=5 if step == 2 else 2, current_office_id=office,
                 time_in=start, time_out=end)
            for source, route, offices in [('ml', [11, 22], [11, 22]),
                                           ('live', [1, 2], [1, 2])]
            for step, office, start, end in [
                (1, offices[0], '2026-11-04 08:00', '2026-11-04 09:00'),
                (2, offices[1], '2026-11-04 10:00', '2026-11-04 11:00'),
            ]
        ])
        offices = pd.DataFrame([
            dict(_source='ml', o_id=11, office_name='Records'),
            dict(_source='ml', o_id=22, office_name='GSO'),
            dict(_source='live', o_id=1, office_name='Records'),
            dict(_source='live', o_id=2, office_name='GSO'),
        ])
        with patch('services.edc_service.read_combined_query', side_effect=[steps, offices]):
            docs = load_edc_history()
        self.assertEqual(len(docs), 2)
        self.assertEqual(set(docs.source), {'ml', 'live'})
        self.assertTrue(all(route == [1, 2] for route in docs.route))

    def test_analytics_merge_counts_and_weighted_averages(self):
        traffic = pd.DataFrame([
            dict(month='2026-11', request_count=5, _source='ml'),
            dict(month='2026-11', request_count=3, _source='live'),
        ])
        with patch('services.descriptive_insights_service.read_combined_query', return_value=traffic):
            self.assertEqual(calculate_peak_document_traffic(),
                             [{'month': '2026-11', 'request_count': 8}])

        routes = pd.DataFrame([
            dict(route_name='Records', total_documents=2, avg_stops=2,
                 avg_completion_hours=2, avg_active_processing_hours=1),
            dict(route_name='Records', total_documents=1, avg_stops=5,
                 avg_completion_hours=8, avg_active_processing_hours=4),
        ])
        with patch('services.route_performance_service.read_combined_query', return_value=routes):
            result = calculate_document_routing_efficiency()
        self.assertEqual(result[0]['total_documents'], 3)
        self.assertEqual(result[0]['avg_completion_hours'], 4.0)

        vehicles = pd.DataFrame([
            dict(asset_name='Van', total_trips=2, avg_trip_seconds=3600),
            dict(asset_name='Van', total_trips=1, avg_trip_seconds=7200),
        ])
        with patch('services.route_performance_service.read_combined_query', return_value=vehicles):
            result = calculate_vehicle_scheduling_performance()
        self.assertEqual(result, [{'asset_name': 'Van', 'total_trips': 3,
                                   'avg_turnaround_hours': 1.33}])

    def test_health_audit_counts_both_sources_without_double_counting_missing_fields(self):
        counts = pd.DataFrame([
            dict(total_documents=10, missing_time_in_records=2,
                 missing_time_out_records=2, invalid_records=2),
            dict(total_documents=5, missing_time_in_records=1,
                 missing_time_out_records=0, invalid_records=1),
        ])
        with patch('services.system_health_service.read_combined_query', return_value=counts):
            result = run_data_quality_audit()
        self.assertEqual(result['audit_details']['total_records_scanned'], 15)
        self.assertEqual(result['integrity_score_percentage'], 80.0)


if __name__ == '__main__':
    unittest.main()
