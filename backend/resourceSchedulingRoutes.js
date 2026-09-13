const {availability, lockSchedule} = require('./resourceScheduling');
module.exports = function registerScheduling(app, pool, requireAuth) {
  const gso = (req,res,next) => Number(req.user.a_id) === 4 ? next() : res.status(403).json({error:'GSO administrator access required.'});
  const handle = fn => async (req,res) => {try {await fn(req,res);} catch(error) {res.status(error.status || 400).json({error:error.message});}};
  app.get('/api/resources/availability', requireAuth, handle(async(req,res)=>{
    const free = await availability(pool, req.query);
    res.json({available:free.available, reason:free.reason, vehicleCount:free.vehicles?.length, driverCount:free.drivers?.length});
  }));
  app.get('/api/resources/fleet', requireAuth, gso, handle(async(req,res)=>{
    const vehicles=await pool.query('SELECT * FROM public.fleet_vehicles ORDER BY vehicle_name');
    const drivers=await pool.query('SELECT * FROM public.resource_drivers ORDER BY full_name');
    const requests=await pool.query(`SELECT b.booking_id,b.status,to_char(b.reservation_date,'YYYY-MM-DD') AS date,b.purpose,
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
    res.status(201).json({message:'Registered successfully.'});
  }));
  app.put('/api/resources/fleet/:kind/:id/active',requireAuth,gso,handle(async(req,res)=>{
    const tables={vehicles:['fleet_vehicles','vehicle_id'],drivers:['resource_drivers','driver_id']};
    const table=tables[req.params.kind];
    if(!table || typeof req.body.active !== 'boolean') throw new Error('Invalid availability update.');
    const client=await pool.connect();
    try {await client.query('BEGIN');await lockSchedule(client);
      await client.query(`UPDATE public.${table[0]} SET is_active=$1 WHERE ${table[1]}=$2`,[req.body.active,req.params.id]);
      await client.query('COMMIT');res.json({message:'Availability updated. Existing confirmed assignments still need to be honored or reassigned.'});
    } catch(e) {await client.query('ROLLBACK');throw e;} finally {client.release();}
  }));
  app.get('/api/resources/assignments/:id/options',requireAuth,gso,handle(async(req,res)=>{
    const result=await pool.query(`SELECT to_char(b.reservation_date,'YYYY-MM-DD') AS date,vr.pick_up_time::text AS start,vr.drop_off_time::text AS end
      FROM public.bookings b JOIN public.vehicle_requirements vr USING(booking_id) WHERE b.booking_id=$1`,[req.params.id]);
    if(!result.rows.length) throw new Error('Vehicle request not found.');
    res.json(await availability(pool,{...result.rows[0],...(req.query.start && req.query.end ? {start:req.query.start,end:req.query.end} : {}),type:'Vehicle',exclude:req.params.id,allowLegacy:true}));
  }));
  app.put('/api/resources/assignments/:id',requireAuth,gso,handle(async(req,res)=>{
    const client=await pool.connect();
    try {await client.query('BEGIN');await lockSchedule(client);
      const result=await client.query(`SELECT to_char(b.reservation_date,'YYYY-MM-DD') AS date,vr.pick_up_time::text AS start,vr.drop_off_time::text AS end
        FROM public.bookings b JOIN public.vehicle_requirements vr USING(booking_id) WHERE b.booking_id=$1 FOR UPDATE OF b`,[req.params.id]);
      if(!result.rows.length) throw new Error('Vehicle request not found.');
      const window={...result.rows[0],...(req.body.start && req.body.end ? {start:req.body.start,end:req.body.end} : {})};
      const free=await availability(client,{...window,type:'Vehicle',exclude:req.params.id,allowLegacy:true});
      if(!free.vehicles.some(v=>v.vehicle_id===Number(req.body.vehicleId)) || !free.drivers.some(d=>d.driver_id===Number(req.body.driverId))) throw new Error('The selected vehicle or driver is no longer available.');
      await client.query(`UPDATE public.vehicle_requirements vr SET assigned_vehicle_id=f.vehicle_id,assigned_driver_id=d.driver_id,pick_up_time=$4::time,drop_off_time=$5::time,
        asd_id=f.asd_id,vehicle_to_be_used=f.vehicle_name,plate_number=f.plate_number,designated_driver=d.full_name,license_number=d.license_number
        FROM public.fleet_vehicles f,public.resource_drivers d WHERE vr.booking_id=$1 AND f.vehicle_id=$2 AND d.driver_id=$3`,[req.params.id,req.body.vehicleId,req.body.driverId,window.start,window.end]);
      await client.query('COMMIT');res.json({message:'Assignment saved. Pending requests still require document checklist confirmation.'});
    } catch(e) {await client.query('ROLLBACK');throw e;} finally {client.release();}
  }));
};
