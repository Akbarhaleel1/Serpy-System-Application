import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isDesktop, type DesktopStatus } from '@/lib/apiClient';
import { LicencePanel } from './LicencePanel';

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
            Buy a licence to set up SerpY on this computer, or activate one you
            already have.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <LicencePanel onActivated={refresh} />
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
