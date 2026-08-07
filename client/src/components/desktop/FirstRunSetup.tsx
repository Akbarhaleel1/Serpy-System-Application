import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiFetch } from '@/lib/apiClient';

const MIN_PASSWORD = 6;

/**
 * Creates the owner account on a freshly activated install.
 *
 * A licence unlocks the app and provisions an empty database - it does not
 * create anyone to sign in as. Without this step the customer would land on a
 * login form with no account to use, which is precisely what the desktop
 * signup tab no longer offers to make.
 */
export function FirstRunSetup({
  email,
  onComplete,
}: {
  email: string | null;
  onComplete: () => void;
}) {
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  // Prefilled from the licence, but editable: the address that bought the
  // licence is not always the one that will run the business day to day.
  const [ownerEmail, setOwnerEmail] = useState(email ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>
            Your licence is active. Set up the owner account you will sign in
            with — this is the administrator for your business.
          </CardDescription>
        </CardHeader>

        <CardContent>
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
