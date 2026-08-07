import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { isDesktop, type DesktopStatus } from '@/lib/apiClient';
import { loadRazorpay, postJson, supportHasLapsed } from '@/lib/licence';

/**
 * Asks the customer to renew cloud sync, backups, updates and support once the
 * paid year has run out.
 *
 * Deliberately dismissible, and deliberately shown again on the next launch:
 * the licence itself never expires, so a lapsed support period must not lock
 * anyone out of their own data. It nags, it does not gate.
 */
export function SupportRenewalModal() {
  const [status, setStatus] = useState<DesktopStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renewedUntil, setRenewedUntil] = useState<string | null>(null);

  useEffect(() => {
    if (!isDesktop() || !window.serpy) return;

    window.serpy
      .getStatus()
      .then((next) => {
        setStatus(next);
        if (supportHasLapsed(next.supportExpiresAt)) setOpen(true);
      })
      .catch(() => {
        /* Nothing to prompt about if we cannot read the licence */
      });
  }, []);

  const renew = useCallback(async () => {
    if (!status?.licenceKey || !window.serpy) return;

    setBusy(true);
    setError(null);

    try {
      const order = await postJson(`${status.licenceApi}/renew`, {
        licenceKey: status.licenceKey,
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
        description: 'Cloud sync, backups, updates and support — 1 year',
        prefill: { email: order.email },
        modal: {
          ondismiss: () => setBusy(false),
        },
        handler: async (payment: Record<string, string>) => {
          try {
            const verified = await postJson(`${status.licenceApi}/verify-renewal`, payment);

            // Persisted by the shell, otherwise this prompt returns on the
            // next launch despite having been paid
            await window.serpy!.recordRenewal(verified.supportExpiresAt);

            setRenewedUntil(verified.supportExpiresAt);
            setBusy(false);
          } catch (err) {
            setError(
              `Payment went through but the renewal could not be recorded: ${(err as Error).message} ` +
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
  }, [status]);

  if (!isDesktop()) return null;

  const expiryLabel = (value: string | null) =>
    value ? new Date(value).toLocaleDateString(undefined, { dateStyle: 'long' }) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        {renewedUntil ? (
          <>
            <DialogHeader>
              <DialogTitle>Support renewed</DialogTitle>
              <DialogDescription>
                Cloud sync, backups, updates and support are active until{' '}
                {expiryLabel(renewedUntil)}.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Renew your support plan</DialogTitle>
              <DialogDescription>
                {status?.supportExpiresAt
                  ? `Cloud sync, backups, updates and support ended on ${expiryLabel(
                      status.supportExpiresAt
                    )}.`
                  : 'Your cloud sync, backups, updates and support period has ended.'}
              </DialogDescription>
            </DialogHeader>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="rounded-xl border bg-muted/40 p-4">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">Cloud sync &amp; support</span>
                <span className="text-lg font-semibold">₹5,999</span>
              </div>
              <p className="text-xs text-muted-foreground">per year</p>

              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>• Cloud sync and automatic backups</li>
                <li>• Product updates</li>
                <li>• Priority support</li>
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              SerpY keeps working either way — your licence does not expire.
            </p>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
                Remind me later
              </Button>
              <Button disabled={busy || !status?.licenceKey} onClick={renew}>
                {busy ? 'Please wait…' : 'Renew for ₹5,999'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
