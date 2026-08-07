import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { setDesktopTarget } from '@/lib/apiClient';
import { loadRazorpay, postJson } from '@/lib/licence';

type Mode = 'buy' | 'redeem';

/**
 * Buy a licence, or redeem one that already exists.
 *
 * Lives on its own rather than inside DesktopGate because it is reached from
 * two directions: the gate in front of an unactivated install, and the signup
 * tab, where on desktop a licence - not an account - is what a new user needs.
 */
export function LicencePanel({ onActivated }: { onActivated?: () => void }) {
  const [licenceApi, setLicenceApi] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('buy');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
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
    async (key: string) => {
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

      setBusy(false);
      onActivated?.();
    },
    [onActivated]
  );

  async function handlePurchase(event: React.FormEvent) {
    event.preventDefault();
    if (!licenceApi) return;

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
              await activate(verified.licenceKey);
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

      {mode === 'buy' ? (
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

          <Button type="submit" className="w-full" disabled={busy || !licenceApi}>
            {busy ? 'Please wait…' : 'Continue to payment'}
          </Button>
        </form>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            activate(licenceKey);
          }}
        >
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
          </div>

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Activating…' : 'Activate'}
          </Button>
        </form>
      )}

      <Button
        type="button"
        variant="link"
        className="w-full"
        disabled={busy}
        onClick={() => {
          setError(null);
          setMode(mode === 'buy' ? 'redeem' : 'buy');
        }}
      >
        {mode === 'buy' ? 'I already have a licence key' : 'I need to buy a licence'}
      </Button>
    </div>
  );
}
