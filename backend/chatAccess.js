const officeRole = user => [2, 3, 4].includes(Number(user.a_id));

async function resolveChatDocument(db, publicId, user) {
  const officeId = officeRole(user) ? user.o_id : null;
  const result = await db.query(`SELECT idoc.ini_id,idoc.submission_office_id,(idoc.u_id=$2) AS is_owner,
    EXISTS (SELECT 1 FROM public.document_collaborators dc WHERE dc.ini_id=idoc.ini_id AND dc.user_id=$2) AS is_collaborator,
    ((idoc.u_id=$2) OR EXISTS (SELECT 1 FROM public.document_collaborators dc WHERE dc.ini_id=idoc.ini_id AND dc.user_id=$2)) AS can_view_all_channels
    FROM public.initial_document idoc
    WHERE idoc.public_id=$1
      AND EXISTS (SELECT 1 FROM public.processed_document active
        WHERE active.ini_id=idoc.ini_id AND active.time_out IS NULL AND active.s_id<>5)
      AND (idoc.u_id=$2 OR EXISTS (SELECT 1 FROM public.document_collaborators dc WHERE dc.ini_id=idoc.ini_id AND dc.user_id=$2) OR ($3::integer IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.processed_document active
        WHERE active.ini_id=idoc.ini_id AND active.current_office_id=$3
          AND active.time_out IS NULL AND active.s_id<>5
      )))`, [publicId, user.u_id, officeId]);
  return result.rows[0] || null;
}

async function resolveChatRoom(db, publicId, user) {
  const officeId = officeRole(user) ? user.o_id : null;
  const result = await db.query(`SELECT cr.room_id,cr.public_id,cr.ini_id,cr.o_id,idoc.submission_office_id,
    (idoc.u_id=$2) AS is_owner,
    EXISTS (SELECT 1 FROM public.document_collaborators dc WHERE dc.ini_id=idoc.ini_id AND dc.user_id=$2) AS is_collaborator
    FROM public.chat_rooms cr JOIN public.initial_document idoc ON idoc.ini_id=cr.ini_id
    WHERE cr.public_id=$1
      AND EXISTS (SELECT 1 FROM public.processed_document active
        WHERE active.ini_id=idoc.ini_id AND active.time_out IS NULL AND active.s_id<>5)
      AND (idoc.u_id=$2 OR EXISTS (SELECT 1 FROM public.document_collaborators dc WHERE dc.ini_id=idoc.ini_id AND dc.user_id=$2) OR ($3::integer IS NOT NULL AND cr.o_id=$3 AND EXISTS (
        SELECT 1 FROM public.processed_document active
        WHERE active.ini_id=idoc.ini_id AND active.current_office_id=$3
          AND active.time_out IS NULL AND active.s_id<>5
      )))`, [publicId, user.u_id, officeId]);
  return result.rows[0] || null;
}

module.exports = { resolveChatDocument, resolveChatRoom };
