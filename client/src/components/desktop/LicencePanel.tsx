import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiFetch, setDesktopTarget } from '@/lib/apiClient';
import { createOwnerAccount, loadRazorpay, postJson, signInLocally } from '@/lib/licence';

type Mode = 'choose' | 'login' | 'buy' | 'redeem' | 'recover';

const MIN_PASSWORD = 6;

/**
 * Buy a licence, or redeem one that already exists.
 *
 * Lives on its own rather than inside DesktopGate because it is reached from
 * two directions: the gate in front of an unactivated install, and the signup
 * tab, where on desktop a licence - not an account - is what a new user needs.
 *
 * Opens on a choice rather than the purchase form. Most people reaching this
 * screen on a second computer, or after reinstalling, already own SerpY - being
 * shown a price and a "choose a password" field reads as "pay again", and the
 * way back to their existing account has to be the first thing offered, not a
 * link underneath it.
 */
export function LicencePanel({ onActivated }: { onActivated?: () => void }) {
  const [licenceApi, setLicenceApi] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('choose');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [licenceKey, setLicenceKey] = useState('');

  // Where the licence service lives is decided by the shell, not the bundle
  useEffect(() => {
    if (!window.serpy) return;
    window.serpy
      .getStatus()
      .then((status) => setLicenceApi(status.licenceApi))
      .catch(() => setError('Could not read the licence configuration from the app.'));
  }, []);

  const activate = useCallback(
    // Both options end the same way - holding a token, inside the app. `owner`
    // is for buying, where the licence has provisioned an empty database and the
    // account has to be made before anyone can sign in. `signIn` is for logging
    // in, where the account already exists and the credentials have just been
    // proven to the licence service; using them once more here is what stops the
    // app asking for the same password a second time.
    async (
      key: string,
      credentials?: {
        owner?: { email: string; password: string; fullName: string; companyName?: string };
        signIn?: { email: string; password: string };
      }
    ) => {
      if (!window.serpy) return;

      setBusy(true);
      setError(null);

      const result = await window.serpy.activate(key.trim());

      if (!result.ok) {
        setError(result.message || 'Activation failed');
        setBusy(false);
        return;
      }

      if (result.apiBaseUrl && result.localKey) {
        setDesktopTarget(result.apiBaseUrl, result.localKey);
      }

      if (credentials?.signIn) {
        // Best effort by design: if it does not take, the app's own login page
        // is a perfectly good place to land, so there is nothing to report.
        await signInLocally(credentials.signIn, { apiFetch });
      }

      if (credentials?.owner) {
        try {
          await createOwnerAccount(credentials.owner, { apiFetch });
        } catch (err) {
          // The licence is live and saved; only the account failed. Say so
          // plainly - the app falls back to its first-run setup screen, so
          // this is recoverable rather than fatal.
          setError(
            `Licence activated, but your account could not be created: ${(err as Error).message} ` +
              'You will be asked to set it up next.'
          );
        }
      }

      setBusy(false);
      onActivated?.();
    },
    [onActivated]
  );

  /**
   * Sign in with the business's own email and password.
   *
   * The licence service checks those against the customer's database - the same
   * account they use inside the app - and answers with their licence key, which
   * is then activated exactly as if they had typed it. That indirection is what
   * makes a password enough on a machine that has no database to check against
   * yet.
   */
  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    if (!licenceApi) return;

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const result = await postJson(`${licenceApi}/login`, { email, password });

      // Only ever true for licences issued before keys were kept in a readable
      // form. Their other machines now hold a key that no longer works, so it
      // has to be put in front of them rather than mentioned in passing.
      if (result.rotated) setIssuedKey(result.licenceKey);

      await activate(result.licenceKey, { signIn: { email, password } });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  /**
   * Mail the licence key to the address that bought it.
   *
   * The service answers the same way whether or not the address has a licence,
   * so there is nothing here to report beyond what it says.
   */
  async function handleRecover(event: React.FormEvent) {
    event.preventDefault();
    if (!licenceApi) return;

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const result = await postJson(`${licenceApi}/recover-key`, { email });
      setNotice(result.message || 'If that email has a licence, the key is on its way.');
    } catch (err) {
      setError((err as Error).message);
    }

    setBusy(false);
  }

  async function handlePurchase(event: React.FormEvent) {
    event.preventDefault();
    if (!licenceApi) return;

    // Checked before any money moves, not after
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
      const order = await postJson(`${licenceApi}/signup`, {
        fullName,
        email,
        companyName,
      });

      if (!(await loadRazorpay())) {
        setError('Could not reach the payment provider. Check your internet connection.');
        setBusy(false);
        return;
      }

      const checkout = new window.Razorpay!({
        key: order.razorpayKeyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'SerpY',
        description: 'SerpY Desktop — one-time licence',
        prefill: { name: fullName, email },
        modal: {
          // Payment window closed without completing
          ondismiss: () => setBusy(false),
        },
        handler: async (payment: Record<string, string>) => {
          try {
            const verified = await postJson(`${licenceApi}/verify-payment`, payment);

            if (verified.licenceKey) {
              // Shown once - the customer needs it to install elsewhere
              setIssuedKey(verified.licenceKey);
              await activate(verified.licenceKey, {
                owner: { email, password, fullName, companyName },
              });
            } else {
              setMode('redeem');
              setError(verified.message || 'Enter your licence key to continue.');
              setBusy(false);
            }
          } catch (err) {
            // The money has already left their account - say so, and keep the
            // detail rather than replacing it with a guess
            setError(
              `Payment went through but activation failed: ${(err as Error).message} ` +
                'Contact support with your payment id.'
            );
            setBusy(false);
          }
        },
      });

      checkout.open();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {issuedKey && (
        <Alert>
          <AlertDescription>
            <span className="font-medium">Save your licence key:</span>
            <code className="mt-1 block font-mono text-sm">{issuedKey}</code>
            You will need it to install SerpY on another computer.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {notice && (
        <Alert>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      {mode === 'choose' && (
        <div className="space-y-3">
          <button
            type="button"
            className="w-full rounded-xl border p-4 text-left transition-colors hover:bg-muted/50"
            onClick={() => {
              setError(null);
              setMode('login');
            }}
          >
            <span className="block font-semibold">Log in</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Already use SerpY? Sign in to set this computer up.
            </span>
          </button>

          <button
            type="button"
            className="w-full rounded-xl border p-4 text-left transition-colors hover:bg-muted/50"
            onClick={() => {
              setError(null);
              setMode('buy');
            }}
          >
            <span className="flex items-baseline justify-between">
              <span className="font-semibold">Create account</span>
              <span className="text-sm font-semibold">₹25,999</span>
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              New to SerpY? Set your business up. One-time, per user.
            </span>
          </button>
        </div>
      )}

      {mode === 'login' && (
        <form className="space-y-4" onSubmit={handleLogin}>
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            {/* Staff accounts are not known to the licence service, so being
                specific here saves an employee guessing at why their own login
                is refused. */}
            <p className="text-xs text-muted-foreground">
              Use the account SerpY was bought with. Staff logins work once this
              computer is set up.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={busy || !licenceApi}>
            {busy ? 'Signing in…' : 'Log in'}
          </Button>

          <Button
            type="button"
            variant="link"
            className="w-full"
            disabled={busy}
            onClick={() => {
              setError(null);
              setMode('redeem');
            }}
          >
            Use a licence key instead
          </Button>
        </form>
      )}

      {mode === 'buy' && (
        <form className="space-y-4" onSubmit={handlePurchase}>
          {/* The one and only place the full price is put to someone: at the
              point of buying. Afterwards the app only ever mentions the yearly
              support figure. */}
          <div className="rounded-xl border bg-muted/40 p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">SerpY Desktop</span>
              <span className="text-lg font-semibold">₹25,999</span>
            </div>
            <p className="text-xs text-muted-foreground">one-time, per user</p>

            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              <li>• Windows and Mac application</li>
              <li>• Onboarding and training support</li>
              <li>• Cloud sync, backups and updates — first year included</li>
            </ul>

            <p className="mt-3 text-xs text-muted-foreground">
              After the first year, cloud sync, backups, updates and support
              continue at ₹5,999/year.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="licence-fullName">Your name</Label>
            <Input
              id="licence-fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="licence-email">Email</Label>
            <Input
              id="licence-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="licence-companyName">Business name</Label>
            <Input
              id="licence-companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="licence-password">Choose a password</Label>
            <Input
              id="licence-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={MIN_PASSWORD}
              required
            />
            <p className="text-xs text-muted-foreground">
              At least {MIN_PASSWORD} characters. You will sign in with this.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="licence-confirm">Confirm password</Label>
            <Input
              id="licence-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={busy || !licenceApi}>
            {busy ? 'Please wait…' : 'Continue to payment'}
          </Button>
        </form>
      )}

      {mode === 'redeem' && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            activate(licenceKey);
          }}
        >
          {/* Says up front that this is not a second purchase and not a new
              account - the key identifies the business, the sign-in that
              follows identifies the person. */}
          <p className="text-sm text-muted-foreground">
            Your licence key connects this computer to your existing SerpY
            business. Your data, and everyone's logins, are already there — you
            will sign in as normal once this is done.
          </p>

          <div className="space-y-2">
            <Label htmlFor="licence-key">Licence key</Label>
            <Input
              id="licence-key"
              value={licenceKey}
              onChange={(e) => setLicenceKey(e.target.value)}
              placeholder="SERPY-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
              autoComplete="off"
              required
            />
            <p className="text-xs text-muted-foreground">
              Emailed to you when you bought SerpY. On a computer that already
              runs SerpY you can also find it under Settings.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Activating…' : 'Activate and sign in'}
          </Button>

          <Button
            type="button"
            variant="link"
            className="w-full"
            disabled={busy}
            onClick={() => {
              setError(null);
              setNotice(null);
              setMode('recover');
            }}
          >
            I have lost my licence key
          </Button>
        </form>
      )}

      {mode === 'recover' && (
        <form className="space-y-4" onSubmit={handleRecover}>
          <p className="text-sm text-muted-foreground">
            We will email your licence key to the address it was bought with.
          </p>

          <div className="space-y-2">
            <Label htmlFor="recover-email">Email</Label>
            <Input
              id="recover-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            {/* Said before they ask for it, not after it has happened */}
            <p className="text-xs text-muted-foreground">
              This issues a new key and retires the old one. Computers already
              running SerpY keep working.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={busy || !licenceApi}>
            {busy ? 'Sending…' : 'Email me my licence key'}
          </Button>

          <Button
            type="button"
            variant="link"
            className="w-full"
            disabled={busy}
            onClick={() => {
              setError(null);
              setNotice(null);
              setMode('redeem');
            }}
          >
            I have my licence key
          </Button>
        </form>
      )}

      {/* Not on the recovery step, which already offers its own way back */}
      {(mode === 'buy' || mode === 'redeem' || mode === 'login') && (
        <Button
          type="button"
          variant="link"
          className="w-full"
          disabled={busy}
          onClick={() => {
            setError(null);
            setNotice(null);
            setMode('choose');
          }}
        >
          Back
        </Button>
      )}
    </div>
  );
}
