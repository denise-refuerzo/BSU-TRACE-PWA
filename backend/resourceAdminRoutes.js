const {lockSchedule, validateWindow} = require('./resourceScheduling');
module.exports = (app, pool, requireAuth) => {
  const gso = (req,res,next) => Number(req.user.a_id) === 4 ? next() : res.status(403).json({error:'GSO access required.'});
  const handle = fn => async(req,res) => {try {await fn(req,res);} catch(e) {res.status(400).json({error:e.code === '23503' ? 'This record is linked to requests or blocks and cannot be deleted. Keep it for history and mark it unavailable instead.' : e.code === '23505' ? 'That plate or license number is already registered.' : e.message});}};
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
        WHERE b.status='Confirmed' AND (gm.asd_id=$1 OR (vr.asd_id=$1 AND ($4::integer IS NULL OR vr.assigned_vehicle_id=$4 OR vr.assigned_vehicle_id IS NULL)))
        AND (b.reservation_date + COALESCE(gm.start_time,vr.pick_up_time)) < $3::timestamp
        AND (b.reservation_date + CASE WHEN vr.pick_up_time>=vr.drop_off_time THEN '23:59:59'::time ELSE COALESCE(gm.end_time,vr.drop_off_time) END) > $2::timestamp LIMIT 1`,[assetId,from,until,vehicleId||null]);
      if(conflicts.rows.length) throw new Error('This block overlaps a confirmed request. Reassign the vehicle or resolve the request before blocking this period.');
      await client.query('INSERT INTO public.asset_blackouts(asd_id,vehicle_id,start_time,end_time,reason,blocked_by,whole_day) VALUES($1,$2,$3,$4,$5,$6,$7)',[assetId,vehicleId||null,from,until,reason.trim(),req.user.u_id,wholeDay]);
      await client.query('COMMIT');res.status(201).json({message:'Blocked period saved.'});
    } catch(e) {await client.query('ROLLBACK');throw e;} finally {client.release();}
  }));
  app.delete('/api/resources/schedule-blocks/:id',requireAuth,gso,handle(async(req,res)=>{
    await pool.query('DELETE FROM public.asset_blackouts WHERE block_id=$1',[req.params.id]);res.json({message:'Block removed.'});
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
      await client.query('COMMIT');res.json({message:'Details updated.'});
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
      await client.query('COMMIT');res.json({message:'Record deleted.'});
    } catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  }));
};
