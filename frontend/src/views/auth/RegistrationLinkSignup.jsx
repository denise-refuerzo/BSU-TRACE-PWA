import { useEffect, useId, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  CircleHelp,
  Eye,
  EyeOff,
  GraduationCap,
  ShieldCheck
} from 'lucide-react';
import { API_BASE_URL } from '../../api';

const OFFICIAL_EMAIL_PATTERN = /^[a-z0-9._%+-]+@g\.batstate-u\.edu\.ph$/;
const PASSWORD_REQUIREMENTS = [
  { label: '8 characters', test: password => password.length >= 8 },
  { label: 'an uppercase letter', test: password => /[A-Z]/.test(password) },
  { label: 'a lowercase letter', test: password => /[a-z]/.test(password) },
  { label: 'a number', test: password => /[0-9]/.test(password) },
  { label: 'a special character', test: password => /[^A-Za-z0-9\s]/.test(password) }
];

function RequirementHelp({ label, children }) {
  const [open, setOpen] = useState(false);
  const helpId = useId();

  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={`Show ${label} requirements`}
        aria-expanded={open}
        aria-controls={helpId}
        onClick={() => setOpen(current => !current)}
        onBlur={() => setOpen(false)}
        className="rounded-full text-neutral-400 transition hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"
      >
        <CircleHelp size={16} aria-hidden="true" />
      </button>
      <span
        id={helpId}
        role="tooltip"
        className={`absolute bottom-full right-0 z-20 mb-2 w-64 rounded-xl bg-neutral-900 p-3 text-left text-xs font-normal leading-5 text-white shadow-xl transition-opacity ${open ? 'visible opacity-100' : 'invisible opacity-0 group-hover:visible group-hover:opacity-100'}`}
      >
        {children}
      </span>
    </span>
  );
}

function PasswordInput({ id, label, value, onChange, onBlur, autoComplete, help, error }) {
  const [visible, setVisible] = useState(false);
  const errorId = `${id}-error`;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-bold text-neutral-700">{label}</label>
        {help}
      </div>
      <div className="relative mt-1">
        <input
          id={id}
          required
          minLength={8}
          maxLength={128}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`w-full rounded-lg border px-3 py-2.5 pr-11 text-sm font-normal focus:outline-none focus:ring-1 ${error ? 'border-red-500 focus:border-red-600 focus:ring-red-600' : 'border-neutral-300 focus:border-red-700 focus:ring-red-700'}`}
        />
        <button
          type="button"
          onClick={() => setVisible(current => !current)}
          aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-neutral-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-700"
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {error && <p id={errorId} className="mt-1 text-xs font-medium text-red-600" role="alert">{error}</p>}
    </div>
  );
}

export default function RegistrationLinkSignup() {
  const { token } = useParams();
  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmationTouched, setConfirmationTouched] = useState(false);
  const [form, setForm] = useState({ fullName: '', username: '', email: '', facultyId: '', password: '', confirmPassword: '' });

  const missingPasswordRequirements = PASSWORD_REQUIREMENTS.filter(requirement => !requirement.test(form.password));
  const passwordIsValid = missingPasswordRequirements.length === 0;
  const passwordsMatch = form.confirmPassword.length > 0 && form.password === form.confirmPassword;
  const passwordError = passwordTouched && !passwordIsValid
    ? form.password.length === 0
      ? 'Password is required.'
      : `Missing: ${missingPasswordRequirements.map(requirement => requirement.label).join(', ')}.`
    : '';
  const confirmationError = confirmationTouched && !passwordsMatch
    ? form.confirmPassword.length === 0 ? 'Please confirm your password.' : 'Passwords do not match.'
    : '';

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE_URL}/api/public/registration-links/${encodeURIComponent(token)}`)
      .then(async response => ({ response, data: await response.json() }))
      .then(({ response, data }) => {
        if (!active) return;
        if (!response.ok) throw new Error(data.error || 'This registration link is unavailable.');
        setLink(data);
      })
      .catch(fetchError => active && setError(fetchError.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [token]);

  const updateForm = (field, value) => setForm(current => ({ ...current, [field]: value }));

  const submit = async event => {
    event.preventDefault();
    setError('');
    if (!OFFICIAL_EMAIL_PATTERN.test(form.email)) return setError('Use an official university email ending in @g.batstate-u.edu.ph.');
    if (!passwordIsValid) {
      setPasswordTouched(true);
      return;
    }
    if (!passwordsMatch) {
      setConfirmationTouched(true);
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/public/registration-links/${encodeURIComponent(token)}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 404 || response.status === 410) setLink(null);
        throw new Error(data.error || 'Unable to create your account.');
      }
      setSuccess(true);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF8F5] px-4 py-10 text-neutral-800">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 flex items-center gap-3">
          <img src="/bsu-logo.png" alt="Batangas State University" className="h-14 w-auto" />
          <div>
            <h1 className="text-xl font-black">BSU - Trace</h1>
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">Secure Account Registration</p>
          </div>
        </header>

        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xl md:p-8">
          {loading ? (
            <p className="py-16 text-center text-sm text-neutral-500">Validating your registration link...</p>
          ) : error && !link ? (
            <div className="py-12 text-center">
              <ShieldCheck className="mx-auto text-red-700" size={42} />
              <h2 className="mt-4 text-xl font-black">Registration unavailable</h2>
              <p className="mt-2 text-sm text-neutral-600">{error}</p>
              <Link to="/login" className="mt-6 inline-block rounded-lg bg-red-800 px-5 py-2.5 text-sm font-bold text-white">Return to sign in</Link>
            </div>
          ) : success ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="mx-auto text-emerald-600" size={48} />
              <h2 className="mt-4 text-2xl font-black">Account created</h2>
              <p className="mt-2 text-sm text-neutral-600">Your registration was completed successfully. You may now sign in.</p>
              <Link to="/login" className="mt-6 inline-block rounded-lg bg-red-800 px-6 py-3 text-sm font-bold text-white">Continue to sign in</Link>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  {link.accountType === 1 ? <GraduationCap className="text-red-700" /> : <Building2 className="text-red-700" />}
                  <div>
                    <h2 className="font-black text-neutral-900">{link.accountTypeName} registration</h2>
                    <p className="mt-1 text-sm text-neutral-600">Assigned to <strong>{link.officeName || link.departmentName}</strong></p>
                    <p className="mt-1 text-xs text-neutral-500">Expires {new Date(link.expiresAt).toLocaleString()} · {link.remainingRegistrations} registration{link.remainingRegistrations === 1 ? '' : 's'} remaining</p>
                  </div>
                </div>
              </div>

              <form onSubmit={submit} className="mt-6 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-xs font-bold text-neutral-700">Full name
                    <input required maxLength={100} autoComplete="name" value={form.fullName} onChange={event => updateForm('fullName', event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm font-normal focus:border-red-700 focus:outline-none focus:ring-1 focus:ring-red-700" />
                  </label>
                  <label className="text-xs font-bold text-neutral-700">Username
                    <input required maxLength={50} autoComplete="username" value={form.username} onChange={event => updateForm('username', event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm font-normal focus:border-red-700 focus:outline-none focus:ring-1 focus:ring-red-700" />
                  </label>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="registration-email" className="text-xs font-bold text-neutral-700">University email</label>
                    <RequirementHelp label="university email">
                      Use your official university email. It must end exactly in <strong>@g.batstate-u.edu.ph</strong>.
                    </RequirementHelp>
                  </div>
                  <input
                    id="registration-email"
                    required
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={event => updateForm('email', event.target.value.toLowerCase())}
                    aria-describedby="registration-email-help"
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm font-normal focus:border-red-700 focus:outline-none focus:ring-1 focus:ring-red-700"
                  />
                  <p id="registration-email-help" className="mt-1 text-xs font-normal text-neutral-400">Must end in @g.batstate-u.edu.ph</p>
                </div>

                {link.accountType === 1 && (
                  <label className="block text-xs font-bold text-neutral-700">Faculty ID <span className="font-normal text-neutral-400">(optional)</span>
                    <input maxLength={50} value={form.facultyId} onChange={event => updateForm('facultyId', event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm font-normal focus:border-red-700 focus:outline-none focus:ring-1 focus:ring-red-700" />
                  </label>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <PasswordInput
                    id="registration-password"
                    label="Password"
                    value={form.password}
                    autoComplete="new-password"
                    onChange={event => updateForm('password', event.target.value)}
                    onBlur={() => setPasswordTouched(true)}
                    error={passwordError}
                    help={(
                      <RequirementHelp label="password">
                        Use at least 8 characters with uppercase and lowercase letters, a number, and a special character.
                      </RequirementHelp>
                    )}
                  />
                  <PasswordInput
                    id="registration-confirm-password"
                    label="Confirm password"
                    value={form.confirmPassword}
                    autoComplete="new-password"
                    onChange={event => updateForm('confirmPassword', event.target.value)}
                    onBlur={() => setConfirmationTouched(true)}
                    error={confirmationError}
                  />
                </div>

                {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{error}</p>}
                <button disabled={submitting} className="w-full rounded-xl bg-red-800 px-5 py-3 text-sm font-black text-white hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-60">
                  {submitting ? 'Creating secure account...' : 'Create account'}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
