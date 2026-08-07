// Talking to the licence service, and to Razorpay on its behalf.
//
// Shared by the purchase panel and the yearly support renewal, which run the
// same two-step dance: open an order, then hand the signed result back for
// server-side verification.

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function loadRazorpay(): Promise<boolean> {
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
export async function postJson(url: string, body: unknown) {
  let response: Response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    // An endpoint that is not deployed lands here rather than in the 404 branch
    // below. The browser sends a CORS preflight first, Vercel answers a missing
    // route with a plain 404 carrying no Access-Control-Allow-Origin, and fetch
    // throws before any status is readable - identical, from here, to being
    // offline. So the message has to name both possibilities.
    throw new Error(
      `Cannot reach ${url}. Check your internet connection — or this endpoint may ` +
        'not be deployed yet, in which case redeploy licence-service.'
    );
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

/**
 * Create the owner account on a database the licence has just provisioned.
 *
 * Called straight after activation, when the backend may still be opening its
 * Mongo connection, so it retries rather than failing on the first attempt.
 * An account that already exists is success, not an error: redeeming a key on
 * a second machine reaches a database that already has its owner.
 */
export async function createOwnerAccount(
  details: { email: string; password: string; fullName: string; companyName?: string },
  { apiFetch, timeoutMs = 30000 }: { apiFetch: ApiFetch; timeoutMs?: number }
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError = 'The local server did not become ready in time.';

  while (Date.now() < deadline) {
    try {
      const response = await apiFetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      });

      const body = await response.json().catch(() => ({}));

      if (response.ok) {
        if (body.token) localStorage.setItem('token', body.token);
        return;
      }

      if (typeof body.message === 'string' && body.message.includes('already exists')) {
        return;
      }

      lastError = body.message || `Server returned HTTP ${response.status}`;
    } catch (err) {
      lastError = (err as Error).message;
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  throw new Error(lastError);
}

/**
 * Sign in to the local backend with credentials already proven to the licence
 * service, so that setting a computer up asks for them once rather than twice.
 *
 * Retries for the same reason createOwnerAccount does: the backend is still
 * opening its Mongo connection when this is called.
 *
 * A false return is not an error worth reporting - it just means the app's own
 * login page handles it from here. That happens legitimately when the licence
 * was bought under one address and the owner account set up under another,
 * where the password proven to the licence service belongs to an account this
 * database knows by a different email.
 */
export async function signInLocally(
  credentials: { email: string; password: string },
  { apiFetch, timeoutMs = 30000 }: { apiFetch: ApiFetch; timeoutMs?: number }
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (response.ok) {
        const body = await response.json().catch(() => ({}));
        if (body.token) {
          localStorage.setItem('token', body.token);
          return true;
        }
        return false;
      }

      // Rejected credentials will be rejected just as firmly in two seconds
      if (response.status === 401 || response.status === 403) return false;
    } catch {
      // Local server not listening yet
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  return false;
}

type ApiFetch = (endpoint: string, options?: RequestInit) => Promise<Response>;

/** True once the paid support period has run out (or was never recorded). */
export function supportHasLapsed(supportExpiresAt: string | null): boolean {
  if (!supportExpiresAt) return false;

  const expiry = new Date(supportExpiresAt);
  if (Number.isNaN(expiry.getTime())) return false;

  return expiry.getTime() <= Date.now();
}
