const {availability, lockSchedule, validateWindow} = require('./resourceScheduling');
module.exports = (app, pool, requireAuth) => {
  const gso = (req,res,next) => Number(req.user.a_id) === 4 ? next() : res.status(403).json({error:'GSO access required.'});
  const handle = fn => async(req,res) => {try {await fn(req,res);} catch(e) {res.status(400).json({error:e.code === '23503' ? 'This record is linked to requests or blocks and cannot be deleted. Keep it for history and mark it unavailable instead.' : e.code === '23505' ? 'That plate or license number is already registered.' : e.message});}};
  const broadcast = req => {
    const io = req.app?.get?.('io');
    io?.to('resource_updates_room').emit('resource-schedule-updated');
    io?.to('gso_admin_room').emit('system-metrics-updated');
  };
  app.get('/api/resources/schedule-blocks',requireAuth,handle(async(req,res)=>{
    const result = await pool.query(`SELECT ab.block_id,ab.asd_id,ab.vehicle_id,ab.whole_day,ab.reason,
      to_char(ab.start_time,'YYYY-MM-DD"T"HH24:MI:SS') AS start_time,
      to_char(ab.end_time,'YYYY-MM-DD"T"HH24:MI:SS') AS end_time,
      ad.asset_name,ad.ast_id,f.vehicle_name,f.plate_number
      FROM public.asset_blackouts ab JOIN public.asset_details ad USING(asd_id)
      LEFT JOIN public.fleet_vehicles f ON f.vehicle_id=ab.vehicle_id ORDER BY ab.start_time`);
    res.json(result.rows);
  }));
  app.post('/api/resources/schedule-blocks',requireAuth,gso,handle(async(req,res)=>{
    const {assetId,vehicleId,date,wholeDay,start,end,reason}=req.body;
    if(typeof reason !== 'string' || !reason.trim() || typeof wholeDay !== 'boolean') throw new Error('Enter a reason and blocking mode.');
    validateWindow(date,wholeDay ? '00:00' : start,wholeDay ? '23:59' : end);
    const client=await pool.connect();
    try {
      await client.query('BEGIN');await lockSchedule(client);
      const asset=await client.query('SELECT ast_id FROM public.asset_details WHERE asd_id=$1',[assetId]);
      if(!asset.rows.length || ![1,2,4].includes(asset.rows[0].ast_id)) throw new Error('Select a facility or vehicle.');
      if(asset.rows[0].ast_id===4) {
        const vehicle=await client.query('SELECT 1 FROM public.fleet_vehicles WHERE vehicle_id=$1 AND asd_id=$2',[vehicleId,assetId]);
        if(!vehicle.rows.length) throw new Error('Select an individual registered vehicle.');
      } else if(vehicleId) throw new Error('A facility block cannot target a vehicle.');
      const from = `${date}T${wholeDay?'00:00':start}`;
      const until = wholeDay ? `${new Date(Date.parse(date)+86400000).toISOString().slice(0,10)}T00:00` : `${date}T${end}`;
      const conflicts=await client.query(`SELECT 1 FROM public.bookings b
        LEFT JOIN public.gm_requirements gm USING(booking_id) LEFT JOIN public.vehicle_requirements vr USING(booking_id)
        WHERE b.status IN ('Confirmed','Approved','Ongoing','Delayed','Rescheduled','Resource Reassigned') AND (gm.asd_id=$1 OR (vr.asd_id=$1 AND ($4::integer IS NULL OR vr.assigned_vehicle_id=$4 OR vr.assigned_vehicle_id IS NULL)))
        AND (b.reservation_date + COALESCE(gm.start_time,vr.pick_up_time)) < $3::timestamp
        AND (b.reservation_date + CASE WHEN vr.pick_up_time>=vr.drop_off_time THEN '23:59:59'::time ELSE COALESCE(gm.end_time,vr.drop_off_time) END) > $2::timestamp LIMIT 1`,[assetId,from,until,vehicleId||null]);
      if(conflicts.rows.length) throw new Error('This block overlaps an approved active request. Reassign the vehicle or resolve the request before blocking this period.');
      await client.query('INSERT INTO public.asset_blackouts(asd_id,vehicle_id,start_time,end_time,reason,blocked_by,whole_day) VALUES($1,$2,$3,$4,$5,$6,$7)',[assetId,vehicleId||null,from,until,reason.trim(),req.user.u_id,wholeDay]);
      await client.query('COMMIT');broadcast(req);res.status(201).json({message:'Blocked period saved.'});
    } catch(e) {await client.query('ROLLBACK');throw e;} finally {client.release();}
  }));
  app.delete('/api/resources/schedule-blocks/:id',requireAuth,gso,handle(async(req,res)=>{
    await pool.query('DELETE FROM public.asset_blackouts WHERE block_id=$1',[req.params.id]);broadcast(req);res.json({message:'Block removed.'});
  }));
  app.put('/api/resources/registry/assets/:id/active',requireAuth,gso,handle(async(req,res)=>{
    if(typeof req.body.active!=='boolean') throw new Error('Invalid availability update.');
    const result=await pool.query(`UPDATE public.asset_details SET is_active=$1
      WHERE asd_id=$2 AND ast_id IN (1,2) RETURNING asset_name`,[req.body.active,req.params.id]);
    if(!result.rows.length) throw new Error('Room or facility not found.');
    broadcast(req);
    res.json({message:`${result.rows[0].asset_name} marked ${req.body.active?'available':'unavailable'}. Existing approved bookings remain visible and should be reassigned or rescheduled if necessary.`});
  }));

  app.get('/api/resources/manage-bookings',requireAuth,gso,handle(async(req,res)=>{
    const result=await pool.query(`SELECT b.public_id AS booking_id,b.booking_type,b.purpose,b.status,
      to_char(b.reservation_date,'YYYY-MM-DD') AS reservation_date,u.full_name AS requestor,u.uni_email AS requestor_email,
      COALESCE(gm.start_time,vr.pick_up_time)::text AS start_time,
      COALESCE(gm.end_time,vr.drop_off_time)::text AS end_time,
      ad.asset_name,vr.destination,vr.assigned_vehicle_id,vr.assigned_driver_id,
      vr.vehicle_to_be_used,vr.designated_driver,
      latest.reason AS latest_reason,latest.notification_message AS latest_notification,
      latest.created_at AS latest_update_at
      FROM public.bookings b JOIN public."User" u ON u.u_id=b.u_id
      LEFT JOIN public.gm_requirements gm USING(booking_id)
      LEFT JOIN public.vehicle_requirements vr USING(booking_id)
      LEFT JOIN public.asset_details ad ON ad.asd_id=COALESCE(gm.asd_id,vr.asd_id)
      LEFT JOIN LATERAL (SELECT reason,notification_message,created_at FROM public.booking_status_updates
        WHERE booking_id=b.booking_id ORDER BY created_at DESC LIMIT 1) latest ON true
      WHERE b.status IN ('Confirmed','Approved','Ongoing','Delayed','Rescheduled','Resource Reassigned')
      ORDER BY b.reservation_date,COALESCE(gm.start_time,vr.pick_up_time)`);
    res.json(result.rows.map(row=>({...row,status:row.status==='Confirmed'?'Approved':row.status})));
  }));

  app.put('/api/resources/manage-bookings/:id',requireAuth,gso,handle(async(req,res)=>{
    const nextStatus=String(req.body.status||'').trim();
    const reason=String(req.body.reason||'').trim();
    const allowed=new Set(['Delayed','Rescheduled','Cancelled','Completed']);
    if(!allowed.has(nextStatus)) throw new Error('Select a valid booking update.');
    if(nextStatus!=='Completed'&&!reason) throw new Error('Enter the reason for this booking update.');
    const client=await pool.connect();
    try {
      await client.query('BEGIN');await lockSchedule(client);
      const found=await client.query(`SELECT b.booking_id,b.booking_type,b.status,b.purpose,to_char(b.reservation_date,'YYYY-MM-DD') AS reservation_date,
        COALESCE(gm.start_time,vr.pick_up_time)::text AS start_time,
        COALESCE(gm.end_time,vr.drop_off_time)::text AS end_time,gm.asd_id AS facility_id,
        vr.asd_id AS vehicle_asset_id,vr.assigned_vehicle_id,ad.asset_name,u.full_name
        FROM public.bookings b JOIN public."User" u ON u.u_id=b.u_id
        LEFT JOIN public.gm_requirements gm USING(booking_id) LEFT JOIN public.vehicle_requirements vr USING(booking_id)
        LEFT JOIN public.asset_details ad ON ad.asd_id=COALESCE(gm.asd_id,vr.asd_id)
        WHERE b.public_id=$1 FOR UPDATE OF b`,[req.params.id]);
      if(!found.rows.length) throw new Error('Booking not found.');
      const booking=found.rows[0];
      if(!['Confirmed','Approved','Ongoing','Delayed','Rescheduled','Resource Reassigned'].includes(booking.status)) throw new Error('Only approved or active bookings can be managed.');

      let newDate=booking.reservation_date;
      let newStart=booking.start_time;
      let newEnd=booking.end_time;
      if(nextStatus==='Delayed') {
        newStart=String(req.body.start||'').trim();
        newEnd=String(req.body.end||'').trim();
        validateWindow(booking.reservation_date,newStart,newEnd);
      }
      if(nextStatus==='Rescheduled') {
        newDate=String(req.body.date||'').trim();
        newStart=String(req.body.start||'').trim();
        newEnd=String(req.body.end||'').trim();
        validateWindow(newDate,newStart,newEnd);
      }
      if(['Delayed','Rescheduled'].includes(nextStatus)) {
        const free=await availability(client,{date:newDate,start:newStart,end:newEnd,type:booking.booking_type,
          assetName:booking.asset_name,exclude:booking.booking_id,allowLegacy:true});
        if(!free.available) throw new Error(free.reason||'The revised schedule conflicts with another booking.');
        await client.query('UPDATE public.bookings SET reservation_date=$1 WHERE booking_id=$2',[newDate,booking.booking_id]);
        if(booking.booking_type==='Vehicle') await client.query('UPDATE public.vehicle_requirements SET pick_up_time=$1,drop_off_time=$2 WHERE booking_id=$3',[newStart,newEnd,booking.booking_id]);
        else await client.query('UPDATE public.gm_requirements SET start_time=$1,end_time=$2 WHERE booking_id=$3',[newStart,newEnd,booking.booking_id]);
      }

      const subject=booking.booking_type==='Vehicle'?'trip':'event';
      const displayStatus=nextStatus.toLowerCase();
      const message=nextStatus==='Completed'
        ? `The ${subject} “${booking.purpose}” has been marked completed.`
        : nextStatus==='Rescheduled'
          ? `The ${subject} “${booking.purpose}” was rescheduled to ${newDate}, ${String(newStart).slice(0,5)}–${String(newEnd).slice(0,5)}, due to: ${reason}. Contact the GSO Office for any concerns.`
          : nextStatus==='Delayed'
            ? `The ${subject} “${booking.purpose}” was delayed. Its revised time is ${String(newStart).slice(0,5)}–${String(newEnd).slice(0,5)} due to: ${reason}. Contact the GSO Office for further updates.`
            : `The ${subject} “${booking.purpose}” was ${displayStatus} due to: ${reason}. Contact the GSO Office for any concerns.`;
      await client.query("UPDATE public.bookings SET status=$1,updated_at=timezone('Asia/Manila',now()) WHERE booking_id=$2",[nextStatus,booking.booking_id]);
      await client.query(`INSERT INTO public.booking_status_updates
        (booking_id,previous_status,new_status,reason,notification_message,previous_date,new_date,previous_start,new_start,previous_end,new_end,updated_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,[booking.booking_id,booking.status,nextStatus,reason||null,message,
        booking.reservation_date,newDate,booking.start_time,newStart,booking.end_time,newEnd,req.user.u_id]);
      if(nextStatus==='Delayed') {
        const affected=await client.query(`SELECT b.booking_id,b.status,b.reservation_date,
          COALESCE(gm.start_time,vr.pick_up_time) AS start_time,COALESCE(gm.end_time,vr.drop_off_time) AS end_time
          FROM public.bookings b LEFT JOIN public.gm_requirements gm USING(booking_id)
          LEFT JOIN public.vehicle_requirements vr USING(booking_id)
          WHERE b.booking_id<>$1 AND b.reservation_date=$2::date
          AND b.status IN ('Confirmed','Approved','Ongoing','Delayed','Rescheduled','Resource Reassigned')
          AND (($3::integer IS NOT NULL AND gm.asd_id=$3) OR ($4::integer IS NOT NULL AND vr.assigned_vehicle_id=$4))
          AND COALESCE(gm.start_time,vr.pick_up_time)>=$5::time
          AND COALESCE(gm.start_time,vr.pick_up_time)<$6::time
          ORDER BY COALESCE(gm.start_time,vr.pick_up_time) LIMIT 1`,[booking.booking_id,booking.reservation_date,
          booking.facility_id||null,booking.booking_type==='Vehicle' ? booking.assigned_vehicle_id : null,booking.start_time,newEnd]);
        if(affected.rows[0]) {
          const next=affected.rows[0];
          const affectedNotice=`The previous ${subject} “${booking.purpose}” was delayed due to: ${reason}. Your upcoming booking may be affected. Contact the GSO Office for further updates.`;
          await client.query(`INSERT INTO public.booking_status_updates
            (booking_id,previous_status,new_status,reason,notification_message,previous_date,new_date,previous_start,new_start,previous_end,new_end,updated_by)
            VALUES($1,$2,$2,$3,$4,$5,$5,$6,$6,$7,$7,$8)`,[next.booking_id,next.status,reason,affectedNotice,next.reservation_date,next.start_time,next.end_time,req.user.u_id]);
        }
      }
      await client.query('COMMIT');broadcast(req);res.json({message:'Booking updated successfully.',notification:message});
    } catch(e) {await client.query('ROLLBACK');throw e;} finally {client.release();}
  }));
  app.put('/api/resources/registry/:kind/:id',requireAuth,gso,handle(async(req,res)=>{
    const {name,number,quantity,active,assetTypeId}=req.body;
    if(typeof name!=='string'||!name.trim()) throw new Error('Enter a name.');
    const client=await pool.connect();
    try {
      await client.query('BEGIN');await lockSchedule(client);
      if(req.params.kind==='assets') {
        if(!Number.isInteger(Number(quantity))||Number(quantity)<1) throw new Error('Quantity must be a positive whole number.');
        if(assetTypeId !== undefined) {
          const current=await client.query('SELECT ast_id FROM public.asset_details WHERE asd_id=$1',[req.params.id]);
          if(!current.rows.length)throw new Error('Asset not found.');
          if(Number(assetTypeId)!==current.rows[0].ast_id) {
            if(![1,2,3].includes(Number(assetTypeId))||current.rows[0].ast_id===4)throw new Error('Use the vehicle registry for vehicle details.');
            const linked=await client.query('SELECT 1 FROM public.gm_requirements WHERE asd_id=$1 UNION ALL SELECT 1 FROM public.asset_blackouts WHERE asd_id=$1',[req.params.id]);
            if(linked.rows.length)throw new Error('The resource type cannot change while linked to requests or blocked periods.');
            await client.query('UPDATE public.asset_details SET ast_id=$1 WHERE asd_id=$2',[Number(assetTypeId),req.params.id]);
          }
        }
        await client.query('UPDATE public.asset_details SET asset_name=$1,quantity=$2 WHERE asd_id=$3',[name.trim(),quantity,req.params.id]);
      } else if(['vehicles','drivers'].includes(req.params.kind)) {
        if(typeof number!=='string'||!number.trim()||typeof active!=='boolean') throw new Error('Enter the plate/license number and availability.');
        const vehicle=req.params.kind==='vehicles';
        await client.query(vehicle ? 'UPDATE public.fleet_vehicles SET vehicle_name=$1,plate_number=$2,is_active=$3 WHERE vehicle_id=$4' : 'UPDATE public.resource_drivers SET full_name=$1,license_number=$2,is_active=$3 WHERE driver_id=$4',[name.trim(),number.trim().toUpperCase(),active,req.params.id]);
      } else throw new Error('Unknown registry.');
      await client.query('COMMIT');broadcast(req);res.json({message:'Details updated.'});
    } catch(e) {await client.query('ROLLBACK');throw e;} finally {client.release();}
  }));
  app.delete('/api/resources/registry/:kind/:id',requireAuth,gso,handle(async(req,res)=>{
    const tables={assets:['asset_details','asd_id'],vehicles:['fleet_vehicles','vehicle_id'],drivers:['resource_drivers','driver_id']};
    const target=tables[req.params.kind];if(!target) throw new Error('Unknown registry.');
    const client=await pool.connect();
    try {
      await client.query('BEGIN');await lockSchedule(client);
      const result=await client.query(`DELETE FROM public.${target[0]} WHERE ${target[1]}=$1 RETURNING *`,[req.params.id]);
      if(!result.rows.length)throw new Error('Record not found.');
      if(req.params.kind==='vehicles') {
        const assetId=result.rows[0].asd_id;
        const remaining=await client.query('SELECT 1 FROM public.fleet_vehicles WHERE asd_id=$1',[assetId]);
        // Keep the asset if it still has fleet members or historical relationships.
        if(!remaining.rows.length) await client.query(`DELETE FROM public.asset_details ad WHERE ad.asd_id=$1
          AND NOT EXISTS(SELECT 1 FROM public.vehicle_requirements WHERE asd_id=$1)
          AND NOT EXISTS(SELECT 1 FROM public.asset_blackouts WHERE asd_id=$1)
          AND NOT EXISTS(SELECT 1 FROM public.gm_requirements WHERE asd_id=$1)`,[assetId]);
      }
      await client.query('COMMIT');broadcast(req);res.json({message:'Record deleted.'});
    } catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  }));
};
