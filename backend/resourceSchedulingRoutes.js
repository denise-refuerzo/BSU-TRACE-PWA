const {availability, lockSchedule, validateWindow} = require('./resourceScheduling');
module.exports = function registerScheduling(app, pool, requireAuth) {
  const gso = (req,res,next) => Number(req.user.a_id) === 4 ? next() : res.status(403).json({error:'GSO administrator access required.'});
  const handle = fn => async (req,res) => {try {await fn(req,res);} catch(error) {res.status(error.status || 400).json({error:error.message});}};
  const broadcast = req => {
    const io = req.app?.get?.('io');
    io?.to('resource_updates_room').emit('resource-schedule-updated');
    io?.to('gso_admin_room').emit('system-metrics-updated');
  };
  app.get('/api/resources/availability', requireAuth, handle(async(req,res)=>{
    const free = await availability(pool, req.query);
    res.json({available:free.available, reason:free.reason, vehicleCount:free.vehicles?.length, driverCount:free.drivers?.length});
  }));
  app.get('/api/resources/fleet', requireAuth, gso, handle(async(req,res)=>{
    const vehicles=await pool.query('SELECT * FROM public.fleet_vehicles ORDER BY vehicle_name');
    const drivers=await pool.query('SELECT * FROM public.resource_drivers ORDER BY full_name');
    const requests=await pool.query(`SELECT b.public_id AS booking_id,b.status,to_char(b.reservation_date,'YYYY-MM-DD') AS date,b.purpose,
      vr.pick_up_time::text AS start,vr.drop_off_time::text AS end,vr.assigned_vehicle_id,vr.assigned_driver_id,u.full_name
      FROM public.bookings b JOIN public.vehicle_requirements vr USING (booking_id) JOIN public."User" u ON u.u_id=b.u_id
      WHERE b.reservation_date >= CURRENT_DATE ORDER BY b.reservation_date,vr.pick_up_time`);
    res.json({vehicles:vehicles.rows,drivers:drivers.rows,requests:requests.rows});
  }));
  app.post('/api/resources/fleet/:kind',requireAuth,gso,handle(async(req,res)=>{
    if(req.params.kind === 'vehicles') {
      const {name,number}=req.body;
      if(typeof name !== 'string' || !name.trim() || typeof number !== 'string' || !number.trim()) throw new Error('Enter a vehicle name and plate number.');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const asset = await client.query('INSERT INTO public.asset_details(ast_id,asset_name,quantity) VALUES(4,$1,1) RETURNING asd_id',[name.trim()]);
        await client.query('INSERT INTO public.fleet_vehicles(asd_id,vehicle_name,plate_number) VALUES($1,$2,$3)',[asset.rows[0].asd_id,name.trim(),number.trim().toUpperCase()]);
        await client.query('COMMIT');
      } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    } else if(req.params.kind === 'drivers') {
      const {name,number}=req.body;
      if(typeof name !== 'string' || !name.trim() || typeof number !== 'string' || !number.trim()) throw new Error('Enter a driver name and license number.');
      await pool.query('INSERT INTO public.resource_drivers(full_name,license_number) VALUES($1,$2)',[name.trim(),number.trim().toUpperCase()]);
    } else throw new Error('Unknown registry.');
    broadcast(req);res.status(201).json({message:'Registered successfully.'});
  }));
  app.put('/api/resources/fleet/:kind/:id/active',requireAuth,gso,handle(async(req,res)=>{
    const tables={vehicles:['fleet_vehicles','vehicle_id'],drivers:['resource_drivers','driver_id']};
    const table=tables[req.params.kind];
    if(!table || typeof req.body.active !== 'boolean') throw new Error('Invalid availability update.');
    const client=await pool.connect();
    try {await client.query('BEGIN');await lockSchedule(client);
      await client.query(`UPDATE public.${table[0]} SET is_active=$1 WHERE ${table[1]}=$2`,[req.body.active,req.params.id]);
      await client.query('COMMIT');broadcast(req);res.json({message:'Availability updated. Existing approved assignments still need to be honored or reassigned.'});
    } catch(e) {await client.query('ROLLBACK');throw e;} finally {client.release();}
  }));
  app.get('/api/resources/assignments/:id/options',requireAuth,gso,handle(async(req,res)=>{
    const result=await pool.query(`SELECT b.booking_id,to_char(b.reservation_date,'YYYY-MM-DD') AS date,vr.pick_up_time::text AS start,vr.drop_off_time::text AS end
      FROM public.bookings b JOIN public.vehicle_requirements vr USING(booking_id) WHERE b.public_id=$1`,[req.params.id]);
    if(!result.rows.length) throw new Error('Vehicle request not found.');
    res.json(await availability(pool,{...result.rows[0],...(req.query.start && req.query.end ? {start:req.query.start,end:req.query.end} : {}),type:'Vehicle',exclude:result.rows[0].booking_id,allowLegacy:true}));
  }));
  app.get('/api/resources/available-facilities',requireAuth,handle(async(req,res)=>{
    const type=String(req.query.type||'');
    const dates=String(req.query.dates||'').split(',').filter(Boolean);
    const start=String(req.query.start||''); const end=String(req.query.end||'');
    if(!['Room','Gymnasium'].includes(type)||!dates.length) throw new Error('Select a facility type and schedule.');
    dates.forEach(date=>validateWindow(date,start,end));
    const assets=await pool.query('SELECT asd_id,asset_name FROM public.asset_details WHERE ast_id=$1 AND is_active=true ORDER BY asset_name',[type==='Room'?1:2]);
    const available=[];
    for(const asset of assets.rows){
      const conflicts=await pool.query(`SELECT 1 FROM unnest($2::date[]) requested(day)
        WHERE EXISTS(SELECT 1 FROM public.asset_blackouts ab WHERE ab.asd_id=$1
          AND ab.start_time < (requested.day+$4::time) AND ab.end_time > (requested.day+$3::time))
        OR EXISTS(SELECT 1 FROM public.bookings b JOIN public.gm_requirements gm USING(booking_id)
          WHERE gm.asd_id=$1 AND b.reservation_date=requested.day
          AND b.status IN ('Confirmed','Approved','Ongoing','Delayed','Rescheduled','Resource Reassigned')
          AND gm.start_time<$4::time AND gm.end_time>$3::time) LIMIT 1`,[asset.asd_id,dates,start,end]);
      if(!conflicts.rows.length) available.push(asset);
    }
    res.json(available);
  }));
  app.put('/api/resources/assignments/:id', requireAuth, gso, handle(async (req, res) => {
    const bookingPublicId = String(req.params.id || '');
    const vehicleId = Number(req.body.vehicleId);
    const driverId = Number(req.body.driverId);

    if (!bookingPublicId || !vehicleId || !driverId) {
      throw new Error('Valid vehicle and driver selections are required.');
    }

    let startTime = String(req.body.start || '').trim();
    let endTime = String(req.body.end || '').trim();
    if (startTime.length === 5) startTime += ':00';
    if (endTime.length === 5) endTime += ':00';

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await lockSchedule(client);

      const result = await client.query(
         `SELECT b.booking_id,b.status,b.purpose,
                 to_char(b.reservation_date,'YYYY-MM-DD') AS date,
                 vr.pick_up_time::text AS start,
                 vr.drop_off_time::text AS end,
                 vr.assigned_vehicle_id,vr.assigned_driver_id,
                 vr.vehicle_to_be_used,vr.designated_driver
         FROM public.bookings b 
         JOIN public.vehicle_requirements vr USING (booking_id) 
         WHERE b.public_id = $1 FOR UPDATE OF b`,
        [bookingPublicId]
      );

      if (!result.rows.length) throw new Error('Vehicle request not found.');
      const bookingId = result.rows[0].booking_id;

      // Enforce confirmation requirement before assignment
      if (!['Confirmed','Approved','Ongoing','Delayed','Rescheduled','Resource Reassigned'].includes(result.rows[0].status)) {
        throw new Error('This request must be approved through document checklist verification before assigning a vehicle and driver.');
      }

      const window = {
        date: result.rows[0].date,
        start: startTime || result.rows[0].start,
        end: endTime || result.rows[0].end
      };

      const free = await availability(client, { ...window, type: 'Vehicle', exclude: bookingId, allowLegacy: true });
      if (!free.vehicles.some(v => Number(v.vehicle_id) === vehicleId) || 
          !free.drivers.some(d => Number(d.driver_id) === driverId)) {
        throw new Error('The selected vehicle or driver is not available for this time window.');
      }

      const vehicleRow = await client.query('SELECT asd_id, vehicle_name, plate_number FROM public.fleet_vehicles WHERE vehicle_id = $1', [vehicleId]);
      const driverRow = await client.query('SELECT full_name, license_number FROM public.resource_drivers WHERE driver_id = $1', [driverId]);

      if (!vehicleRow.rows.length || !driverRow.rows.length) {
        throw new Error('Could not resolve vehicle or driver record.');
      }

      const v = vehicleRow.rows[0];
      const d = driverRow.rows[0];
      const wasAssigned = Boolean(result.rows[0].assigned_vehicle_id && result.rows[0].assigned_driver_id);
      const changed = Number(result.rows[0].assigned_vehicle_id) !== vehicleId || Number(result.rows[0].assigned_driver_id) !== driverId;

      await client.query(
        `UPDATE public.vehicle_requirements 
         SET assigned_vehicle_id = $1,
             assigned_driver_id = $2,
             pick_up_time = $3::time,
             drop_off_time = $4::time,
             asd_id = $5,
             vehicle_to_be_used = $6,
             plate_number = $7,
             designated_driver = $8,
             license_number = $9
         WHERE booking_id = $10`,
        [vehicleId, driverId, window.start, window.end, v.asd_id, v.vehicle_name, v.plate_number, d.full_name, d.license_number, bookingId]
      );

      if (wasAssigned && changed) {
        const notice=`The assigned vehicle or driver for the trip “${result.rows[0].purpose}” was changed from ${result.rows[0].vehicle_to_be_used} / ${result.rows[0].designated_driver} to ${v.vehicle_name} / ${d.full_name}. Contact the GSO Office for any concerns.`;
        await client.query("UPDATE public.bookings SET status='Resource Reassigned',updated_at=timezone('Asia/Manila',now()) WHERE booking_id=$1",[bookingId]);
        await client.query(`INSERT INTO public.booking_status_updates
          (booking_id,previous_status,new_status,reason,notification_message,previous_date,new_date,previous_start,new_start,previous_end,new_end,updated_by)
          VALUES($1,$2,'Resource Reassigned',$3,$4,$5,$5,$6,$6,$7,$7,$8)`,[bookingId,result.rows[0].status,'Vehicle or driver reassigned by GSO.',notice,window.date,window.start,window.end,req.user.u_id]);
      }

      await client.query('COMMIT');
      broadcast(req);
      res.json({ message: wasAssigned && changed ? 'Vehicle and driver reassigned successfully.' : 'Vehicle and driver assigned successfully.' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }));
};
