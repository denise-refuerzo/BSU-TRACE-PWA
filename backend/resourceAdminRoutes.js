const {availability, lockSchedule, validateWindow} = require('./resourceScheduling');
const {sendBookingUpdateEmail} = require('./mailer');
module.exports = (app, pool, requireAuth, sendBookingEmail = sendBookingUpdateEmail) => {
  const gso = (req,res,next) => Number(req.user.a_id) === 4 ? next() : res.status(403).json({error:'GSO access required.'});
  const handle = fn => async(req,res) => {try {await fn(req,res);} catch(e) {res.status(400).json({error:e.code === '23503' ? 'This record is linked to requests or blocks and cannot be deleted. Keep it for history and mark it unavailable instead.' : e.code === '23505' ? 'That plate or license number is already registered.' : e.message});}};
  const broadcast = req => {
    const io = req.app?.get?.('io');
    io?.to('resource_updates_room').emit('resource-schedule-updated');
    io?.to('gso_admin_room').emit('system-metrics-updated');
  };
  const activeStatuses = "('Confirmed','Approved','Ongoing','Delayed','Rescheduled','Resource Reassigned')";
  async function assertNoUpcomingApproved(client, kind, id) {
    const resourceClause = kind === 'assets' ? 'gm.asd_id=$1' : kind === 'vehicles' ? 'vr.assigned_vehicle_id=$1' : 'vr.assigned_driver_id=$1';
    const result = await client.query(`SELECT count(*)::int AS count
      FROM public.bookings b LEFT JOIN public.gm_requirements gm USING(booking_id)
      LEFT JOIN public.vehicle_requirements vr USING(booking_id)
      WHERE ${resourceClause} AND b.status IN ${activeStatuses}
        AND b.reservation_date + COALESCE(gm.end_time,vr.drop_off_time) > timezone('Asia/Manila',now())
      `, [id]);
    const count = Number(result.rows[0]?.count || 0);
    if (count) {
      throw new Error(`Cannot set unavailable: ${count} upcoming approved ${count === 1 ? 'request is' : 'requests are'} assigned to this resource. Reassign, reschedule, or cancel ${count === 1 ? 'it' : 'them'} first.`);
    }
  }
  app.get('/api/resources/schedule-blocks',requireAuth,handle(async(req,res)=>{
    const result = await pool.query(`SELECT ab.block_id,ab.asd_id,ab.vehicle_id,ab.driver_id,ab.whole_day,ab.reason,
      to_char(ab.start_time,'YYYY-MM-DD"T"HH24:MI:SS') AS start_time,
      to_char(ab.end_time,'YYYY-MM-DD"T"HH24:MI:SS') AS end_time,
      ad.asset_name,ad.ast_id,f.vehicle_name,f.plate_number,d.full_name AS driver_name
      FROM public.asset_blackouts ab LEFT JOIN public.asset_details ad USING(asd_id)
      LEFT JOIN public.fleet_vehicles f ON f.vehicle_id=ab.vehicle_id
      LEFT JOIN public.resource_drivers d ON d.driver_id=ab.driver_id ORDER BY ab.start_time`);
    res.json(result.rows);
  }));
  app.post('/api/resources/schedule-blocks',requireAuth,gso,handle(async(req,res)=>{
    const {assetId,vehicleId,driverId,date,wholeDay,start,end,reason}=req.body;
    if(typeof reason !== 'string' || !reason.trim() || typeof wholeDay !== 'boolean') throw new Error('Enter a reason and blocking mode.');
    validateWindow(date,wholeDay ? '00:00' : start,wholeDay ? '23:59' : end);
    const client=await pool.connect();
    try {
      await client.query('BEGIN');await lockSchedule(client);
      const asset=driverId ? {rows:[]} : await client.query('SELECT ast_id,asset_name FROM public.asset_details WHERE asd_id=$1',[assetId]);
      if (driverId) {
        if (assetId || vehicleId) throw new Error('Select only one resource to block.');
        const driver=await client.query('SELECT 1 FROM public.resource_drivers WHERE driver_id=$1',[driverId]);
        if(!driver.rows.length) throw new Error('Select a registered driver.');
      } else if(!asset.rows.length || ![1,2,4].includes(asset.rows[0].ast_id)) throw new Error('Select a facility or vehicle.');
      if(asset.rows[0]?.ast_id===4) {
        const vehicle=await client.query('SELECT 1 FROM public.fleet_vehicles WHERE vehicle_id=$1 AND asd_id=$2',[vehicleId,assetId]);
        if(!vehicle.rows.length) throw new Error('Select an individual registered vehicle.');
      } else if(vehicleId) throw new Error('A facility block cannot target a vehicle.');
      const from = `${date}T${wholeDay?'00:00':start}`;
      const until = wholeDay ? `${new Date(Date.parse(date)+86400000).toISOString().slice(0,10)}T00:00` : `${date}T${end}`;
      const conflicts=await client.query(`SELECT count(*)::int AS count FROM public.bookings b
        LEFT JOIN public.gm_requirements gm USING(booking_id) LEFT JOIN public.vehicle_requirements vr USING(booking_id)
        WHERE b.status IN ('Confirmed','Approved','Ongoing','Delayed','Rescheduled','Resource Reassigned')
          AND (gm.asd_id=$1 OR ($4::integer IS NOT NULL AND (vr.assigned_vehicle_id=$4 OR vr.assigned_vehicle_id IS NULL)) OR vr.assigned_driver_id=$5)
        AND (b.reservation_date + COALESCE(gm.start_time,vr.pick_up_time)) < $3::timestamp
        AND (b.reservation_date + CASE WHEN vr.pick_up_time>=vr.drop_off_time THEN '23:59:59'::time ELSE COALESCE(gm.end_time,vr.drop_off_time) END) > $2::timestamp`,[assetId||null,from,until,vehicleId||null,driverId||null]);
      const conflictCount = Number(conflicts.rows[0]?.count || 0);
      if(conflictCount) throw new Error(`This block overlaps ${conflictCount} approved active ${conflictCount === 1 ? 'request' : 'requests'}. Coordinate with the ${conflictCount === 1 ? 'requester' : 'requesters'} and reassign, reschedule, or cancel ${conflictCount === 1 ? 'the request' : 'those requests'} before blocking this period.`);
      await client.query('INSERT INTO public.asset_blackouts(asd_id,vehicle_id,driver_id,start_time,end_time,reason,blocked_by,whole_day) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[assetId||null,vehicleId||null,driverId||null,from,until,reason.trim(),req.user.u_id,wholeDay]);
      let cancelled = [];
      if (asset.rows[0] && asset.rows[0].ast_id !== 4) {
        const pending = await client.query(`SELECT b.booking_id,b.public_id,b.purpose,b.status,u.uni_email,
          to_char(b.reservation_date,'YYYY-MM-DD') AS date,gm.start_time::text AS start,gm.end_time::text AS end
          FROM public.bookings b JOIN public.gm_requirements gm USING(booking_id)
          JOIN public."User" u ON u.u_id=b.u_id
          WHERE gm.asd_id=$1 AND b.status IN ('Pending','Reserved')
            AND b.reservation_date + gm.start_time < $3::timestamp
            AND b.reservation_date + gm.end_time > $2::timestamp
          FOR UPDATE OF b`,[assetId,from,until]);
        cancelled = pending.rows;
        for (const booking of cancelled) {
          const explanation = `${asset.rows[0].asset_name} is blocked for the requested date and time. Reason: ${reason.trim()}`;
          await client.query("UPDATE public.bookings SET status='Cancelled',updated_at=timezone('Asia/Manila',now()) WHERE booking_id=$1",[booking.booking_id]);
          await client.query(`INSERT INTO public.booking_status_updates
            (booking_id,previous_status,new_status,reason,notification_message,previous_date,new_date,previous_start,new_start,previous_end,new_end,updated_by)
            VALUES($1,$2,'Cancelled',$3,$4,$5,$5,$6,$6,$7,$7,$8)`,
            [booking.booking_id,booking.status,explanation,`Your request for this facility was cancelled because it is blocked for the requested time. Reason: ${explanation}`,booking.date,booking.start,booking.end,req.user.u_id]);
        }
      }
      await client.query('COMMIT');broadcast(req);
      for (const booking of cancelled) {
        if (!booking.uni_email) continue;
        try { await sendBookingEmail(booking.uni_email,{bookingType:asset.rows[0].ast_id===1?'Room':'Gymnasium',purpose:booking.purpose,status:'Cancelled',date:booking.date,start:booking.start,end:booking.end,reason:`${asset.rows[0].asset_name} is blocked for the requested date and time. Reason: ${reason.trim()}`,message:`Your request for ${asset.rows[0].asset_name} was cancelled because it is blocked at the requested date and time.`}); }
        catch(error) { console.error('Block cancellation email failed:',error); }
      }
      res.status(201).json({message:`Blocked period saved. ${cancelled.length} pending request(s) cancelled.`});
    } catch(e) {await client.query('ROLLBACK');throw e;} finally {client.release();}
  }));
  app.delete('/api/resources/schedule-blocks/:id',requireAuth,gso,handle(async(req,res)=>{
    await pool.query('DELETE FROM public.asset_blackouts WHERE block_id=$1',[req.params.id]);broadcast(req);res.json({message:'Block removed.'});
  }));
  app.put('/api/resources/registry/assets/:id/active',requireAuth,gso,handle(async(req,res)=>{
    if(typeof req.body.active!=='boolean') throw new Error('Invalid availability update.');
    const client=await pool.connect();
    try {
      await client.query('BEGIN');await lockSchedule(client);
      if (!req.body.active) await assertNoUpcomingApproved(client,'assets',req.params.id);
      const result=await client.query(`UPDATE public.asset_details SET is_active=$1 WHERE asd_id=$2 AND ast_id IN (1,2) RETURNING asset_name`,[req.body.active,req.params.id]);
      if(!result.rows.length) throw new Error('Room or facility not found.');
      await client.query('COMMIT');broadcast(req);
      res.json({message:`${result.rows[0].asset_name} marked ${req.body.active?'available':'unavailable'}.`});
    } catch(e) {await client.query('ROLLBACK');throw e;} finally {client.release();}
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
      WHERE b.booking_type IN ('Vehicle','Room','Gymnasium')
        AND b.status IN ('Confirmed','Approved','Ongoing','Delayed','Rescheduled','Resource Reassigned')
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
    let booking,newDate,newStart,newEnd,message,affectedBooking=null,affectedNotice=null;
    try {
      await client.query('BEGIN');await lockSchedule(client);
      const found=await client.query(`SELECT b.booking_id,b.booking_type,b.status,b.purpose,to_char(b.reservation_date,'YYYY-MM-DD') AS reservation_date,
        COALESCE(gm.start_time,vr.pick_up_time)::text AS start_time,
        COALESCE(gm.end_time,vr.drop_off_time)::text AS end_time,gm.asd_id AS facility_id,
        vr.asd_id AS vehicle_asset_id,vr.assigned_vehicle_id,ad.asset_name,u.full_name,u.uni_email AS requestor_email
        FROM public.bookings b JOIN public."User" u ON u.u_id=b.u_id
        LEFT JOIN public.gm_requirements gm USING(booking_id) LEFT JOIN public.vehicle_requirements vr USING(booking_id)
        LEFT JOIN public.asset_details ad ON ad.asd_id=COALESCE(gm.asd_id,vr.asd_id)
        WHERE b.public_id=$1 FOR UPDATE OF b`,[req.params.id]);
      if(!found.rows.length) throw new Error('Booking not found.');
      booking=found.rows[0];
      if(!['Confirmed','Approved','Ongoing','Delayed','Rescheduled','Resource Reassigned'].includes(booking.status)) throw new Error('Only approved or active bookings can be managed.');

      newDate=booking.reservation_date;
      newStart=booking.start_time;
      newEnd=booking.end_time;
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
      message=nextStatus==='Completed'
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
        const affected=await client.query(`SELECT b.booking_id,b.booking_type,b.purpose,b.status,
          to_char(b.reservation_date,'YYYY-MM-DD') AS reservation_date,
          COALESCE(gm.start_time,vr.pick_up_time) AS start_time,COALESCE(gm.end_time,vr.drop_off_time) AS end_time,
          u.uni_email AS requestor_email
          FROM public.bookings b LEFT JOIN public.gm_requirements gm USING(booking_id)
          LEFT JOIN public.vehicle_requirements vr USING(booking_id)
          JOIN public."User" u ON u.u_id=b.u_id
          WHERE b.booking_id<>$1 AND b.reservation_date=$2::date
          AND b.status IN ('Confirmed','Approved','Ongoing','Delayed','Rescheduled','Resource Reassigned')
          AND (($3::integer IS NOT NULL AND gm.asd_id=$3) OR ($4::integer IS NOT NULL AND vr.assigned_vehicle_id=$4))
          AND COALESCE(gm.start_time,vr.pick_up_time)>=$5::time
          AND COALESCE(gm.start_time,vr.pick_up_time)<$6::time
          ORDER BY COALESCE(gm.start_time,vr.pick_up_time) LIMIT 1`,[booking.booking_id,booking.reservation_date,
          booking.facility_id||null,booking.booking_type==='Vehicle' ? booking.assigned_vehicle_id : null,booking.start_time,newEnd]);
        if(affected.rows[0]) {
          const next=affected.rows[0];
          affectedNotice=`The previous ${subject} “${booking.purpose}” was delayed due to: ${reason}. Your upcoming booking may be affected. Contact the GSO Office for further updates.`;
          affectedBooking=next;
          await client.query(`INSERT INTO public.booking_status_updates
            (booking_id,previous_status,new_status,reason,notification_message,previous_date,new_date,previous_start,new_start,previous_end,new_end,updated_by)
            VALUES($1,$2,$2,$3,$4,$5,$5,$6,$6,$7,$7,$8)`,[next.booking_id,next.status,reason,affectedNotice,next.reservation_date,next.start_time,next.end_time,req.user.u_id]);
        }
      }
      await client.query('COMMIT');
    } catch(e) {await client.query('ROLLBACK');throw e;} finally {client.release();}
    broadcast(req);
    let emailSent = false;
    const notices = [
      [booking.requestor_email, {bookingType:booking.booking_type,purpose:booking.purpose,status:nextStatus,
        date:newDate,start:newStart,end:newEnd,reason,message}],
      [affectedBooking?.requestor_email, affectedBooking && {bookingType:affectedBooking.booking_type,
        purpose:affectedBooking.purpose,status:'Schedule alert',date:affectedBooking.reservation_date,
        start:affectedBooking.start_time,end:affectedBooking.end_time,reason,message:affectedNotice}]
    ];
    for (const [index, [email, details]] of notices.entries()) {
      if (!email || !details) continue;
      try {
        const sent = await sendBookingEmail(email, details);
        if (index === 0) emailSent = sent?.success !== false;
        if (sent?.success === false) console.error(`Booking update email failed for booking ${booking.booking_id}.`);
      } catch (error) {
        console.error(`Booking update email failed for booking ${booking.booking_id}:`, error);
      }
    }
    res.json({message:emailSent?'Booking updated successfully.':'Booking updated, but the notification email could not be sent.',notification:message,emailSent});
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
        if (!active) await assertNoUpcomingApproved(client,req.params.kind,req.params.id);
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
