"""Synthetic-history evaluation of the same predictors used by the API.

No database writes. Original-unit errors measure raw predictions, not buffers.
Each origin selects using earlier history only. This is retrospective evaluation,
not an untouched test after development. Run --output report.json to save.
"""
import argparse
import json
import warnings
from pathlib import Path
import numpy as np
import pandas as pd
from business_calendar import MANILA, CALENDAR_NOTE
from services.edc_service import load_edc_history, temporal_split, select_edc_model, EDCModel, BUFFER_HOURS
from services.peak_demand_service import (load_booking_history, daily_history, select_demand_method,
    forecast_demand, select_peak_warning, forecast_peak_probabilities, booking_pickup_components,
    CATEGORIES, FORECAST_DAYS)
from services.bottleneck_service import calculate_office_dwell_times
from services.route_performance_service import (calculate_document_routing_efficiency,
    calculate_vehicle_scheduling_performance, recommend_optimized_routing, recommend_vehicle_allocation)


def compute_statistical_metrics(y_true, y_pred):
    y, p = np.asarray(y_true,dtype=float),np.asarray(y_pred,dtype=float)
    if y.shape != p.shape or not y.size or not np.isfinite(y).all() or not np.isfinite(p).all():
        raise ValueError('Metrics require equally shaped, finite, nonempty observations')
    error = y-p
    denominator = np.sum((y-y.mean())**2)
    nonzero = y != 0
    return {'MAE':round(float(np.abs(error).mean()),4),
            'RMSE':round(float(np.sqrt(np.mean(error**2))),4),
            'R-squared':round(float(1-np.sum(error**2)/denominator),4) if denominator>0 else None,
            'MAPE (%)':round(float(np.abs(error[nonzero]/y[nonzero]).mean()*100),2) if nonzero.any() else None,
            'wMAPE (%)':round(float(np.abs(error).sum()/y.sum()*100),2) if y.sum()>0 else None,
            'Observations':int(y.size), 'Zero actuals excluded from MAPE':int((~nonzero).sum())}


def validate_edc_linear_regression(n_splits=None):
    # Name retained for callers; chronological development/test replaces random CV.
    docs = load_edc_history()
    if len(docs)<100:
        return {'Status':'Insufficient completed documents (need 100).'}
    development,test = temporal_split(docs)
    if len(development)<50 or len(test)<20:
        return {'Status':'Insufficient chronology for a separate final test.'}
    model,scores = select_edc_model(development)
    actual = test.minutes.to_numpy()/60
    pred = model.predict(test)/60
    baseline = EDCModel().fit(development).predict(test)/60
    return {'selected_method':model.method,'selection_metric':'Inner temporal validation MAE; RMSE breaks ties',
            'inner_validation':scores, 'unit':'working hours',
            'raw_prediction':compute_statistical_metrics(actual,pred),
            'dwell_transfer_baseline':compute_statistical_metrics(actual,baseline),
            'training_mean_baseline':compute_statistical_metrics(actual,np.repeat(development.minutes.mean()/60,len(test))),
            'buffer_working_hours':BUFFER_HOURS,
            'buffered_deadline_coverage_percent':round(float(np.mean(actual<=pred+BUFFER_HOURS)*100),2),
            'test_start':str(test.start.min()),'test_end':str(test.end.max()),
            'development_documents':len(development),'test_documents':len(test),
            'excluded_invalid_or_incomplete_documents':docs.attrs.get('excluded_documents',0),
            'synthetic_documents':int(docs.synthetic.sum()),
            'note':'No percentile trimming. Buffer excluded from error metrics. Historical work recalculated with lunch excluded.'}


def peak_metrics(actual,pred,threshold):
    a,p = np.asarray(actual)>threshold,np.asarray(pred)>threshold
    tp = int(np.sum(a&p)); predicted = int(p.sum()); observed = int(a.sum())
    return {'threshold':round(float(threshold),3),'actual_peaks':observed,'predicted_peaks':predicted,
            'precision':round(tp/predicted,4) if predicted else None,
            'recall':round(tp/observed,4) if observed else None}


def warning_metrics(actual, probabilities, cutoff, flags=None):
    y = np.asarray(actual,dtype=bool)
    p = np.asarray(probabilities,dtype=float)
    flags = p>=cutoff if flags is None else np.asarray(flags,dtype=bool)
    tp = int(np.sum(y & flags)); fp = int(np.sum(~y & flags)); fn = int(np.sum(y & ~flags))
    return {'precision':round(tp/(tp+fp),4) if tp+fp else None,
            'recall':round(tp/(tp+fn),4) if tp+fn else None,
            'f1':round(2*tp/(2*tp+fp+fn),4) if 2*tp+fp+fn else None,
            'brier':round(float(np.mean((p-y.astype(float))**2)),4),
            'actual_peaks':int(y.sum()),'warnings':int(flags.sum()),
            'correct_warnings':tp,'false_alarms':fp,'missed_peaks':fn}


def validate_peak_demand_time_series(test_weeks=None, booking_data=None, test_periods=6):
    df = load_booking_history() if booking_data is None else booking_data
    if df.empty:
        return {'Status':'No booking history'}
    # Complete synthetic observation window ends at the last recorded reservation.
    # Live service extends history to yesterday; report this evaluation boundary.
    last = min(pd.Timestamp(df.reservation_date.max()),
               pd.Timestamp.now(tz=MANILA).tz_localize(None).normalize()-pd.Timedelta(days=1))
    first_cutoff = last-pd.Timedelta(days=FORECAST_DAYS*test_periods)
    train = daily_history(df,first_cutoff)
    if len(train)<270:
        return {'Status':'Need 270 development days plus the requested final test periods'}
    results = {'test_start':str((first_cutoff+pd.Timedelta(days=1)).date()),'test_end':str(last.date()),
               'horizon_days':FORECAST_DAYS,'test_origins':test_periods,
               'selection':'At each origin: six earlier 30-day validation windows; minimize total MAE, daily RMSE breaks ties; no future observations',
               'evaluation_note':'Retrospective re-evaluation: some final periods were inspected during earlier development; not a new untouched test.',
               'target':'All booking requests by reservation date, including cancelled/rejected',
               'synthetic_history':bool(df.synthetic.all()) if 'synthetic' in df else None,
               'categories':{}}
    for col in CATEGORIES:
        method,scores = select_demand_method(df,first_cutoff,col)
        warning = select_peak_warning(df,first_cutoff,col)
        probabilities = {name:[] for name in ('selected','constant','weekday')}
        predictions = {name:[] for name in ('selected','recent_mean','seasonal_naive','seasonal_smoothing')}
        actuals=[]
        periods=[]
        peak_labels=[]
        already_known_peaks=[]
        peak_flags={name:[] for name in probabilities}
        for offset in range(0,FORECAST_DAYS*test_periods,FORECAST_DAYS):
            cutoff = first_cutoff+pd.Timedelta(days=offset)
            if offset:
                method,scores = select_demand_method(df,cutoff,col)
                warning = select_peak_warning(df,cutoff,col)
            history = daily_history(df,cutoff)
            index = pd.date_range(cutoff+pd.Timedelta(days=1),periods=30)
            actual = daily_history(df,cutoff+pd.Timedelta(days=30))[col].reindex(index).to_numpy()
            actuals.append(actual)
            periods.append({'start':str(index[0].date()),'end':str(index[-1].date()),
                            'actual_total':float(actual.sum()),'forecasts':{},
                            'selected_method':method,'inner_validation':scores,
                            'peak_warning_configuration':warning})
            peak_labels.extend((actual>warning['count_threshold']).tolist())
            known,_=booking_pickup_components(df,cutoff,col,pd.Series(np.zeros(len(index)),index=index))
            already_known_peaks.extend((known>warning['count_threshold']).tolist())
            for name in probabilities:
                p=forecast_peak_probabilities(df,cutoff,col,index,warning['count_threshold'],
                                               warning['method'] if name=='selected' else name)
                probabilities[name].extend(p.tolist())
                peak_flags[name].extend((p>=warning['probability_cutoff']).tolist())
            for name in predictions:
                forecast_method = method if name=='selected' else name
                # Same forecast function and as-of booking features used by the service.
                predictions[name].append(forecast_demand(df,cutoff,col,forecast_method).to_numpy())
                periods[-1]['forecasts'][name]=round(float(predictions[name][-1].sum()),4)
        y=np.concatenate(actuals)
        fullweeks=lambda values: np.concatenate([np.asarray(v[:28]).reshape(4,7).sum(axis=1) for v in values])
        partial=lambda values: np.array([np.sum(v[28:]) for v in values])
        category={'selected_method':'Adaptive: '+', '.join(dict.fromkeys(p['selected_method'] for p in periods)),
                  'inner_validation':scores,'test_period_totals':periods,
                  'daily':{},'total_30_days':{},'weekly_complete_7_day_periods':{},'partial_2_day_periods':{}}
        for name,values in predictions.items():
            category['daily'][name]=compute_statistical_metrics(y,np.concatenate(values))
            category['total_30_days'][name]=compute_statistical_metrics(
                [np.sum(v) for v in actuals], [np.sum(v) for v in values])
            category['weekly_complete_7_day_periods'][name]=compute_statistical_metrics(fullweeks(actuals),fullweeks(values))
            category['partial_2_day_periods'][name]=compute_statistical_metrics(partial(actuals),partial(values))
        category['daily_peaks']=peak_metrics(y,np.concatenate(predictions['selected']),train[col].quantile(.9))
        category['peak_warning_configuration']=warning
        labels=np.asarray(peak_labels)
        category['peak_warnings']={name:warning_metrics(labels,p,.5,flags=peak_flags[name])
                                   for name,p in probabilities.items()}
        category['peak_warnings']['always_warn']=warning_metrics(labels,np.ones(len(labels)),.5)
        category['peak_warnings']['never_warn']=warning_metrics(labels,np.zeros(len(labels)),.5)
        category['peak_warnings']['already_booked_only']=warning_metrics(labels,np.asarray(already_known_peaks,dtype=float),.5)
        unknown=~np.asarray(already_known_peaks,dtype=bool)
        category['peak_warning_known_booking_context']={
            'days_already_above_peak_threshold_at_origin':int(np.sum(already_known_peaks)),
            'remaining_days':int(unknown.sum()),
            'selected_on_remaining_days':warning_metrics(labels[unknown],
                np.asarray(probabilities['selected'])[unknown],.5,
                flags=np.asarray(peak_flags['selected'])[unknown]) if unknown.any() else None}
        # Match the original final 90-day dates for an explicit like-for-like comparison.
        category['last_90_days']={name:{
            'daily':compute_statistical_metrics(np.concatenate(actuals[-3:]),np.concatenate(values[-3:])),
            'total_30_days':compute_statistical_metrics([v.sum() for v in actuals[-3:]], [v.sum() for v in values[-3:]])}
            for name,values in predictions.items()}
        category['weekly_peaks']=peak_metrics(fullweeks(actuals),fullweeks(predictions['selected']),
                                              train[col].rolling(7).sum().dropna().quantile(.9))
        results['categories'][col]=category
    return results


def validate_descriptive_and_decision_services():
    audits = {}
    
    bottlenecks = calculate_office_dwell_times()
    dwell_values = [b['dwell_time_hours'] for b in bottlenecks]
    is_sorted = all(dwell_values[i] >= dwell_values[i+1] for i in range(len(dwell_values)-1))
    audits["2.1 Bottleneck Heatmap"] = {
        "Status": "PASSED" if is_sorted and len(bottlenecks) > 0 else "FAILED",
        "Offices Tracked": len(bottlenecks),
        "Top Stagnation Office": bottlenecks[0]['office_name'] if bottlenecks else None,
        "Sorted Descending": is_sorted
    }

    route_eff = calculate_document_routing_efficiency()
    fleet_turn = calculate_vehicle_scheduling_performance()
    audits["2.4 Route Efficiency"] = {
        "Status": "PASSED" if len(route_eff) > 0 else "FAILED",
        "Active Routes Evaluated": len(route_eff)
    }
    audits["2.4 Fleet Turnaround"] = {
        "Status": "PASSED" if len(fleet_turn) > 0 else "FAILED",
        "Vehicles Monitored": len(fleet_turn)
    }

    sample_route = [1, 28, 34, 10]
    routing_rec = recommend_optimized_routing(sample_route)
    allocation_rec = recommend_vehicle_allocation("2026-09-20", requested_passengers=4)
    
    audits["2.4 Decision Support (Routing Advisory)"] = {
        "Status": "PASSED" if "critical_bottlenecks_detected" in routing_rec else "FAILED",
        "Bottlenecks Flagged": routing_rec.get("critical_bottlenecks_detected", 0)
    }
    audits["2.4 Decision Support (Vehicle Assignment)"] = {
        "Status": "PASSED" if allocation_rec.get("recommended_vehicle") is not None else "FAILED",
        "Recommended Asset": allocation_rec.get("recommended_vehicle"),
        "Assignment Status": allocation_rec.get("status")
    }

    return audits


def print_key_results(report):
    columns=['MAE','RMSE','R-squared','wMAPE (%)','Observations']
    def table(rows):
        print(pd.DataFrame(rows).T[columns].to_string())

    print('\nEDC | working hours | chronological holdout (not 5-fold CV)')
    edc=report['edc']
    if 'raw_prediction' in edc:
        print('Selected method:',edc['selected_method'])
        table({name:edc[name] for name in ('raw_prediction','dwell_transfer_baseline')})
        print('Safety allowance:',edc['buffer_working_hours'],'working hours; excluded from errors')
    else:
        print(edc)
    demand=report['demand']
    print('\nDEMAND |',demand.get('test_origins',0),'rolling 30-day test periods; reselect using earlier history at each origin')
    for category,result in demand.get('categories',{}).items():
        print('\n'+category+' | selected method: '+result['selected_method'])
        for key,unit in [('daily','bookings/day'),('total_30_days','bookings/30-day period')]:
            print(key+' ('+unit+')')
            table({name:result[key][name] for name in ('selected','recent_mean')})
        if 'peak_warnings' in result:
            print('Peak risk warnings (precision/recall/F1: higher is better; Brier: lower is better)')
            print(pd.DataFrame({n:result['peak_warnings'][n] for n in ('selected','constant','already_booked_only')}).T.to_string())
            context=result.get('peak_warning_known_booking_context',{})
            print('Peak days already identifiable from submitted requests at forecast time:',
                  context.get('days_already_above_peak_threshold_at_origin',0))
    if 'Status' in demand:
        print(demand)
    print('\n30-day totals have only',demand.get('test_origins',0),'test observations: results are preliminary.')
    print('Totals can hide errors in timing; they do not measure peak detection.')
    if demand.get('evaluation_note'):
        print(demand['evaluation_note'])
    print('MAE/RMSE: lower is better, in the units shown. wMAPE: lower percentage error is better.')
    print('R-squared: higher is better; negative means worse than the test-period mean benchmark.')


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path)
    parser.add_argument('--audits',action='store_true',help='Also run descriptive/service smoke checks')
    parser.add_argument('--details',action='store_true',help='Show all baselines, weekly/partial-period and peak diagnostics')
    parser.add_argument('--booking-snapshot',type=Path,help='Read bookings COPY data from a pg_dump without restoring or executing SQL')
    parser.add_argument('--demand-only',action='store_true',help='Skip EDC and its database connection')
    args=parser.parse_args()
    warnings.filterwarnings('ignore',message='pandas only supports SQLAlchemy')
    if not args.demand_only:
        print('Evaluating EDC working-duration predictions...',flush=True)
    report={'data_scope':'Synthetic history; not evidence of real-world accuracy','calendar_note':CALENDAR_NOTE,
            'edc':{'Status':'Skipped (--demand-only)'} if args.demand_only else validate_edc_linear_regression()}
    snapshot = None
    if args.booking_snapshot:
        from booking_snapshot import load_booking_snapshot
        snapshot=load_booking_snapshot(args.booking_snapshot)
        report['booking_source']='Local SQL snapshot (bookings COPY data only)'
    print('Evaluating demand totals and peak warnings at six final test origins...',flush=True)
    report['demand']=validate_peak_demand_time_series(booking_data=snapshot)
    if args.audits:
        report['service_smoke_checks']=validate_descriptive_and_decision_services()
    print_key_results(report)
    if args.details:
        print('\nDetailed diagnostics:')
        print(json.dumps(report,indent=2,allow_nan=False))
    if args.audits:
        print('Service smoke checks:',report['service_smoke_checks'])
    print('\nSynthetic history only. R-squared is not defined for constant actuals (shown as NaN/null).')
    print('MAPE excludes zero-demand observations; wMAPE includes their absolute errors.')
    if args.output:
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(json.dumps(report,indent=2,allow_nan=False)+'\n')
