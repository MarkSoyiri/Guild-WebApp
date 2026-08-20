import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Crosshair, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Input';
import { Tabs } from '../components/ui/Tabs';
import { DEMO_ACCOUNTS } from '../lib/constants';
import { post } from '../lib/api';

type Tab = 'login' | 'register';

export function AuthPage() {
  const { isAuthenticated, isLoading, login, register } = useAuth();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(searchParams.get('tab') === 'register' ? 'register' : 'login');
  const navigate = useNavigate();

  if (isAuthenticated && !isLoading) return <Navigate to="/app" replace />;

  return (
    <div className="relative flex min-h-screen flex-col bg-bg">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-grid [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden />
      <header className="relative border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-[420px] items-center px-4">
          <div className="flex items-center gap-2.5">
            <div className="clip-notch-sm flex h-9 w-9 items-center justify-center bg-gradient-to-br from-accent to-accent-2 font-display text-[15px] font-bold text-on-accent">
              KO
            </div>
            <span className="font-display text-[15px] font-bold tracking-wide text-text">KINGS ONLY</span>
          </div>
        </div>
      </header>

      <main className="relative mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center px-4 py-10">
        <p className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
          <span className="h-1.5 w-1.5 rotate-45 bg-accent" aria-hidden />
          {tab === 'login' ? 'Command center access' : 'New recruit'}
        </p>
        <h1 className="mb-1 font-display text-[28px] font-bold leading-tight tracking-[-0.02em] text-text">
          {tab === 'login' ? 'Welcome back, soldier' : 'Claim your spot'}
        </h1>
        <p className="mb-6 text-[13px] text-muted">
          {tab === 'login' ? 'Drop in and get to the action.' : 'Create an account, then request a spot on the roster.'}
        </p>

        <Tabs<Tab>
          className="mb-6"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'login', label: 'Sign in' },
            { value: 'register', label: 'Register' },
          ]}
        />

        {tab === 'login' ? (
          <LoginForm onLogin={async (identifier, password) => { await login(identifier, password); navigate('/app'); }} />
        ) : (
          <RegisterForm onRegister={async (input) => { await register(input); navigate('/app'); }} />
        )}

        {import.meta.env.DEV ? (
          <div className="corner-brackets mt-8 rounded-xl border border-border bg-gradient-to-b from-surface to-panel p-4">
            <div className="hud-divider mb-3" aria-hidden />
            <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
              <Crosshair size={12} className="text-accent" aria-hidden /> Test accounts
            </p>
            <div className="flex flex-col gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.identifier}
                  type="button"
                  onClick={() => setTab('login')}
                  className="clip-notch-sm flex items-center justify-between bg-surface px-3 py-2.5 text-left transition-colors hover:bg-elevated"
                >
                  <span>
                    <span className="block text-[13px] font-semibold text-text">{account.label}</span>
                    <span className="block font-mono text-[11px] text-muted">{account.identifier}</span>
                  </span>
                  <span className="font-mono text-[11px] text-faint">{account.password}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function LoginForm({ onLogin }: { onLogin: (identifier: string, password: string) => Promise<void> }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [forgot, setForgot] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onLogin(identifier, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
      setSubmitting(false);
    }
  };

  if (forgot) return <ForgotForm onBack={() => setForgot(false)} />;

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <Field label="Email or username" htmlFor="identifier">
        <Input id="identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" required placeholder="you@kingsonly.gg" />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required placeholder="••••••••" />
      </Field>
      {error ? <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p> : null}
      <Button type="submit" loading={submitting} size="lg" icon={<LogIn size={18} />}>
        Sign in
      </Button>
      <button type="button" onClick={() => setForgot(true)} className="self-start text-[13px] font-semibold text-muted hover:text-text">
        Forgot password?
      </button>
    </form>
  );
}

function ForgotForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await post<{ sent: boolean }>('/auth/forgot-password', { email });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[15px] text-text">Reset link sent.</p>
        <p className="text-[13px] text-muted">If {email} belongs to an account, a password reset link is on its way.</p>
        <Button variant="secondary" onClick={onBack}>Back to sign in</Button>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <Field label="Email" htmlFor="forgot-email" hint="We send a one-time reset link.">
        <Input id="forgot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      {error ? <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p> : null}
      <Button type="submit" loading={submitting}>Send reset link</Button>
      <button type="button" onClick={onBack} className="self-start text-[13px] font-semibold text-muted hover:text-text">
        Back to sign in
      </button>
    </form>
  );
}

function RegisterForm({ onRegister }: { onRegister: (input: { username: string; email: string; password: string; displayName: string }) => Promise<void> }) {
  const [form, setForm] = useState({ displayName: '', username: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof form) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      await onRegister(form);
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) {
        setFieldErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
      } else {
        setError(err instanceof ApiError ? err.message : 'Something went wrong.');
      }
      setSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <Field label="Display name" htmlFor="displayName">
        <Input id="displayName" value={form.displayName} onChange={(e) => set('displayName')(e.target.value)} autoComplete="name" required maxLength={24} placeholder="How the guild sees you" />
        {fieldErrors.displayName ? <p className="text-[12px] text-danger">{fieldErrors.displayName}</p> : null}
      </Field>
      <Field label="Username" htmlFor="username">
        <Input id="username" value={form.username} onChange={(e) => set('username')(e.target.value)} autoComplete="username" required maxLength={20} placeholder="letters, numbers, underscores" />
        {fieldErrors.username ? <p className="text-[12px] text-danger">{fieldErrors.username}</p> : null}
      </Field>
      <Field label="Email" htmlFor="email">
        <Input id="email" type="email" value={form.email} onChange={(e) => set('email')(e.target.value)} autoComplete="email" required />
        {fieldErrors.email ? <p className="text-[12px] text-danger">{fieldErrors.email}</p> : null}
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 8 characters.">
        <Input id="password" type="password" value={form.password} onChange={(e) => set('password')(e.target.value)} autoComplete="new-password" required />
        {fieldErrors.password ? <p className="text-[12px] text-danger">{fieldErrors.password}</p> : null}
      </Field>
      {error ? <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p> : null}
      <Button type="submit" loading={submitting} size="lg" icon={<UserPlus size={18} />}>
        Create account
      </Button>
      <p className="text-center text-[12px] text-muted">
        After registering you can request to join the guild from your profile.
      </p>
    </form>
  );
}

export function JoinGuildCta() {
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setState('sending');
    try {
      await post<{ status: string }>('/auth/guild/join-request', { message: message.trim() || undefined });
      setState('sent');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
      setState('idle');
    }
  };

  if (state === 'sent') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4">
        <Crosshair size={18} className="mt-0.5 shrink-0 text-success" aria-hidden />
        <div>
          <p className="text-[14px] font-semibold text-text">Request sent</p>
          <p className="mt-0.5 text-[13px] text-muted">Leadership will review it. You will be notified here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[14px] font-semibold text-text">Not on the roster yet</p>
      <p className="text-[13px] text-muted">Send a request to join KINGS ONLY.</p>
      <Field label="Message (optional)">
        <Input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} placeholder="Rank, availability, why you belong" />
      </Field>
      {error ? <p className="text-[12px] text-danger">{error}</p> : null}
      <Button onClick={submit} loading={state === 'sending'} icon={<Crosshair size={16} />}>
        Request to join
      </Button>
    </div>
  );
}