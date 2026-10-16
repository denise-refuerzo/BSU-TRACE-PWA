// Queries using this predicate must name the group g and the office o.
// All offices includes directory entries without an organizational category.
const officeGroupMembershipSql = `o.o_id <> 999 AND (
  lower(btrim(g.group_name)) = 'all offices' OR EXISTS (
    SELECT 1 FROM public.office_route_group_members m
    WHERE m.group_id=g.group_id AND m.office_id=o.o_id
  )
)`;

async function syncOfficeRouteGroup(db, officeId, category, previousCategory = null) {
  if (previousCategory && previousCategory.toLowerCase() !== category?.toLowerCase()) {
    await db.query(`DELETE FROM public.office_route_group_members m USING public.office_route_groups g
      WHERE m.group_id=g.group_id AND m.office_id=$1 AND lower(btrim(g.group_name))=lower($2)`, [officeId, previousCategory]);
  }
  if (category) {
    await db.query('INSERT INTO public.office_route_groups (group_name) VALUES ($1) ON CONFLICT DO NOTHING', [category]);
  }
  await db.query(`INSERT INTO public.office_route_group_members (group_id, office_id)
    SELECT group_id,$1 FROM public.office_route_groups
    WHERE $1 <> 999 AND (lower(btrim(group_name))=lower($2) OR lower(btrim(group_name))='all offices')
    ON CONFLICT DO NOTHING`, [officeId, category]);
}

module.exports = {officeGroupMembershipSql, syncOfficeRouteGroup};
