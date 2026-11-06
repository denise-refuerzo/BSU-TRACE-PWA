const test = require('node:test');
const assert = require('node:assert/strict');
const {renderBookingEmail,renderResetCodeEmail,renderTrackingAlertEmail,renderSystemEmail,buildMailOptions} = require('./mailer');

test('booking email includes formatted details and a plain-text fallback', () => {
  const email = renderBookingEmail({
    bookingType:'Room',purpose:'Seminar <script>alert(1)</script>',status:'Cancelled',
    date:'2026-11-05',start:'09:00',end:'11:00',reason:'Venue & equipment unavailable',
    message:'The request was cancelled.'
  });
  assert.match(email.subject,/Room booking cancelled/);
  assert.match(email.text,/Do not reply.*GSO Office/);
  assert.match(email.text,/Venue & equipment unavailable/);
  assert.match(email.html,/Booking update/);
  assert.match(email.html,/Seminar &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(email.html,/Venue &amp; equipment unavailable/);
  assert.doesNotMatch(email.html,/<script>/);
  assert.match(email.text,/Please do not reply to this email/);
  assert.match(email.html,/Please do not reply to this email/);
});

test('all outgoing email types use the same sender and shared layout', () => {
  const emails = [
    renderResetCodeEmail('Alex <admin>','123456'),
    renderTrackingAlertEmail('Alex','Report & notes','Completed','Your document is ready.'),
    renderSystemEmail('BSU-Trace Login Verification','Your verification code is: 654321.'),
    renderBookingEmail({bookingType:'Vehicle',purpose:'Trip',status:'Completed',date:'2026-11-06',start:'09:00',end:'11:00',message:'The trip is completed.'})
  ];
  for (const email of emails) {
    const options = buildMailOptions('requester@example.edu', email);
    assert.equal(options.from.name,'BSU-Trace System');
    assert.equal(options.from.address,process.env.EMAIL_USER);
    assert.match(options.html,/BSU-Trace System/);
    assert.match(options.html,/Please do not reply to this email/);
    assert.match(options.text,/Please do not reply to this email/);
    assert.ok(options.subject && options.text && options.html);
  }
  assert.match(emails[0].html,/Alex &lt;admin&gt;/);
  assert.match(emails[1].html,/Report &amp; notes/);
  assert.match(emails[0].text,/123456/);
  assert.match(emails[2].text,/654321/);
});

test('vehicle assignment email names the pair and distinguishes reassignment', () => {
  const email = renderBookingEmail({
    bookingType:'Vehicle',purpose:'Campus trip',status:'Resource Reassigned',
    event:'vehicle or driver reassigned',date:'2026-11-10',start:'09:00',end:'11:00',
    vehicleName:'Van <2>',driverName:'Driver B',previousVehicle:'Van 1',previousDriver:'Driver A',
    message:'Your assigned pair changed.'
  });
  assert.match(email.subject,/vehicle or driver reassigned/);
  assert.match(email.text,/Previous vehicle: Van 1/);
  assert.match(email.text,/Driver: Driver B/);
  assert.match(email.html,/Van &lt;2&gt;/);
});
