/**
 * Public URLs the payment flow needs.
 *
 * Two distinct hosts: the browser comes back to the WEB app, while the acquirer
 * calls the API server-to-server. They are different origins in production
 * (agrotraders.org vs api.agrotraders.org), so one base URL cannot serve both.
 */

/** Where the buyer's browser returns after paying. */
export function webBaseUrl(env = process.env): string {
  return (env.APP_WEB_URL || 'http://localhost:5173').replace(/\/+$/, '');
}

/**
 * Where acquirers POST their callbacks. Must be internet-reachable, so a local
 * default is only ever useful with a tunnel in front of it — which is exactly
 * what the admin page's copy-paste callback URLs are for.
 */
export function apiBaseUrl(env = process.env): string {
  return (env.APP_API_URL || `http://localhost:${env.API_PORT || 3100}`).replace(/\/+$/, '');
}

/** Server-to-server callback for one provider. */
export function webhookUrl(provider: string, env = process.env): string {
  return `${apiBaseUrl(env)}/api/billing/webhook/${provider}`;
}

/** Where the user lands afterwards; the page polls until the webhook arrives. */
export function returnUrl(paymentId: string, env = process.env): string {
  return `${webBaseUrl(env)}/billing/return?payment=${encodeURIComponent(paymentId)}`;
}
