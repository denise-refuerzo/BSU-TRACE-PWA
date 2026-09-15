const express = require('express');
const cors = require('cors');
const jwt = require('jwt-simple');
const bcrypt = require('bcrypt');
const pool = require('./db');
const {lockSchedule, availability, assertConfirmable} = require('./resourceScheduling');
const { sendResetCodeEmail, sendTrackingAlertEmail, sendSystemEmail } = require('./mailer');
const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();

// ==========================================
// 0. SERVER INITIALIZATION & SETUP
// ==========================================
const app = express();
app.use(cors({
  origin: [
    'https://bsu-trace.vercel.app',
    /\.vercel\.app$/,            // Allows preview deployments
    'http://localhost:5173',     // Vite local frontend
    'http://localhost:3000'
  ],
  credentials: true
}));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';

const failed2faAttemptsTracker = {};
const TWO_FA_WINDOW_MS = 10 * 60 * 1000;
const TWO_FA_MAX_ATTEMPTS = 5;
const TWO_FA_RESEND_MS = 60 * 1000;
const twoFaResendTracker = new Map();
const newTwoFaCode = () => Math.floor(100000 + Math.random() * 900000).toString();
const twoFaExpiry = () => new Date(Date.now() + TWO_FA_WINDOW_MS);
const generateSixDigitCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ==========================================
// 1. LOGIN ENDPOINT (Conditional with 2FA)
// ==========================================
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      `SELECT u.u_id, u.password, u.a_id, u.two_fa_enabled, u.is_active, u.uni_email, 
              a.account_type, d.department_name, u.full_name
       FROM public."User" u
       JOIN public.account a ON u.a_id = a.a_id
       JOIN public.department d ON u.d_id = d.d_id
       WHERE u.username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (user.is_active === false) {
      return res.status(403).json({ error: 'Account disabled. Please contact the ICT Administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // ----------------------------------------------------
    // NEW LOGIC: Generate & Email 2FA PIN
    // ----------------------------------------------------
    if (user.two_fa_enabled) {
      const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();

      const expiresAt = twoFaExpiry();
      await pool.query(
        'UPDATE public."User" SET two_fa_code = $1, two_fa_code_expires = $2, two_fa_attempts = 0 WHERE u_id = $3',
        [generatedPin, expiresAt, user.u_id]
      );

      await sendSystemEmail(
        user.uni_email,
        'BSU-Trace Login Verification',
        `Your 2FA verification code is: ${generatedPin}. Do not share this with anyone.`
      );

      return res.status(200).json({
        u_id: user.u_id,
        a_id: user.a_id,
        two_fa_enabled: true
        ,two_fa_expires_at: expiresAt.toISOString(), resend_after_seconds: 60
      });
    }

    // ----------------------------------------------------
    // NORMAL LOGIC: If 2FA is OFF, generate token immediately
    // ----------------------------------------------------
    const sessionToken = crypto.randomBytes(32).toString('hex');
    await pool.query('UPDATE public."User" SET session_token = $1 WHERE u_id = $2', [sessionToken, user.u_id]);
    
    // Maintain the JWT payload structure required by your middleware
    const token = jwt.encode({ 
      u_id: user.u_id, 
      username: username, 
      a_id: user.a_id,
      session_token: sessionToken 
    }, JWT_SECRET);

    return res.status(200).json({
      message: 'Login successful',
      token,
      role: user.a_id,
      roleName: user.account_type,
      fullName: user.full_name,
      userId: user.u_id,
      two_fa_enabled: false,
      session_token: sessionToken 
    });

  } catch (error) {
    console.error('Login Error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// ==========================================
// 1.1 SESSION VERIFICATION MIDDLEWARE
// ==========================================
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized access. Please log in.' });
  }

  const token = authHeader.split(' ')[1]; // Expects format: "Bearer <token>"

  try {
    const decoded = jwt.decode(token, JWT_SECRET);
    
    // Check the database to see if the session token matches the current one
    const result = await pool.query('SELECT session_token,a_id,o_id,d_id,is_active FROM public."User" WHERE u_id = $1', [decoded.u_id]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User account no longer exists.' });
    }

    const currentDbToken = result.rows[0].session_token;

    // THE KICK-OUT LOGIC: If the tokens don't match, they logged in somewhere else!
    if (currentDbToken !== decoded.session_token) {
      return res.status(401).json({ 
        error: 'Session expired. You logged in from another device.', 
        forceLogout: true 
      });
    }

    // If it matches, attach user info to req and proceed
    if (!result.rows[0].is_active) return res.status(403).json({error:'Account is inactive.'});
    req.user = {...decoded, ...result.rows[0]};
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

// ==========================================
// 1.2 2FA VERIFICATION ENDPOINT
// ==========================================
app.post('/api/login/verify-2fa', async (req, res) => {
  const { userId, otpCode } = req.body;

  try {
    // 1. Fetch the user, their OTP, and the extra profile details needed for the frontend JWT
    const result = await pool.query(
      `SELECT u.u_id, u.username, u.a_id, u.two_fa_enabled, u.two_fa_code, u.two_fa_code_expires, u.two_fa_attempts, u.is_active, u.full_name, a.account_type
       FROM public."User" u
       JOIN public.account a ON u.a_id = a.a_id
       WHERE u.u_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // 2. Compare the input code with the database code
    if (!user.is_active || !user.two_fa_enabled || !/^\d{6}$/.test(String(otpCode || '')) ||
        !user.two_fa_code || !user.two_fa_code_expires || new Date(user.two_fa_code_expires) < new Date())
      return res.status(401).json({ error: 'Invalid or expired verification code' });
    if (Number(user.two_fa_attempts || 0) >= TWO_FA_MAX_ATTEMPTS)
      return res.status(429).json({ error: 'Too many attempts. Request a new verification code.' });
    if (user.two_fa_code !== String(otpCode)) {
      await pool.query('UPDATE public."User" SET two_fa_attempts = COALESCE(two_fa_attempts,0) + 1 WHERE u_id = $1', [userId]);
      return res.status(401).json({ error: 'Invalid or expired verification code' });
    }

    // 3. If successful, generate the session token
    const crypto = require('crypto');
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // 4. Update the token in the DB and clear the temporary OTP code for security
    await pool.query(
      'UPDATE public."User" SET session_token = $1, two_fa_code = NULL, two_fa_code_expires = NULL, two_fa_attempts = 0 WHERE u_id = $2',
      [sessionToken, user.u_id]
    );

    // 5. Generate the JWT with the full payload
    const token = jwt.encode({ 
      u_id: user.u_id, 
      username: user.username, 
      a_id: user.a_id,
      session_token: sessionToken 
    }, JWT_SECRET);

    // 6. Log the user in with the exact same payload structure as the standard login
    return res.status(200).json({
      message: '2FA verification successful',
      token,
      role: user.a_id,
      roleName: user.account_type,
      fullName: user.full_name,
      userId: user.u_id,
      session_token: sessionToken 
    });

  } catch (error) {
    console.error('2FA Verification Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// 1.3 VERIFY & ENABLE 2FA ENDPOINT
// ==========================================
app.post('/api/profile/:id/verify-enable-2fa', requireAuth, async (req, res) => {
  const userId = req.params.id;
  const { otpCode } = req.body;

  try {
    // 1. Fetch the user's stored OTP
    const result = await pool.query(
      'SELECT two_fa_code,two_fa_code_expires,two_fa_attempts,is_active FROM public."User" WHERE u_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 2. Check if the code matches
    const pending = result.rows[0];
    if (!pending.is_active || !/^\d{6}$/.test(String(otpCode || '')) || !pending.two_fa_code ||
        !pending.two_fa_code_expires || new Date(pending.two_fa_code_expires) < new Date() ||
        Number(pending.two_fa_attempts || 0) >= TWO_FA_MAX_ATTEMPTS || pending.two_fa_code !== String(otpCode)) {
      await pool.query('UPDATE public."User" SET two_fa_attempts = COALESCE(two_fa_attempts,0) + 1 WHERE u_id = $1', [userId]);
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // 3. Code matches! Enable 2FA and clear the temporary OTP code
    await pool.query(
      'UPDATE public."User" SET two_fa_enabled = true, two_fa_code = NULL, two_fa_code_expires = NULL, two_fa_attempts = 0 WHERE u_id = $1',
      [userId]
    );

    res.status(200).json({ message: 'Two-Factor Authentication has been successfully enabled.' });

  } catch (error) {
    console.error('Enable 2FA Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// 1.3.1 VERIFY & DISABLE 2FA ENDPOINT
// ==========================================
app.post('/api/profile/:id/verify-disable-2fa', requireAuth, async (req, res) => {
  const userId = req.params.id;
  const { otpCode } = req.body;

  try {
    // 1. Fetch the user's stored OTP
    const result = await pool.query(
      'SELECT two_fa_code,two_fa_code_expires,two_fa_attempts,is_active FROM public."User" WHERE u_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 2. Check if the code matches
    const pending = result.rows[0];
    if (!pending.is_active || !/^\d{6}$/.test(String(otpCode || '')) || !pending.two_fa_code ||
        !pending.two_fa_code_expires || new Date(pending.two_fa_code_expires) < new Date() ||
        Number(pending.two_fa_attempts || 0) >= TWO_FA_MAX_ATTEMPTS || pending.two_fa_code !== String(otpCode)) {
      await pool.query('UPDATE public."User" SET two_fa_attempts = COALESCE(two_fa_attempts,0) + 1 WHERE u_id = $1', [userId]);
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // 3. Code matches! Disable 2FA and clear the temporary OTP code
    await pool.query(
      'UPDATE public."User" SET two_fa_enabled = false, two_fa_code = NULL, two_fa_code_expires = NULL, two_fa_attempts = 0 WHERE u_id = $1',
      [userId]
    );

    res.status(200).json({ message: 'Two-Factor Authentication has been successfully disabled.' });

  } catch (error) {
    console.error('Disable 2FA Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// 1.4 FORGOT PASSWORD: IDENTIFY USER
// ==========================================
app.post('/api/auth/forgot-password/identify', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required.' });

  try {
    const result = await pool.query(
      'SELECT uni_email, full_name FROM public."User" WHERE username = $1',
      [username.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Username not found in the university database.' });
    }

    const { uni_email, full_name } = result.rows[0];

    const maskEmail = (email) => {
      const [localPart, domain] = email.split('@');
      if (localPart.length <= 2) return `${localPart[0]}***@${domain}`;
      return `${localPart[0]}${'*'.repeat(localPart.length - 2)}${localPart[localPart.length - 1]}@${domain}`;
    };

    res.json({ 
      maskedEmail: maskEmail(uni_email),
      username: username.trim()
    });
  } catch (err) {
    console.error("Identify user error:", err);
    res.status(500).json({ error: 'Database tracking configuration lookup error.' });
  }
});

// ==========================================
// 1.5 FORGOT PASSWORD: VERIFY EMAIL OTP
// ==========================================
app.post('/api/auth/forgot-password/verify-email', async (req, res) => {
  const { username, fullEmail } = req.body;
  if (!username || !fullEmail) return res.status(400).json({ error: 'All fields are required.' });

  try {
    const result = await pool.query(
      'SELECT uni_email, full_name FROM public."User" WHERE username = $1',
      [username.trim()]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'User link context missing.' });

    const user = result.rows[0];

    if (user.uni_email.toLowerCase().trim() !== fullEmail.toLowerCase().trim()) {
      return res.status(400).json({ error: 'The email address provided does not match our records.' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      `UPDATE public."User" 
       SET reset_token = $1, reset_token_expires = $2 
       WHERE username = $3`,
      [verificationCode, expiryTime, username.trim()]
    );

    const emailDelivery = await sendResetCodeEmail(user.uni_email, user.full_name, verificationCode);

    if (!emailDelivery.success) {
      return res.status(500).json({ error: 'Failed to send verification code email. Try again later.' });
    }

    res.json({ message: 'Verification code dispatched successfully!' });
  } catch (err) {
    console.error("Email verification dispatch loop failure:", err);
    res.status(500).json({ error: 'Internal pipeline verification structural error.' });
  }
});

// ==========================================
// 1.6 FORGOT PASSWORD: RESET PASSWORD
// ==========================================
app.post('/api/auth/forgot-password/reset', async (req, res) => {
  const { username, code, newPassword } = req.body;
  if (!username || !code || !newPassword) return res.status(400).json({ error: 'All fields are required.' });

  try {
    const result = await pool.query(
      'SELECT reset_token, reset_token_expires FROM public."User" WHERE username = $1',
      [username.trim()]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'User mapping context context missing.' });

    const user = result.rows[0];

    if (!user.reset_token || user.reset_token !== code.trim()) {
      return res.status(400).json({ error: 'Invalid verification token mismatch.' });
    }

    const now = new Date();
    if (new Date(user.reset_token_expires) < now) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE public."User" 
       SET password = $1, reset_token = NULL, reset_token_expires = NULL 
       WHERE username = $2`,
      [hashedNewPassword, username.trim()]
    );

    res.json({ message: 'Your password has been successfully reset! You can now log in.' });
  } catch (err) {
    console.error("Finalization password allocation loop breakdown:", err);
    res.status(500).json({ error: 'Structural commitment change sequence transaction breakdown.' });
  }
});

// ==========================================
// 2. FETCH ALL ACCOUNTS ENDPOINT (ICT Admin)
// ==========================================
app.get('/api/accounts', requireAuth, async (req, res) => {
  try {
    const query = `
                  SELECT u.u_id, u.username, u.full_name, u.uni_email, u.faculty_id, u.two_fa_enabled, u.a_id, u.d_id, u.o_id, u.is_active,
                        a.account_type as role_name,
                        d.department_name,
                        off.office_name
                  FROM public."User" u
                  JOIN public.account a ON u.a_id = a.a_id
                  JOIN public.department d ON u.d_id = d.d_id
                  LEFT JOIN public.offices off ON u.o_id = off.o_id
                  ORDER BY u.u_id DESC;
                `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching institutional accounts database ledger:", err);
    res.status(500).json({ error: 'Failed to extract institutional accounts mapping directory loop.' });
  }
});

// ==========================================
// 2.1 CREATE NEW ACCOUNT ENDPOINT
// ==========================================
app.post('/api/accounts', requireAuth, async (req, res) => {
  const { username, password, fullName, email, departmentId, officeId } = req.body;
  const accountType = Number(req.body.accountType) === 3 ? 2 : Number(req.body.accountType);
  if (Number(req.user.a_id) !== 5) return res.status(403).json({error:"Administrator access required."});
  
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Rejection: Password must be at least 6 characters long.' });
  }
  
  try {
    const userCheck = await pool.query(
      'SELECT * FROM public."User" WHERE username = $1 OR uni_email = $2', 
      [username, email]
    );
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Rejection: Username or email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    
    const assignedOfficeId = (parseInt(accountType) === 2 || parseInt(accountType) === 3 || parseInt(accountType) === 4) && officeId 
      ? parseInt(officeId) 
      : null;

    const assignedDepartmentId = departmentId ? parseInt(departmentId) : 1;

    await pool.query(
      `INSERT INTO public."User" (a_id, d_id, username, password, full_name, uni_email, o_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`, 
      [parseInt(accountType), assignedDepartmentId, username, hashedPassword, fullName, email, assignedOfficeId]
    );

    res.status(201).json({ message: 'Success: Account architecture generated and synchronized successfully!' });
  } catch (err) {
    console.error("Account registration script processing breakdown:", err);
    res.status(500).json({ error: 'Failed account generation sequence structural assignment loop.' });
  }
});

// ==========================================
// 2.2 UPDATE ACCOUNT ENDPOINT
// ==========================================
app.put('/api/accounts/:userId', requireAuth, async (req, res) => {
  const { userId } = req.params;
  const { username, fullName, email, departmentId, officeId, isActive } = req.body;
  const accountType = Number(req.body.accountType) === 3 ? 2 : Number(req.body.accountType);
  if (Number(req.user.a_id) !== 5) return res.status(403).json({error:"Administrator access required."});  
  try {
    const duplicateCheck = await pool.query(
      `SELECT * FROM public."User" WHERE username = $1 AND u_id != $2`,
      [username, parseInt(userId)]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Rejection: This username identifier is already registered to another user account.' });
    }

    const assignedOfficeId = (parseInt(accountType) === 2 || parseInt(accountType) === 3 || parseInt(accountType) === 4) && officeId 
      ? parseInt(officeId) 
      : null;

    const assignedDepartmentId = departmentId ? parseInt(departmentId) : 1;

    const query = `
      UPDATE public."User"
      SET username = $1, full_name = $2, uni_email = $3, a_id = $4, d_id = $5, o_id = $6, is_active = $7
      WHERE u_id = $8
    `;
    
    await pool.query(query, [
      username, fullName, email, parseInt(accountType), assignedDepartmentId, assignedOfficeId, isActive, parseInt(userId)
    ]);

    res.json({ message: 'Personnel access profile parameters re-indexed and synchronized cleanly!' });
  } catch (err) {
    console.error("Account update failure:", err);
    res.status(500).json({ error: 'Failed execution update sequence constraint loop.' });
  }
});

require('./profilePictureRoutes')(app, pool, requireAuth);

// ==========================================
// 2.3 FETCH USER PROFILE ENDPOINT
// ==========================================
app.get('/api/profile/:userId', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.u_id, u.full_name, u.uni_email, u.faculty_id, u.two_fa_enabled, u.two_fa_code, u.o_id,
              a.account_type, d.department_name, off.office_name
       FROM public."User" u
       JOIN public.account a ON u.a_id = a.a_id
       JOIN public.department d ON u.d_id = d.d_id
       LEFT JOIN public.offices off ON u.o_id = off.o_id
       WHERE u.u_id = $1`,
      [req.params.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User profiles entry missing' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Profile lookup error:", err);
    res.status(500).json({ error: 'Failed to look up user metadata frame' });
  }
});

// ==========================================
// 2.4 UPDATE USER PROFILE ENDPOINT
// ==========================================
app.put('/api/profile/:userId', requireAuth, async (req, res) => {
  const { fullName, email, twoFaEnabled, twoFaCode } = req.body;
  
  try {
    // 1. Validate that required personal information fields are not empty
    if (!fullName || !fullName.trim() || !email || !email.trim()) {
      return res.status(400).json({ error: 'Full Name and University Email are required fields.' });
    }

    // 2. Enforce 2FA security validation rules for all user types
    if (twoFaEnabled && (!twoFaCode || twoFaCode.toString().length < 4)) {
      return res.status(400).json({ error: 'A valid numeric PIN (at least 4 digits) is required to enable Two-Factor Authentication.' });
    }
    const current = await pool.query('SELECT two_fa_enabled FROM public."User" WHERE u_id=$1',[req.params.userId]);
    if (!current.rows[0]) return res.status(404).json({error:'User not found.'});
    if (twoFaEnabled && !current.rows[0].two_fa_enabled)
      return res.status(409).json({error:'Verify the emailed 2FA code before enabling 2FA.'});

    // 3. Execute the update query across the shared "User" table
    await pool.query(
      `UPDATE public."User" 
       SET full_name = $1, uni_email = $2, two_fa_enabled = $3, two_fa_code = $4
       WHERE u_id = $5`,
      [fullName.trim(), email.trim(), twoFaEnabled, twoFaCode || null, req.params.userId]
    );
    
    res.json({ message: 'Profile variables synchronized successfully!' });
  } catch (err) {
    console.error("Profile Synchronization Error:", err);
    res.status(500).json({ error: 'Failed to synchronize layout values' });
  }
});

// ==========================================
// 2.5 UPDATE USER PASSWORD ENDPOINT
// ==========================================
app.put('/api/profile/:userId/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const userRes = await pool.query('SELECT password FROM public."User" WHERE u_id = $1', [req.params.userId]);
    const user = userRes.rows[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Current password credentials record mismatch' });

    const newHashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE public."User" SET password = $1 WHERE u_id = $2', [newHashed, req.params.userId]);
    res.json({ message: 'Credentials records changed cleanly' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to rewrite target security credentials record' });
  }
});

// ==========================================
// 2.6 REQUEST OTP FOR PROFILE SECURITY CHANGES
// ==========================================
app.post('/api/users/:id/request-profile-otp', requireAuth, async (req, res) => {
  const userId = req.params.id;

  try {
    const userRes = await pool.query('SELECT uni_email FROM public."User" WHERE u_id = $1', [userId]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const email = userRes.rows[0].uni_email;
    const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();
    
    await pool.query('UPDATE public."User" SET two_fa_code = $1, two_fa_code_expires = $2, two_fa_attempts = 0 WHERE u_id = $3', [generatedPin, twoFaExpiry(), userId]);
    
    await sendSystemEmail(
      email,
      'BSU-Trace Security Update',
      `Your verification code to authorize changes to your 2FA settings is: ${generatedPin}. Do not share this with anyone.`
    );
    
    res.status(200).json({ message: 'Verification code sent to email' });
  } catch (error) {
    console.error('Request Profile OTP Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// 3. FETCH ALL OFFICES ENDPOINT
// ==========================================
app.get('/api/offices', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT o_id AS id, office_name AS name FROM public.offices ORDER BY office_name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching offices directory:", err);
    res.status(500).json({ error: "Failed to pull campus offices directory." });
  }
});

// ==========================================
// 3.1 CREATE DEPARTMENT ENDPOINT
// ==========================================
app.post('/api/departments', requireAuth, async (req, res) => {
  const { departmentName } = req.body;
  if (!departmentName || departmentName.trim() === "") {
    return res.status(400).json({ error: 'Rejection: Department names cannot be instantiated as empty text strings.' });
  }

  try {
    const checkDup = await pool.query('SELECT * FROM public.department WHERE LOWER(department_name) = $1', [departmentName.trim().toLowerCase()]);
    if (checkDup.rows.length > 0) {
      return res.status(400).json({ error: 'Rejection: This institutional department context is already indexed.' });
    }

    await pool.query('INSERT INTO public.department (department_name) VALUES ($1)', [departmentName.trim()]);
    res.status(201).json({ message: 'Success: Global department structure synchronized successfully!' });
  } catch (err) {
    console.error("Department registration exception:", err);
    res.status(500).json({ error: 'Failed execution query write department sequence context.' });
  }
});

// ==========================================
// 3.2 CREATE OFFICE ENDPOINT
// ==========================================
app.post('/api/offices', requireAuth, async (req, res) => {
  const { officeName } = req.body;
  if (!officeName || officeName.trim() === "") {
    return res.status(400).json({ error: 'Rejection: Office destination tags cannot be instantiated as empty text strings.' });
  }

  try {
    const checkDup = await pool.query('SELECT * FROM public.offices WHERE LOWER(office_name) = $1', [officeName.trim().toLowerCase()]);
    if (checkDup.rows.length > 0) {
      return res.status(400).json({ error: 'Rejection: A structural branch mapping this destination name is already registered.' });
    }

    await pool.query('INSERT INTO public.offices (office_name) VALUES ($1)', [officeName.trim()]);
    res.status(201).json({ message: 'Success: Physical campus office station indexed into global catalogs!' });
  } catch (err) {
    console.error("Office drop node registration exception:", err);
    res.status(500).json({ error: 'Failed execution query write offices sequence context.' });
  }
});

app.post('/api/login/resend-2fa', async (req, res) => {
  const userId = Number(req.body.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({error:'A valid user is required.'});
  const last = twoFaResendTracker.get(userId) || 0;
  if (Date.now() - last < TWO_FA_RESEND_MS) return res.status(429).json({error:'Please wait before requesting another code.'});
  try {
    const result = await pool.query('SELECT uni_email,full_name,two_fa_enabled,is_active FROM public."User" WHERE u_id=$1',[userId]);
    const user = result.rows[0];
    if (!user || !user.is_active || !user.two_fa_enabled) return res.status(400).json({error:'A 2FA challenge is not available.'});
    const code = newTwoFaCode();
    const expiresAt = twoFaExpiry();
    await pool.query('UPDATE public."User" SET two_fa_code=$1,two_fa_code_expires=$2,two_fa_attempts=0 WHERE u_id=$3',[code,expiresAt,userId]);
    await sendSystemEmail(user.uni_email,'BSU-Trace Login Verification',`Your new 2FA verification code is: ${code}. Do not share it.`);
    twoFaResendTracker.set(userId,Date.now());
    res.json({message:'A new verification code was sent.',two_fa_expires_at:expiresAt.toISOString(),resend_after_seconds:60});
  } catch (error) { console.error('Resend 2FA Error:',error); res.status(500).json({error:'Unable to resend verification code.'}); }
});

// ICT-only infrastructure maintenance. Foreign-key constraints deliberately
// protect departments/offices that are already used by accounts or routes.
app.put('/api/departments/:id', requireAuth, async (req, res) => {
  if (Number(req.user.a_id) !== 5) return res.status(403).json({error: 'ICT administrator access required.'});
  const name = String(req.body.departmentName || '').trim();
  if (!name) return res.status(400).json({error: 'Department name is required.'});
  try { const r = await pool.query('UPDATE public.department SET department_name=$1 WHERE d_id=$2 RETURNING d_id', [name, req.params.id]); if (!r.rowCount) return res.status(404).json({error:'Department not found.'}); res.json({message:'Department updated.'}); }
  catch (e) { res.status(e.code === '23505' ? 409 : 500).json({error: e.code === '23505' ? 'That department already exists.' : 'Unable to update department.'}); }
});
app.delete('/api/departments/:id', requireAuth, async (req, res) => {
  if (Number(req.user.a_id) !== 5) return res.status(403).json({error: 'ICT administrator access required.'});
  try { const r = await pool.query('DELETE FROM public.department WHERE d_id=$1 RETURNING d_id', [req.params.id]); if (!r.rowCount) return res.status(404).json({error:'Department not found.'}); res.json({message:'Department deleted.'}); }
  catch (e) { res.status(e.code === '23503' ? 409 : 500).json({error: e.code === '23503' ? 'This department is still assigned to an account.' : 'Unable to delete department.'}); }
});
app.put('/api/offices/:id', requireAuth, async (req, res) => {
  if (Number(req.user.a_id) !== 5) return res.status(403).json({error: 'ICT administrator access required.'});
  const name = String(req.body.officeName || '').trim();
  if (!name) return res.status(400).json({error: 'Office name is required.'});
  try { const r = await pool.query('UPDATE public.offices SET office_name=$1 WHERE o_id=$2 RETURNING o_id', [name, req.params.id]); if (!r.rowCount) return res.status(404).json({error:'Office not found.'}); res.json({message:'Office updated.'}); }
  catch (e) { res.status(e.code === '23505' ? 409 : 500).json({error: e.code === '23505' ? 'That office already exists.' : 'Unable to update office.'}); }
});
app.delete('/api/offices/:id', requireAuth, async (req, res) => {
  if (Number(req.user.a_id) !== 5) return res.status(403).json({error: 'ICT administrator access required.'});
  try { const r = await pool.query('DELETE FROM public.offices WHERE o_id=$1 RETURNING o_id', [req.params.id]); if (!r.rowCount) return res.status(404).json({error:'Office not found.'}); res.json({message:'Office deleted.'}); }
  catch (e) { res.status(e.code === '23503' ? 409 : 500).json({error: e.code === '23503' ? 'This office is still referenced by an account, route, or document.' : 'Unable to delete office.'}); }
});

// ==========================================
// 4. FETCH PROCESS TYPES (WORKFLOWS) ENDPOINT
// ==========================================
require('./documentCategoryRoutes')(app, pool, requireAuth);
require('./officeWorkflowRoutes')(app, pool, requireAuth);

// ==========================================
// 5. FETCH USER DOCUMENTS ENDPOINT
// ==========================================
require('./officeDocumentReadRoutes')(app, pool, requireAuth);

// ==========================================
// 9. REAL-TIME POSTGRESQL NOTIFICATION LISTENER
// ==========================================
const initDatabaseListener = async () => {
  try {
    const client = await pool.connect();
    await client.query('LISTEN document_status_email_channel');
    console.log('Successfully listening to database channel: document_status_email_channel');

    client.on('notification', async (msg) => {
      if (msg.channel === 'document_status_email_channel') {
        try {
          const payload = JSON.parse(msg.payload); // Contains { ini_id, s_id }
          const { ini_id, s_id } = payload;

          // STRICT FILTER: Only proceed if status is 4 (Action Required) or 5 (Completed)
          if (s_id !== 4 && s_id !== 5) {
            return; 
          }

          console.log(`🔔 Received strict DB trigger payload: Document ID ${ini_id}, Status ID ${s_id}`);

          const query = `
            SELECT 
              i.title, 
              u.uni_email, 
              u.full_name, 
              s.current_status
            FROM public.initial_document i
            JOIN public."User" u ON i.u_id = u.u_id
            JOIN public.processed_document pd ON i.ini_id = pd.ini_id
            JOIN public.status s ON pd.s_id = s.s_id
            WHERE i.ini_id = $1 AND pd.s_id = $2
            ORDER BY pd.pd_id DESC
            LIMIT 1;
          `;
          
          const result = await pool.query(query, [ini_id, s_id]);

          if (result.rows.length > 0) {
            const { title, uni_email, full_name, current_status } = result.rows[0];

            let bodyText = '';
            
            if (s_id === 4) { // Action Required / Halted
              bodyText = `Your document "${title}" requires your immediate attention. It has been marked as "Action Required" / Halted. Please check the administrative remarks frame to complete any necessary structural file revisions and re-submit.`;
            } else if (s_id === 5) { // Completed
              bodyText = `Great news! Your document "${title}" has finished its entire institutional verification sequence and is now officially finalized and marked as "Completed".`;
            }

            // Fire via your local nodemailer transporter utility
            await sendTrackingAlertEmail(uni_email, full_name, title, current_status, bodyText);
          } else {
            console.log(`⚠️ Database lookup returned 0 rows for Document ID ${ini_id} with Status ID ${s_id}. Verification skipped.`);
          }
        } catch (err) {
          console.error('Error processing database notification payload:', err);
        }
      }
    });

    client.on('error', (err) => {
      console.error('Database listener client crashed. Reconnecting...', err);
      client.release();
      setTimeout(initDatabaseListener, 5000);
    });

  } catch (error) {
    console.error('Failed to initialize database notification listener. Retrying in 5s...', error);
    setTimeout(initDatabaseListener, 5000);
  }
};

// ==========================================
// 9.1 FETCH USER NOTIFICATIONS ENDPOINT
// ==========================================
app.get('/api/notifications/:userId/:roleId/:officeId', requireAuth, async (req, res) => {
  const userId = req.user.u_id;
  const roleId = Number(req.user.a_id);
  const officeId = req.user.o_id || 0;

  try {
    let alertRows = [];
    
    if (roleId === 1) {
      // 1. ORIGINATOR: Alerts every time any action occurs on their document
      const query = `
        SELECT 
          h.history_id as id,
          idoc.ini_id,  /* CRITICAL ADDITION: Pulls the document reference key */
          idoc.title,
          h.action_type as title_alert,
          ('Action performed at ' || COALESCE(off.office_name, 'Origin Station')) as message,
          CASE WHEN h.legacy_manila_wall_time THEN h.action_timestamp - INTERVAL '8 hours' ELSE h.action_timestamp END as time
        FROM public.office_action_history h
        JOIN public.initial_document idoc ON h.ini_id = idoc.ini_id
        LEFT JOIN public.offices off ON h.o_id = off.o_id
        WHERE idoc.u_id = $1
        ORDER BY h.history_id DESC LIMIT 10;
      `;
      const result = await pool.query(query, [userId]);
      alertRows = result.rows.map(row => ({
        id: row.id,
        ini_id: row.ini_id, /* Passed cleanly down to client tracking layer */
        title: row.title_alert,
        message: `"${row.title}": ${row.message}`,
        time: row.time
      }));

    } else if ([2,3,4].includes(roleId)) {
      const result=await pool.query(`SELECT h.history_id AS id,i.ini_id,i.title AS doc_title,h.action_type AS title,
        u.full_name || ' · ' || o.office_name AS message,
        CASE WHEN h.legacy_manila_wall_time THEN h.action_timestamp-INTERVAL '8 hours' ELSE h.action_timestamp END AS time
        FROM public.office_action_history h JOIN public.initial_document i USING(ini_id)
        JOIN public."User" u ON h.u_id=u.u_id JOIN public.offices o ON h.o_id=o.o_id
        WHERE i.submission_office_id=$1 OR EXISTS (SELECT 1 FROM public.processed_document pd
          WHERE pd.ini_id=i.ini_id AND pd.current_office_id=$1 AND pd.time_out IS NULL)
        ORDER BY h.history_id DESC LIMIT 20`,[officeId]);
      alertRows=result.rows;
    }

    res.json(alertRows);
  } catch (err) {
    console.error("Notification pull error:", err);
    res.json([]);
  }
});

// ==========================================
// 10. CHAT: FETCH DOCUMENT CHANNELS ENDPOINT
// ==========================================
app.get('/api/chat/document-channels/:iniId', requireAuth, async (req, res) => {
  const { iniId } = req.params;
  try {
    const docStepsQuery = `
      SELECT pd_id, s_id, current_office_id, next_office_id, time_in, time_out, is_adhoc, adhoc_return_office_id 
      FROM public.processed_document 
      WHERE ini_id = $1 
      ORDER BY pd_id ASC;
    `;
    const stepsResult = await pool.query(docStepsQuery, [parseInt(iniId)]);
    const steps = stepsResult.rows;

    if (steps.length === 0) {
      return res.json([]);
    }

    const officeChannels = {};
    const now = new Date();

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const officeId = step.current_office_id;
      
      if (!officeChannels[officeId]) {
        officeChannels[officeId] = { officeId, isLocked: true, statusMessage: 'Read-Only Archive' };
      }

      const isLastStep = (i === steps.length - 1);

      if (isLastStep) {
        if (step.time_out === null) {
          officeChannels[officeId].isLocked = false;
          officeChannels[officeId].statusMessage = 'Active Connection';
        } else {
          if (step.s_id === 4 || step.s_id === 5) {
            const checkoutTime = new Date(step.time_out);
            const hoursElapsed = (now - checkoutTime) / (1000 * 60 * 60);

            if (hoursElapsed <= 24) {
              officeChannels[officeId].isLocked = false;
              officeChannels[officeId].statusMessage = `Interactive Grace Period (${Math.ceil(24 - hoursElapsed)}h remaining)`;
            } else {
              officeChannels[officeId].isLocked = true;
              officeChannels[officeId].statusMessage = 'Closed (Grace Period Expired)';
            }
          } else {
            const lookAheadNextStep = steps.find(s => s.current_office_id === step.next_office_id && s.pd_id > step.pd_id);
            
            if (lookAheadNextStep && lookAheadNextStep.time_in !== null) {
              officeChannels[officeId].isLocked = true;
              officeChannels[officeId].statusMessage = 'Read-Only Archive (Received by next station)';
            } else if (step.next_office_id) {
              officeChannels[officeId].isLocked = false;
              officeChannels[officeId].statusMessage = 'Active Connection (In Transit)';
            }
          }
        }

        if (step.is_adhoc && step.time_out === null) {
          const primaryOfficeId = step.adhoc_return_office_id;
          if (officeChannels[primaryOfficeId]) {
            officeChannels[primaryOfficeId].isLocked = false;
            officeChannels[primaryOfficeId].statusMessage = 'Active Connection (Awaiting Detour Return)';
          }
        }
      }
    }

    const finalChannels = [];
    for (const oId of Object.keys(officeChannels)) {
      const officeNameRes = await pool.query('SELECT office_name FROM public.offices WHERE o_id = $1', [parseInt(oId)]);
      
      // CHECK IF A CHAT ROOM ACTUALLY EXISTS AND HAS MESSAGES IN IT
      const checkRoom = await pool.query(
        `SELECT room_id FROM public.chat_rooms WHERE ini_id = $1 AND o_id = $2`,
        [parseInt(iniId), parseInt(oId)]
      );
      
      let hasChat = false;
      if (checkRoom.rows.length > 0) {
        const checkMessages = await pool.query(
          `SELECT COUNT(message_id)::int FROM public.chat_messages WHERE room_id = $1`,
          [checkRoom.rows[0].room_id]
        );
        hasChat = checkMessages.rows[0].count > 0;
      }

      finalChannels.push({
        officeId: parseInt(oId),
        officeName: officeNameRes.rows[0]?.office_name || `Office Station #${oId}`,
        isLocked: officeChannels[oId].isLocked,
        statusMessage: officeChannels[oId].statusMessage,
        hasChat: hasChat
      });
    }

    res.json(finalChannels);
  } catch (err) {
    console.error("Error evaluating chat layout channel rules:", err);
    res.status(500).json({ error: 'Failed evaluating channel permission tables.' });
  }
});

// ==========================================
// 10.1 CHAT: GET OR CREATE ROOM ENDPOINT
// ==========================================
app.post('/api/chat/get-or-create-room', requireAuth, async (req, res) => {
  const { iniId, officeId } = req.body;
  try {
    // Check if channel already exists to prevent duplicate tables instantiation
    let roomRes = await pool.query(
      'SELECT room_id FROM public.chat_rooms WHERE ini_id = $1 AND o_id = $2',
      [parseInt(iniId), parseInt(officeId)]
    );

    if (roomRes.rows.length === 0) {
      roomRes = await pool.query(
        `INSERT INTO public.chat_rooms (ini_id, o_id, created_at) 
         VALUES ($1, $2, TIMEZONE('Asia/Manila', NOW())) RETURNING room_id`,
        [parseInt(iniId), parseInt(officeId)]
      );
    }

    res.json({ roomId: roomRes.rows[0].room_id });
  } catch (err) {
    console.error("Error instantiating or resolving chat room nodes:", err);
    res.status(500).json({ error: 'Failed chat room assignment initialization query structural loops.' });
  }
});

// ==========================================
// 10.2 CHAT: FETCH ROOM MESSAGES ENDPOINT
// ==========================================
app.get('/api/chat/rooms/:roomId/messages', requireAuth, async (req, res) => {
  const { roomId } = req.params;
  try {
    const messagesQuery = `
      SELECT m.message_id, m.room_id, m.sender_id, m.message_text, m.sent_at, u.full_name as sender_name, a.account_type as role_name
      FROM public.chat_messages m
      JOIN public."User" u ON m.sender_id = u.u_id
      JOIN public.account a ON u.a_id = a.a_id
      WHERE m.room_id = $1
      ORDER BY m.sent_at ASC;
    `;
    const result = await pool.query(messagesQuery, [parseInt(roomId)]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching historical stream messages loop:", err);
    res.status(500).json({ error: 'Failed message log extraction routing block sequence.' });
  }
});

// ==========================================
// 10.3 CHAT: SEND MESSAGE ENDPOINT
// ==========================================
app.post('/api/chat/messages', requireAuth, async (req, res) => {
  const { roomId, messageText } = req.body;
  const senderId = req.user.u_id; // Decoded cleanly from your JWT authentication layer middleware
  try {
    const result = await pool.query(
      `INSERT INTO public.chat_messages (room_id, sender_id, message_text, sent_at)
       VALUES ($1, $2, $3, TIMEZONE('Asia/Manila', NOW()))
       RETURNING *`,
      [parseInt(roomId), senderId, messageText.trim()]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Failed submitting secure message tracking block node:", err);
    res.status(500).json({ error: 'Structural breakdown committing message log row.' });
  }
});

// ==========================================
// 10.4 CHAT: FETCH ACTIVE DOCUMENTS DIRECTORY (OPTIMIZED)
// ==========================================
app.get('/api/chat/active-documents-directory', requireAuth, async (req, res) => {
  const userId = req.user.u_id;
  const roleId = req.user.a_id;

  try {
    let query = '';
    let params = [];

    if (roleId === 1) {
      query = `
        SELECT idoc.ini_id, idoc.title, idoc.created_at,
          EXISTS (
            SELECT 1 FROM public.chat_rooms cr
            JOIN public.chat_messages cm ON cr.room_id = cm.room_id
            WHERE cr.ini_id = idoc.ini_id
          ) AS "hasAnyChat"
        FROM public.initial_document idoc
        WHERE idoc.u_id = $1
        ORDER BY idoc.ini_id DESC;
      `;
      params = [userId];
    } else if ([2,3,4].includes(Number(roleId))) {
      const userOfficeRes = await pool.query('SELECT o_id FROM public."User" WHERE u_id = $1', [userId]);
      const officeId = userOfficeRes.rows[0]?.o_id;

      if (!officeId) return res.json([]);

      query = `
        SELECT DISTINCT ON (idoc.ini_id) 
          idoc.ini_id, idoc.title, idoc.created_at,
          EXISTS (
            SELECT 1 FROM public.chat_rooms cr
            JOIN public.chat_messages cm ON cr.room_id = cm.room_id
            WHERE cr.ini_id = idoc.ini_id
          ) AS "hasAnyChat"
        FROM public.initial_document idoc
        JOIN public.processed_document pd ON idoc.ini_id = pd.ini_id
        WHERE (pd.current_office_id = $1 OR idoc.submission_office_id = $1)
        ORDER BY idoc.ini_id DESC;
      `;
      params = [officeId];
    } else {
      return res.json([]);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error compiling active chat directory:", err);
    res.status(500).json({ error: 'Failed extraction of operational document parameters directory loops.' });
  }
});

// ==========================================
// 11. INVENTORY: FETCH ALL ITEMS ENDPOINT
// ==========================================
app.get('/api/resources/inventory', async (req, res) => {
  try {
    const query = `
      SELECT 
        ad.asd_id, 
        ad.asset_name, 
        ad.quantity as capacity,
        (ad.quantity - COALESCE(
          (SELECT SUM(qty_borrowed) FROM public.equipment_ledgers el 
           WHERE el.asd_id = ad.asd_id AND el.status = 'Borrowed'), 0
        )) as current_stock
      FROM public.asset_details ad 
      WHERE ad.ast_id = 3
      ORDER BY ad.asd_id ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to grab inventory quantities" });
  }
});

// ==========================================
// 11.1 INVENTORY: PROCESS LENDING ENDPOINT
// ==========================================
app.post('/api/resources/inventory/lend', requireAuth, async (req, res) => {
  const { asd_id, requestorName, department, purpose, quantityNeeded, duration } = req.body;
  try {
    // Basic validation to prevent borrowing more than exists
    const stockCheck = await pool.query(`
      SELECT (quantity - COALESCE((SELECT SUM(qty_borrowed) FROM public.equipment_ledgers WHERE asd_id = $1 AND status = 'Borrowed'), 0)) as current_stock 
      FROM public.asset_details WHERE asd_id = $1
    `, [asd_id]);
    
    if (stockCheck.rows[0].current_stock < quantityNeeded) {
      return res.status(400).json({ error: "Not enough current stock available for this request." });
    }

    await pool.query(`
      INSERT INTO public.equipment_ledgers (asd_id, requestor_name, department, purpose, qty_borrowed, expected_return, status, processed_by)
      VALUES ($1, $2, $3, $4, $5, TIMEZONE('Asia/Manila', NOW()) + interval '1 hour' * $6, 'Borrowed', $7)
    `, [asd_id, requestorName, department, purpose, quantityNeeded, parseInt(duration) || 24, req.user.u_id]);
    
    res.json({ message: "Equipment successfully logged as borrowed." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to process lending transaction." });
  }
});

// ==========================================
// 11.2 INVENTORY: PROCESS RETURN ENDPOINT
// ==========================================
app.post('/api/resources/inventory/return', requireAuth, async (req, res) => {
  const { asd_id, requestorName, quantityReturned, isDamaged, damageNotes } = req.body;
  try {
    const activeLog = await pool.query(`
      SELECT log_id FROM public.equipment_ledgers 
      WHERE asd_id = $1 AND LOWER(requestor_name) = LOWER($2) AND status = 'Borrowed'
      ORDER BY borrowed_at ASC LIMIT 1
    `, [asd_id, requestorName]);

    if (activeLog.rows.length === 0) {
      return res.status(404).json({ error: "No active borrowing record found for this requestor and item." });
    }

    // Determine values to inject based on the boolean flag
    const condition = isDamaged ? 'Damaged' : 'Good';
    const notes = isDamaged ? damageNotes : null;

    await pool.query(`
      UPDATE public.equipment_ledgers 
      SET status = 'Returned', returned_at = TIMEZONE('Asia/Manila', NOW()), processed_by = $1,
          condition_on_return = $3, damage_notes = $4
      WHERE log_id = $2
    `, [req.user.u_id, activeLog.rows[0].log_id, condition, notes]);

    res.json({ message: "Equipment return successfully logged. Stock replenished." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to process return transaction." });
  }
});

// ==========================================
// 11.3 ASSETS: FETCH ALL MASTER ASSETS ENDPOINT
// ==========================================
app.get('/api/resources/assets', async (req, res) => {
  try {
    const query = `
      SELECT ad.asd_id, ad.asset_name, ad.quantity, at.asset_type, at.ast_id,
      (
        SELECT CASE
          WHEN EXISTS (
            SELECT 1 FROM public.asset_blackouts ab 
            WHERE ab.asd_id = ad.asd_id AND TIMEZONE('Asia/Manila', NOW()) BETWEEN ab.start_time AND ab.end_time
          ) THEN 'Maintenance'
          WHEN EXISTS (
            SELECT 1 FROM public.bookings b
            JOIN public.gm_requirements gm ON b.booking_id = gm.booking_id
            WHERE gm.asd_id = ad.asd_id AND b.status = 'Confirmed'
            AND b.reservation_date = (TIMEZONE('Asia/Manila', NOW()))::date
            AND (TIMEZONE('Asia/Manila', NOW()))::time BETWEEN gm.start_time AND gm.end_time
          ) THEN 'Occupied'
          WHEN EXISTS (
            SELECT 1 FROM public.bookings b
            JOIN public.vehicle_requirements vr ON b.booking_id = vr.booking_id
            WHERE vr.asd_id = ad.asd_id AND b.status = 'Confirmed'
            AND b.reservation_date = (TIMEZONE('Asia/Manila', NOW()))::date
            AND (TIMEZONE('Asia/Manila', NOW()))::time BETWEEN vr.pick_up_time AND vr.drop_off_time
          ) THEN 'Occupied'
          ELSE 'Available'
        END
      ) as current_status
      FROM public.asset_details ad
      JOIN public.asset_type at ON ad.ast_id = at.ast_id
      ORDER BY ad.asd_id ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching master assets:", err);
    res.status(500).json({ error: "Failed to load institutional assets" });
  }
});

// ==========================================
// 11.4 ASSETS: FETCH SPECIFIC ASSET SCHEDULE ENDPOINT
// ==========================================
app.get('/api/resources/assets/:id/schedule', async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT b.reservation_date, b.purpose, b.status, u.full_name as requestor,
             COALESCE(gm.start_time, vr.pick_up_time) as start_time,
             COALESCE(gm.end_time, vr.drop_off_time) as end_time
      FROM public.bookings b
      JOIN public."User" u ON b.u_id = u.u_id
      LEFT JOIN public.gm_requirements gm ON b.booking_id = gm.booking_id AND gm.asd_id = $1
      LEFT JOIN public.vehicle_requirements vr ON b.booking_id = vr.booking_id AND vr.asd_id = $1
      WHERE (gm.asd_id = $1 OR vr.asd_id = $1) 
      AND b.status = 'Confirmed'
      AND b.reservation_date >= (TIMEZONE('Asia/Manila', NOW()))::date
      ORDER BY b.reservation_date ASC, start_time ASC
    `;
    const result = await pool.query(query, [id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch schedule." });
  }
});

// ==========================================
// 11.5 ASSETS: EDIT ASSET ENDPOINT
// ==========================================
app.put('/api/resources/assets/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { assetName, quantity } = req.body;
  try {
    await pool.query(
      `UPDATE public.asset_details SET asset_name = $1, quantity = $2 WHERE asd_id = $3`,
      [assetName.trim(), parseInt(quantity), id]
    );
    res.json({ message: 'Asset updated successfully' });
  } catch (err) {
    res.status(500).json({ error: "Failed to update asset" });
  }
});

// ==========================================
// 11.6 ASSETS: DELETE ASSET ENDPOINT
// ==========================================
app.delete('/api/resources/assets/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM public.asset_details WHERE asd_id = $1`, [id]);
    res.json({ message: 'Asset deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: "Cannot delete asset. It may be tied to existing historical records." });
  }
});

// ==========================================
// 11.7 ASSETS: ADD NEW MASTER ASSET ENDPOINT
// ==========================================
app.post('/api/resources/assets', requireAuth, async (req, res) => {
  const { assetName, assetTypeId, quantity } = req.body;
  if (Number(req.user.a_id) !== 4) return res.status(403).json({error:'GSO access required.'});
  if (typeof assetName !== 'string' || !assetName.trim() || ![1,2,3].includes(Number(assetTypeId)) || !Number.isInteger(Number(quantity)) || Number(quantity)<1) {
    return res.status(400).json({error:'Enter a name, a facility/equipment type, and a positive whole-number quantity. Register vehicles separately.'});
  }
  try {
    // Note: assetTypeId maps to ast_id (1: Room, 2: Gym, 3: Furniture/Equipment, 4: Vehicle)
    await pool.query(
      `INSERT INTO public.asset_details (ast_id, asset_name, quantity) VALUES ($1, $2, $3)`,
      [parseInt(assetTypeId), assetName.trim(), parseInt(quantity) || 1]
    );
    res.status(201).json({ message: 'Institutional Asset successfully registered!' });
  } catch (err) {
    console.error("Error adding asset:", err);
    res.status(500).json({ error: "Failed to register new asset to the database" });
  }
});

// ==========================================
// 11.8 ASSETS: FETCH ALL BLACKOUTS ENDPOINT
// ==========================================
app.get('/api/resources/blackouts', async (req, res) => {
  try {
    // JOIN added so the frontend gets the asset_name directly
    const query = `
      SELECT ab.*, ad.asset_name 
      FROM public.asset_blackouts ab
      JOIN public.asset_details ad ON ab.asd_id = ad.asd_id
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch blackout records." });
  }
});

// ==========================================
// 11.9 ASSETS: CREATE NEW BLACKOUT ENDPOINT
// ==========================================
app.post('/api/resources/blackouts', requireAuth, async (req, res) => {
  const { asd_id, start_time, end_time, reason } = req.body;
  try {
    await pool.query(
      `INSERT INTO public.asset_blackouts (asd_id, start_time, end_time, reason, blocked_by) 
       VALUES ($1, $2, $3, $4, $5)`,
      // We added parseInt() here to ensure the database gets a strict number
      [parseInt(asd_id), start_time, end_time, reason, req.user.u_id] 
    );
    res.status(201).json({ message: "Asset successfully blocked." });
  } catch (err) {
    console.error("Blackout Insert Error:", err); // Added this so it's easier to spot in the terminal!
    res.status(500).json({ error: "Failed to apply blackout date." });
  }
});

// ==========================================
// 12. BOOKINGS: FETCH CALENDAR EVENTS ENDPOINT
// ==========================================
require('./resourceSchedulingRoutes')(app, pool, requireAuth);
require('./resourceAdminRoutes')(app, pool, requireAuth);

app.get('/api/resources/bookings', async (req, res) => {
  try {
    const query = `
      SELECT b.booking_id, b.booking_type, to_char(b.reservation_date,'YYYY-MM-DD') AS reservation_date, b.purpose, b.status, u.full_name,
             gm.start_time as gm_start, gm.end_time as gm_end,
             vr.pick_up_time as vr_start, vr.drop_off_time as vr_end, vr.destination,
             ad.asset_name
      FROM public.bookings b
      JOIN public."User" u ON b.u_id = u.u_id
      LEFT JOIN public.gm_requirements gm ON b.booking_id = gm.booking_id
      LEFT JOIN public.vehicle_requirements vr ON b.booking_id = vr.booking_id
      LEFT JOIN public.asset_details ad ON (gm.asd_id = ad.asd_id OR vr.asd_id = ad.asd_id)
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Error pulling calendar events:", err);
    res.status(500).json({ error: "Failed to load calendar reservation entries" });
  }
});

// ==========================================
// 12.1 BOOKINGS: CREATE RESERVATION ENDPOINT
// ==========================================
app.post('/api/resources/book', requireAuth, async (req, res) => {
  const { 
    userId, bookingType, assetName, reservationDate, purpose, department,
    startTime, endTime, expectedAttendees, intendedDates, facilityDetails,
    destination, officialPassengers, serviceTypeId, pickUpTime, dropOffTime,
    preparedByName, preparedByPosition, recommendingApprovalName, recommendingApprovalPosition
  } = req.body;

  const passengerNames = Array.isArray(officialPassengers)
    ? officialPassengers.map(name => typeof name === 'string' ? name.trim() : '') : [];
  if (bookingType === 'Vehicle') {
    const requiredText = [department, purpose, destination, preparedByName, preparedByPosition, recommendingApprovalName, recommendingApprovalPosition];
    if (!requiredText.every(value => typeof value === 'string' && value.trim()) ||
        passengerNames.length === 0 || passengerNames.some(name => !name)) {
      return res.status(400).json({ error: 'Complete the travel details, official passenger names, and both name/position sections.' });
    }
    if (!['1', '2', '3'].includes(String(serviceTypeId))) {
      return res.status(400).json({ error: 'Choose a valid service type.' });
    }
    const validTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value);
    if (!validTime(pickUpTime) || !validTime(dropOffTime) || pickUpTime >= dropOffTime) {
      return res.status(400).json({ error: 'Provide valid travel times, with arrival after departure when both are required.' });
    }
  }

  const isFacility = bookingType === 'Room' || bookingType === 'Gymnasium';
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  const dates = isFacility ? intendedDates : [reservationDate];
  let details = null;
  if (isFacility) {
    if (!Array.isArray(dates) || dates.length === 0 || !dates.every(validDate) || new Set(dates).size !== dates.length) {
      return res.status(400).json({error: 'Provide unique, valid intended dates of use.'});
    }
    const validTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
    if (!validTime(startTime) || !validTime(endTime) || startTime >= endTime ||
        !Number.isInteger(Number(expectedAttendees)) || Number(expectedAttendees) < 1) {
      return res.status(400).json({error: 'Provide valid start/end times and a positive whole-number attendance.'});
    }
    if (!facilityDetails || typeof facilityDetails !== 'object' || Array.isArray(facilityDetails) ||
        typeof department !== 'string' || !department.trim()) {
      return res.status(400).json({error: 'Complete the facility request details and requesting office.'});
    }
    details = {};
    const groups = {
      purposes: ['Seminar/Training', 'Meeting', 'Special Class/Class Activity', 'Acquaintance', 'Presentation', 'Others'],
      participants: ['Faculty', 'Student', 'External Partners', 'Staff', 'Parents', 'Others'],
      miscellaneous: ['Basic Sound System', 'Operator', 'Maintenance Personnel', 'Others']
    };
    for (const [key, options] of Object.entries(groups)) {
      const selected = facilityDetails[key] ?? [];
      if (!Array.isArray(selected) || (key !== 'miscellaneous' && !selected.length) || selected.some(value => !options.includes(value))) {
        return res.status(400).json({error: `Choose valid ${key}.`});
      }
      details[key] = [...new Set(selected)];
      if (selected.includes('Others')) {
        const other = facilityDetails[`${key}Other`];
        if (typeof other !== 'string' || !other.trim()) return res.status(400).json({error: `Specify other ${key}.`});
        details[`${key}Other`] = other.trim();
      }
    }
    for (const key of ['personInChargeName', 'personInChargePosition', 'requestedByName', 'requestedByPosition', 'reviewedByName', 'reviewedByPosition', 'approvedByName', 'approvedByPosition']) {
      if (typeof facilityDetails[key] !== 'string' || !facilityDetails[key].trim()) {
        return res.status(400).json({error: 'Complete all name and position fields.'});
      }
      details[key] = facilityDetails[key].trim();
    }
    if (facilityDetails.remarks != null && typeof facilityDetails.remarks !== 'string') {
      return res.status(400).json({error: 'Remarks must be text.'});
    }
    details.remarks = (facilityDetails.remarks || '').trim();
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await lockSchedule(client);

    const assetRes = await client.query(`SELECT asd_id FROM public.asset_details WHERE ast_id = CASE $2 WHEN 'Vehicle' THEN 4 WHEN 'Room' THEN 1 WHEN 'Gymnasium' THEN 2 END ORDER BY (asset_name = $1) DESC, asd_id LIMIT 1`, [assetName, bookingType]);
    if (assetRes.rows.length === 0) throw new Error("Target university asset resource not registered.");
    const asdId = assetRes.rows[0].asd_id;

    for (const requestedDate of dates) {
    const free = await availability(client, {date:requestedDate, start:isFacility ? startTime : pickUpTime, end:isFacility ? endTime : dropOffTime, type:bookingType, assetName});
    if (!free.available) throw Object.assign(new Error(free.reason), {status:409});

    // Insert the booking
    const bookingRes = await client.query(
      `INSERT INTO public.bookings (u_id, booking_type, department, reservation_date, purpose, status)
       VALUES ($1, $2, $3, $4, $5, 'Reserved') RETURNING booking_id`,
      [req.user.u_id, bookingType, department, requestedDate, isFacility ? details.purposes.map(value => value === 'Others' ? details.purposesOther : value).join(', ') : purpose]
    );
    const bookingId = bookingRes.rows[0].booking_id;

    if (bookingType === 'Room' || bookingType === 'Gymnasium') {
      await client.query(
        `INSERT INTO public.gm_requirements (asd_id, booking_id, start_time, end_time, expected_attendees, request_details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [asdId, bookingId, startTime, endTime, expectedAttendees, JSON.stringify(details)]
      );
    } else if (bookingType === 'Vehicle') {
      const finalizedPickUp = pickUpTime && pickUpTime.trim() !== "" ? pickUpTime : "00:00:00";
      const finalizedDropOff = dropOffTime && dropOffTime.trim() !== "" ? dropOffTime : "00:00:00";

      await client.query(
        `INSERT INTO public.vehicle_requirements (asd_id, sv_id, booking_id, destination, passenger_count, pick_up_time, drop_off_time,
          official_passengers, prepared_by_name, prepared_by_position, recommending_approval_name, recommending_approval_position)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [asdId, parseInt(serviceTypeId) || 3, bookingId, destination, passengerNames.length, finalizedPickUp, finalizedDropOff,
          passengerNames, preparedByName.trim(), preparedByPosition.trim(), recommendingApprovalName.trim(), recommendingApprovalPosition.trim()]
      );
    }

    }

    await client.query('COMMIT');
    res.status(201).json({ message: "Request submitted. Confirmation requires the necessary documents to be submitted in person at the GSO office and review by the responsible officers." });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(err.status || 500).json({ error: err.message || "Failed transactional database commitment sequence." });
  } finally {
    client.release();
  }
});

// ==========================================
// 13. PROCUREMENT: FETCH ALL RESERVATIONS ENDPOINT
// ==========================================
app.get('/api/procurement/reservations', requireAuth, async (req, res) => {
  try {
    const query = `
      SELECT b.booking_id, b.booking_type, to_char(b.reservation_date,'YYYY-MM-DD') AS reservation_date, b.purpose, b.status,
             b.created_at, 
             CASE 
                WHEN b.status = 'Confirmed' THEN b.updated_at 
                ELSE NULL 
             END as updated_at,
             u.full_name as requestor,
             COALESCE(gm.start_time, vr.pick_up_time) as start_time,
             COALESCE(gm.end_time, vr.drop_off_time) as end_time,
             ad.asset_name
      FROM public.bookings b
      JOIN public."User" u ON b.u_id = u.u_id
      LEFT JOIN public.gm_requirements gm ON b.booking_id = gm.booking_id
      LEFT JOIN public.vehicle_requirements vr ON b.booking_id = vr.booking_id
      LEFT JOIN public.asset_details ad ON (gm.asd_id = ad.asd_id OR vr.asd_id = ad.asd_id)
      ORDER BY b.reservation_date DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch procurement reservations." });
  }
});

// ==========================================
// 13.1 PROCUREMENT: FETCH LOGISTICS HISTORY ENDPOINT
// ==========================================
app.get('/api/procurement/logistics', requireAuth, async (req, res) => {
  try {
    const query = `
      SELECT 
        el.log_id,
        ad.asset_name, 
        el.requestor_name, 
        el.qty_borrowed, 
        el.borrowed_at, 
        el.returned_at,
        el.status,
        el.condition_on_return,
        el.damage_notes
      FROM public.equipment_ledgers el
      JOIN public.asset_details ad ON el.asd_id = ad.asd_id
      ORDER BY el.borrowed_at DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch logistics history." });
  }
});

// ==========================================
// 13.2 PROCUREMENT: GET & SYNC BOOKING CHECKLIST ENDPOINT
// ==========================================
app.get('/api/procurement/checklists/:bookingId/:type', requireAuth, async (req, res) => {
  const { bookingId, type } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Check if this booking already has checklist items
    const existingChecklist = await client.query('SELECT * FROM public.booking_checklists WHERE booking_id = $1', [bookingId]);
    
    if (existingChecklist.rows.length === 0) {
      // 2. If empty, generate them from the global template
      const templates = await client.query('SELECT item_name FROM public.checklist_templates WHERE booking_type = $1', [type]);
      if (templates.rows.length > 0) {
        for (let t of templates.rows) {
          await client.query(
            'INSERT INTO public.booking_checklists (booking_id, item_name, is_checked) VALUES ($1, $2, false)',
            [bookingId, t.item_name]
          );
        }
      }
    }
    
    // 3. Return the checklist state
    const currentChecklist = await client.query('SELECT * FROM public.booking_checklists WHERE booking_id = $1 ORDER BY check_id ASC', [bookingId]);
    await client.query('COMMIT');
    res.json(currentChecklist.rows);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: "Failed to fetch checklist." });
  } finally {
    client.release();
  }
});

// ==========================================
// 13.3 PROCUREMENT: UPDATE CHECKLIST STATUS ENDPOINT
// ==========================================
app.put('/api/procurement/checklists/:checkId', requireAuth, async (req, res) => {
  if (Number(req.user.a_id) !== 4) return res.status(403).json({error:'GSO administrator access required.'});
  const { checkId } = req.params;
  const { isChecked, bookingId } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await lockSchedule(client);
    if (typeof isChecked !== 'boolean') throw new Error('Invalid checklist value.');
    
    // Update specific item
    const updated = await client.query('UPDATE public.booking_checklists SET is_checked = $1 WHERE check_id = $2 AND booking_id = $3 RETURNING check_id', [isChecked, checkId, bookingId]);
    if (!updated.rows.length) throw new Error('Checklist item does not belong to this request.');
    
    // Check if ALL items for this booking are now ticked off
    const allItems = await client.query('SELECT is_checked FROM public.booking_checklists WHERE booking_id = $1', [bookingId]);
    const allChecked = allItems.rows.every(item => item.is_checked === true);
    
    // Auto-update booking status if requirements are met
// Auto-update booking status if requirements are met
  if (allChecked && allItems.rows.length > 0) {
    await assertConfirmable(client, bookingId);
    await client.query("UPDATE public.bookings SET status = 'Confirmed', updated_at = timezone('Asia/Manila', now()) WHERE booking_id = $1", [bookingId]);
  } else {
    await client.query("UPDATE public.bookings SET status = 'Reserved' WHERE booking_id = $1", [bookingId]);
  }

    await client.query('COMMIT');
    res.json({ message: "Checklist updated", allChecked });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(err.status || 400).json({ error: err.message || "Failed to update checklist status." });
  } finally {
    client.release();
  }
});

// ==========================================
// 13.4 PROCUREMENT: GET MASTER TEMPLATES ENDPOINT
// ==========================================
app.get('/api/procurement/templates/:type', requireAuth, async (req, res) => {
  try {
    const { type } = req.params;
    const result = await pool.query(
      'SELECT template_id, item_name, booking_type FROM public.checklist_templates WHERE booking_type = $1 ORDER BY template_id ASC', 
      [type]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch master checklist templates." });
  }
});

// ==========================================
// 13.5 PROCUREMENT: POST NEW MASTER TEMPLATE ITEM ENDPOINT
// ==========================================
app.post('/api/procurement/templates', requireAuth, async (req, res) => {
  try {
    const { bookingType, itemName } = req.body;
    await pool.query(
      'INSERT INTO public.checklist_templates (booking_type, item_name) VALUES ($1, $2)', 
      [bookingType, itemName]
    );
    res.status(201).json({ message: "Template item successfully added." });
  } catch (err) {
    res.status(500).json({ error: "Failed to add template item." });
  }
});

// ==========================================
// 13.6 PROCUREMENT: DELETE MASTER TEMPLATE ITEM ENDPOINT
// ==========================================
app.delete('/api/procurement/templates/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      'DELETE FROM public.checklist_templates WHERE template_id = $1', 
      [id]
    );
    res.json({ message: "Template item permanently removed." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete template item." });
  }
});

// ==========================================
// 14. ADMIN: FETCH INFRASTRUCTURE SUMMARY ENDPOINT
// ==========================================
app.get('/api/admin/infrastructure-summary', async (req, res) => {
  try {
    const deptRes = await pool.query('SELECT d_id AS id, department_name AS name FROM public.department ORDER BY department_name ASC');
    const roleStatsRes = await pool.query(`
      SELECT a.account_type, COUNT(u.u_id)::int as total_staff 
      FROM public.account a 
      LEFT JOIN public."User" u ON a.a_id = u.a_id 
      GROUP BY a.account_type, a.a_id 
      ORDER BY a.a_id ASC
    `);
    const officeCapacityRes = await pool.query(`
      SELECT off.office_name, COUNT(u.u_id)::int as staff_count 
      FROM public.offices off 
      LEFT JOIN public."User" u ON off.o_id = u.o_id 
      GROUP BY off.office_name 
      ORDER BY office_name ASC
    `);

    res.json({
      departments: deptRes.rows,
      roleStatistics: roleStatsRes.rows,
      officeCapacity: officeCapacityRes.rows
    });
  } catch (err) {
    console.error("Summary analytical loading fault:", err);
    res.status(500).json({ error: 'Failed compilation aggregate system status metrics loops.' });
  }
});

// ==========================================
// 14.1 ADMIN: FETCH DASHBOARD METRICS ENDPOINT
// ==========================================
app.get('/api/admin/dashboard-metrics', async (req, res) => {
  try {
    const activeTracksRes = await pool.query(
      'SELECT COUNT(DISTINCT ini_id)::int as total FROM public.processed_document WHERE time_out IS NULL'
    );

    const systemUsersRes = await pool.query(
      'SELECT COUNT(u_id)::int as total FROM public."User"'
    );

    const workflowsCountRes = await pool.query(
      'SELECT COUNT(p_id)::int as total FROM public.process_type'
    );

    const liveFeedQuery = `
      SELECT 
        h.history_id,
        h.action_type,
        CASE WHEN h.legacy_manila_wall_time THEN h.action_timestamp - INTERVAL '8 hours' ELSE h.action_timestamp END AS action_timestamp,
        u.full_name as operator_name,
        off.office_name,
        idoc.title as document_title
      FROM public.office_action_history h
      JOIN public."User" u ON h.u_id = u.u_id
      JOIN public.initial_document idoc ON h.ini_id = idoc.ini_id
      LEFT JOIN public.offices off ON h.o_id = off.o_id
      ORDER BY h.history_id DESC
      LIMIT 15;
    `;
    const liveFeedRes = await pool.query(liveFeedQuery);

    const bottlenecksQuery = `
      SELECT 
        idoc.title as document_title,
        off.office_name,
        pdoc.time_in,
        EXTRACT(EPOCH FROM (TIMEZONE('Asia/Manila', NOW()) - pdoc.time_in))/3600 as hours_stalled
      FROM public.processed_document pdoc
      JOIN public.initial_document idoc ON pdoc.ini_id = idoc.ini_id
      JOIN public.offices off ON pdoc.current_office_id = off.o_id
      WHERE pdoc.time_in IS NOT NULL 
        AND pdoc.time_out IS NULL
        AND pdoc.time_in < TIMEZONE('Asia/Manila', NOW()) - INTERVAL '48 hours'
      ORDER BY pdoc.time_in ASC;
    `;
    const bottlenecksRes = await pool.query(bottlenecksQuery);

    res.json({
      counters: {
        activeTracks: activeTracksRes.rows[0].total,
        systemUsers: systemUsersRes.rows[0].total,
        workflowBlueprints: workflowsCountRes.rows[0].total
      },
      liveAuditTrail: liveFeedRes.rows,
      stalledBottlenecks: bottlenecksRes.rows
    });

  } catch (err) {
    console.error("Dashboard operations metrics collection exception:", err);
    res.status(500).json({ error: 'Failed aggregate calculation sequences for dashboard indicators.' });
  }
});

// ==========================================
// 15. ANALYTICS: PEAK DEMAND MICROSERVICE PROXY
// ==========================================
const PYTHON_MICROSERVICE_URL = process.env.PYTHON_MICROSERVICE_URL || 'http://localhost:8000';
app.get('/api/analytics/peak-demand', requireAuth, async (req, res) => {
    try {
        const response = await axios.get(`${PYTHON_MICROSERVICE_URL}/api/analytics/peak-demand`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching peak demand analytics:', error.message);
        res.status(500).json({ message: 'Analytics service unavailable' });
    }
});

// ==========================================
// 15.1 ANALYTICS: BOTTLENECKS MICROSERVICE PROXY
// ==========================================
app.get('/api/analytics/bottlenecks', async (req, res) => {
    try {
        const response = await axios.get(`${PYTHON_MICROSERVICE_URL}/api/analytics/bottlenecks`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching bottleneck analytics:', error.message);
        res.status(500).json({ message: 'Analytics service unavailable' });
    }
});

// ==========================================
// 15.2 ANALYTICS: EDC MICROSERVICE PROXY
// ==========================================
app.get('/api/analytics/edc', requireAuth, async (req, res) => {
    try {
        const response = await axios.get(`${PYTHON_MICROSERVICE_URL}/api/analytics/edc`, {params: req.query.route ? {route: req.query.route} : undefined});
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching EDC analytics:', error.message);
        res.status(500).json({ message: 'Analytics service unavailable' });
    }
});

// ==========================================
// 15.3 ANALYTICS: ROUTE PERFORMANCE MICROSERVICE PROXY
// ==========================================
app.get('/api/analytics/route-performance', requireAuth, async (req, res) => {
  try {
      const response = await axios.get(`${PYTHON_MICROSERVICE_URL}/api/analytics/route-performance`);
      res.json(response.data);
  } catch (error) {
      console.error('Error fetching route performance analytics:', error.message);
      res.status(500).json({ message: 'Analytics service unavailable' });
  }
});

// ==========================================
// 15.4 ANALYTICS: SYSTEM HEALTH MICROSERVICE PROXY
// ==========================================
app.get('/api/analytics/system-health', requireAuth, async (req, res) => {
  try {
      const response = await axios.get(`${PYTHON_MICROSERVICE_URL}/api/analytics/system-health`);
      res.json(response.data);
  } catch (error) {
      console.error('Error fetching system health analytics:', error.message);
      res.status(500).json({ message: 'Analytics service unavailable' });
  }
});

// ==========================================
// 16. SERVER EXECUTION & ENTRY POINT
// ==========================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
