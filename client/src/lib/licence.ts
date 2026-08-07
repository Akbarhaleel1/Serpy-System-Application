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

/** True once the paid support period has run out (or was never recorded). */
export function supportHasLapsed(supportExpiresAt: string | null): boolean {
  if (!supportExpiresAt) return false;

  const expiry = new Date(supportExpiresAt);
  if (Number.isNaN(expiry.getTime())) return false;

  return expiry.getTime() <= Date.now();
}
