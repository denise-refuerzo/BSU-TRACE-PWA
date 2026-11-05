const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS}
});

const SENDER_NAME = 'BSU-Trace System';
const FOOTER = 'This is an automated message from BSU-Trace. Please do not reply to this email. For help, contact the relevant university office or check your BSU-Trace account.';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

function renderEmail({subject, title, message, details = [], note}) {
  const text = [
    title, '', message,
    ...(details.length ? ['', ...details.map(([label, value]) => `${label}: ${value}`)] : []),
    ...(note ? ['', note] : []),
    '', FOOTER
  ].join('\n');
  const rows = details.map(([label, value]) => `<tr><th style="padding:10px 12px;text-align:left;vertical-align:top;color:#6b7280;font-size:13px;font-weight:600;width:120px;border-bottom:1px solid #e5e7eb">${escapeHtml(label)}</th><td style="padding:10px 12px;color:#111827;font-size:14px;line-height:1.5;border-bottom:1px solid #e5e7eb">${escapeHtml(value)}</td></tr>`).join('');
  const html = `<div style="background:#f8f5f5;padding:28px 12px;font-family:Arial,Helvetica,sans-serif;color:#111827">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e7dede;border-radius:12px;overflow:hidden">
      <div style="background:#800000;padding:22px 28px;color:#ffffff">
        <div style="font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">BSU-Trace System</div>
        <h1 style="font-size:22px;line-height:1.3;margin:8px 0 0">${escapeHtml(title)}</h1>
      </div>
      <div style="padding:26px 28px">
        <p style="font-size:15px;line-height:1.6;margin:0 0 18px">${escapeHtml(message).replace(/\n/g, '<br>')}</p>
        ${rows ? `<table role="presentation" style="width:100%;border-collapse:collapse;background:#fafafa;border:1px solid #e5e7eb;border-radius:8px">${rows}</table>` : ''}
        ${note ? `<p style="font-size:13px;line-height:1.5;color:#4b5563;margin:20px 0 0">${escapeHtml(note)}</p>` : ''}
      </div>
      <div style="padding:18px 28px;background:#faf7f7;border-top:1px solid #eee5e5">
        <p style="font-size:12px;line-height:1.5;color:#6b7280;margin:0">${escapeHtml(FOOTER)}</p>
      </div>
    </div>
  </div>`;
  return {subject, text, html};
}

function buildMailOptions(toEmail, content) {
  return {from: {name: SENDER_NAME, address: process.env.EMAIL_USER}, to: toEmail, ...content};
}

async function deliver(toEmail, content, category) {
  try {
    await transporter.sendMail(buildMailOptions(toEmail, content));
    return {success: true};
  } catch (error) {
    console.error(`${category} email failed:`, error);
    return {success: false, error: error.message};
  }
}

function renderResetCodeEmail(username, code) {
  return renderEmail({
    subject: 'BSU-Trace Password Reset Verification Code',
    title: 'Password reset',
    message: `Hello ${username}, we received a request to reset the password for your university portal account.`,
    details: [['Verification code', code]],
    note: 'This code is valid for 10 minutes. If you did not request it, you can ignore this message or contact ICT Support.'
  });
}

const sendResetCodeEmail = (toEmail, username, code) => deliver(toEmail, renderResetCodeEmail(username, code), 'Password reset');

function renderTrackingAlertEmail(fullName, documentTitle, currentStatus, bodyText) {
  return renderEmail({
    subject: 'BSU-Trace Notification: Document Status Updated',
    title: 'Document update',
    message: `Hello ${fullName},\n${bodyText}`,
    details: [['Document', documentTitle], ['Current status', currentStatus]],
    note: 'Check your BSU-Trace account for the full document history.'
  });
}

const sendTrackingAlertEmail = (toEmail, fullName, documentTitle, currentStatus, bodyText) =>
  deliver(toEmail, renderTrackingAlertEmail(fullName, documentTitle, currentStatus, bodyText), 'Document update');

function renderSystemEmail(subject, textBody) {
  return renderEmail({subject, title: subject, message: textBody});
}

const sendSystemEmail = (toEmail, subject, textBody) => deliver(toEmail, renderSystemEmail(subject, textBody), 'System');

const bookingTypeLabel = type => type === 'Room' ? 'Multimedia Room' : type === 'Gymnasium' ? 'Gymnasium' : 'Vehicle';

function renderBookingEmail({bookingType, purpose, status, event, date, start, end, reason,
  vehicleName, driverName, previousVehicle, previousDriver, message}) {
  const label = bookingTypeLabel(bookingType);
  const details = [
    ['Request', purpose || 'Booking'],
    ['Resource', label],
    ['Date', date || 'Not specified'],
    ['Time', start && end ? `${String(start).slice(0, 5)}–${String(end).slice(0, 5)}` : 'Not specified'],
    ['Status', status]
  ];
  if (vehicleName) details.push(['Vehicle', vehicleName]);
  if (driverName) details.push(['Driver', driverName]);
  if (previousVehicle) details.push(['Previous vehicle', previousVehicle]);
  if (previousDriver) details.push(['Previous driver', previousDriver]);
  if (reason) details.push(['Reason', reason]);
  return renderEmail({
    subject: `BSU-Trace: ${label} booking ${String(event || status).toLowerCase()}`,
    title: 'Booking update',
    message,
    details,
    note: 'For booking questions, contact the GSO Office or check your BSU-Trace request history.'
  });
}

const sendBookingUpdateEmail = (toEmail, details) => deliver(toEmail, renderBookingEmail(details), 'Booking update');

module.exports = {
  sendResetCodeEmail, sendTrackingAlertEmail, sendSystemEmail, sendBookingUpdateEmail,
  renderResetCodeEmail, renderTrackingAlertEmail, renderSystemEmail, renderBookingEmail,
  buildMailOptions
};
