const express = require('express');
const sharp = require('sharp');

async function normalizePicture(bytes) {
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > 256 * 1024) {
    throw new Error('Choose an image smaller than 256 KB after resizing.');
  }
  const image = sharp(bytes, { limitInputPixels: 24000000, failOn: 'warning' });
  const metadata = await image.metadata();
  if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages || 1) > 1) {
    throw new Error('Choose a still JPEG, PNG or WebP image.');
  }
  const jpeg = await image.rotate().resize(256, 256, { fit: 'cover' })
    .flatten({ background: '#ffffff' }).jpeg({ quality: 85 }).toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
}

module.exports = function registerProfilePicture(app, pool, requireAuth) {
  const router = express.Router();
  router.use(requireAuth);
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.get('/', async (req, res) => {
    try {
      const result = await pool.query('SELECT profile_pic FROM public."User" WHERE u_id=$1', [req.user.u_id]);
      if (!result.rows.length) return res.status(404).json({ error: 'Account not found.' });
      res.json({ profilePic: result.rows[0].profile_pic || null });
    } catch { res.status(500).json({ error: 'Unable to load your profile picture. Please retry.' }); }
  });
  router.put('/', express.raw({ type: 'application/octet-stream', limit: '256kb' }), async (req, res) => {
    let picture;
    try { picture = await normalizePicture(req.body); }
    catch { return res.status(400).json({ error: 'Invalid image. Choose a still JPEG, PNG or WebP image and try again.' }); }
    try {
      const result = await pool.query('UPDATE public."User" SET profile_pic=$1 WHERE u_id=$2 RETURNING u_id', [picture, req.user.u_id]);
      if (!result.rows.length) return res.status(404).json({ error: 'Account not found.' });
      res.json({ profilePic: picture, message: 'Profile picture saved.' });
    } catch { res.status(500).json({ error: 'Unable to save your profile picture. Please try again.' }); }
  });
  router.delete('/', async (req, res) => {
    try {
      const result = await pool.query('UPDATE public."User" SET profile_pic=NULL WHERE u_id=$1 RETURNING u_id', [req.user.u_id]);
      if (!result.rows.length) return res.status(404).json({ error: 'Account not found.' });
      res.json({ profilePic: null, message: 'Profile picture removed.' });
    } catch { res.status(500).json({ error: 'Unable to remove your profile picture. Please try again.' }); }
  });
  // Keep parser errors in the API's JSON response format.
  router.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Image is too large. Choose a smaller image.' });
    next(err);
  });
  app.use('/api/profile-picture', router);
};
module.exports.normalizePicture = normalizePicture;
