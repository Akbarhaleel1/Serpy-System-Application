import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { isDesktop, setDesktopTarget, type DesktopStatus } from '@/lib/apiClient';

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * POST JSON and fail with a message that says what actually went wrong.
 *
 * Worth the extra handling: a licence endpoint that isn't deployed yet returns
 * the host's HTML error page, and blindly calling .json() on that throws a
 * parse error that looks identical to being offline.
 */
async function postJson(url: string, body: unknown) {
  let response: Response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(`Cannot reach the licence server at ${url}. Check your internet connection.`);
  }

  const raw = await response.text();
  let data: any;

  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(
      response.status === 404
        ? `No licence service is deployed at ${url}. Deploy licence-service and set SERPY_LICENCE_API.`
        : `The licence server returned an unexpected response (HTTP ${response.status}).`
    );
  }

  if (!response.ok) {
    throw new Error(data.message || `Licence server error (HTTP ${response.status})`);
  }

  return data;
}

type Mode = 'buy' | 'redeem';

/**
 * Stands in front of the whole app on desktop builds.
 *
 * Until a licence is activated there is no local database and therefore nothing
 * to show, so the app cannot simply render and fail. On the web this component
 * gets out of the way entirely.
 */
export function DesktopGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<DesktopStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<Mode>('buy');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [licenceKey, setLicenceKey] = useState('');

  const refresh = useCallback(async () => {
    if (!window.serpy) {
      setChecking(false);
      return;
    }
    setStatus(await window.serpy.getStatus());
    setChecking(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Keep the "connecting to your database" notice honest
  useEffect(() => {
    if (!window.serpy) return;
    return window.serpy.onBackendStatus((update) => {
      setStatus((prev) => (prev ? { ...prev, ...update } : prev));
    });
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

      await refresh();
      setBusy(false);
    },
    [refresh]
  );

  async function handlePurchase(event: React.FormEvent) {
    event.preventDefault();
    if (!status) return;

    setBusy(true);
    setError(null);

    try {
      const order = await postJson(`${status.licenceApi}/signup`, {
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
        description: 'SerpY ERP — one-time licence',
        prefill: { name: fullName, email },
        modal: {
          // Payment window closed without completing
          ondismiss: () => setBusy(false),
        },
        handler: async (payment: Record<string, string>) => {
          try {
            const verified = await postJson(`${status.licenceApi}/verify-payment`, payment);

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

  // Web build, or the preload bridge is unavailable - behave exactly as before
  if (!isDesktop()) return <>{children}</>;

  if (checking) {
    return <FullScreen>Starting SerpY…</FullScreen>;
  }

  if (status?.activated) {
    if (!status.apiBaseUrl) {
      return (
        <FullScreen>
          <p className="mb-2 font-medium">Starting the local server…</p>
          {status.lastError && (
            <p className="text-sm text-muted-foreground">{status.lastError}</p>
          )}
        </FullScreen>
      );
    }

    if (!status.dbConnected) {
      return (
        <FullScreen>
          <p className="mb-2 font-medium">Connecting to your database…</p>
          <p className="text-sm text-muted-foreground">
            {status.lastError
              ? 'SerpY cannot reach the database. Check your internet connection — it will reconnect automatically.'
              : 'One moment.'}
          </p>
        </FullScreen>
      );
    }

    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to SerpY</CardTitle>
          <CardDescription>
            {mode === 'buy'
              ? 'Buy a licence to set up SerpY on this computer.'
              : 'Enter the licence key you received after purchase.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
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
              <div className="space-y-2">
                <Label htmlFor="fullName">Your name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Business name</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={busy}>
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
                <Label htmlFor="licenceKey">Licence key</Label>
                <Input
                  id="licenceKey"
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
        </CardContent>
      </Card>
    </div>
  );
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      {children}
    </div>
  );
}
