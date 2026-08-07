import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiFetch } from '@/lib/apiClient';

const MIN_PASSWORD = 6;

type Mode = 'create' | 'signin';

/**
 * Creates the owner account on a freshly activated install.
 *
 * A licence unlocks the app and provisions an empty database - it does not
 * create anyone to sign in as. Without this step the customer would land on a
 * login form with no account to use, which is precisely what the desktop
 * signup tab no longer offers to make.
 *
 * It also offers to sign in instead. This screen only appears when the licence's
 * database holds no users at all, so an existing customer reaching it has
 * almost certainly activated the wrong licence - and being shown a create-account
 * form with no way past it leaves them stuck with no way to say so.
 */
export function FirstRunSetup({
  email,
  onComplete,
}: {
  email: string | null;
  onComplete: () => void;
}) {
  const [mode, setMode] = useState<Mode>('create');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  // Prefilled from the licence, but editable: the address that bought the
  // licence is not always the one that will run the business day to day.
  const [ownerEmail, setOwnerEmail] = useState(email ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSwitch, setConfirmSwitch] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (password !== confirm) {
      setError('Those passwords do not match.');
      return;
    }

    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ownerEmail,
          password,
          fullName,
          companyName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Could not create your account.');
        setBusy(false);
        return;
      }

      // Registering signs them straight in, same as the OTP flow does
      if (data.token) localStorage.setItem('token', data.token);

      onComplete();
    } catch {
      setError('Could not reach the local server. Please try again.');
      setBusy(false);
    }
  }

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault();

    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ownerEmail, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Worth spelling out: this screen is only reached when the database
        // has no users, so a rejected sign-in here almost always means the
        // account they are thinking of lives under a different licence.
        setError(
          response.status === 401
            ? 'No account with that email and password exists on this licence. ' +
                'This computer is connected to a new, empty SerpY database — if your ' +
                'business already uses SerpY, connect this computer with that business’s ' +
                'licence key instead.'
            : data.message || 'Could not sign you in.',
        );
        setBusy(false);
        return;
      }

      if (data.token) localStorage.setItem('token', data.token);

      onComplete();
    } catch {
      setError('Could not reach the local server. Please try again.');
      setBusy(false);
    }
  }

  /** Forget this licence so the welcome screen can take a different key. */
  async function useDifferentLicence() {
    if (!window.serpy) return;

    setBusy(true);
    await window.serpy.deactivate();
    window.location.reload();
  }

  if (mode === 'signin') {
    return (
      <Shell
        title="Sign in to SerpY"
        description="Use the email and password you already sign in with."
      >
        <form className="space-y-4" onSubmit={handleSignIn}>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="signin-existing-email">Email</Label>
            <Input
              id="signin-existing-email"
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signin-existing-password">Password</Label>
            <Input
              id="signin-existing-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>

          {confirmSwitch ? (
            <div className="rounded-xl border p-4">
              <p className="text-sm">
                This removes the licence from this computer. You will need a licence
                key to set it up again.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={busy}
                  onClick={useDifferentLicence}
                >
                  Disconnect
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => setConfirmSwitch(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="link"
              className="w-full"
              disabled={busy}
              onClick={() => setConfirmSwitch(true)}
            >
              Use a different licence key
            </Button>
          )}

          <Button
            type="button"
            variant="link"
            className="w-full"
            disabled={busy}
            onClick={() => {
              setError(null);
              setConfirmSwitch(false);
              setMode('create');
            }}
          >
            Back to creating an account
          </Button>
        </form>
      </Shell>
    );
  }

  return (
    <Shell
      title="Create your account"
      description="Your licence is active. Set up the owner account you will sign in with — this is the administrator for your business."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="setup-fullName">Your name</Label>
          <Input
            id="setup-fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="setup-email">Email</Label>
          <Input
            id="setup-email"
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="setup-companyName">Business name</Label>
          <Input
            id="setup-companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="setup-password">Password</Label>
          <Input
            id="setup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={MIN_PASSWORD}
            required
          />
          <p className="text-xs text-muted-foreground">
            At least {MIN_PASSWORD} characters.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="setup-confirm">Confirm password</Label>
          <Input
            id="setup-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Creating…' : 'Create account and continue'}
        </Button>

        <Button
          type="button"
          variant="link"
          className="w-full"
          disabled={busy}
          onClick={() => {
            setError(null);
            setMode('signin');
          }}
        >
          I already have a SerpY account — sign in
        </Button>
      </form>
    </Shell>
  );
}

function Shell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>

        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
