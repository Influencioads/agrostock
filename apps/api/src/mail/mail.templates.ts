/**
 * Branded (green + mango) transactional email templates. Table-based, inline
 * styles only — the layout that actually survives Gmail/Outlook. One base
 * layout parameterised by title/body/CTA covers every transactional event; the
 * category just selects a subject prefix and accent.
 */

const BRAND = {
  evergreen: '#0B3D2E',
  green: '#249653',
  leaf: '#53B86A',
  mango: '#FFA000',
  mangoDeep: '#F57C00',
  ink: '#14251A',
  inkSoft: '#647268',
  surfaceBg: '#F6FBF7',
  border: '#D7E6DA',
};

const APP_NAME = 'AgroTraders';

export interface NotificationEmail {
  subject: string;
  html: string;
  text: string;
}

export interface RenderOptions {
  title: string;
  body?: string;
  /** Absolute URL for the primary button. */
  ctaUrl?: string;
  ctaLabel?: string;
  /** Recipient display name for the greeting. */
  name?: string;
  /** Absolute URL to notification settings for the unsubscribe footer. */
  settingsUrl?: string;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Category → subject prefix. Keeps inboxes scannable. */
const SUBJECT_PREFIX: Record<string, string> = {
  orders: 'Order',
  wallet: 'Payment',
  account: 'Account',
  auctions: 'Auction',
  hire: 'Hiring',
  reviews: 'Review',
  transport: 'Transport',
  loader: 'Job',
};

export function subjectFor(category: string, title: string): string {
  const prefix = SUBJECT_PREFIX[category];
  return prefix ? `[${APP_NAME}] ${prefix}: ${title}` : `[${APP_NAME}] ${title}`;
}

export function renderNotificationEmail(opts: RenderOptions): { html: string; text: string } {
  const greeting = opts.name ? `Hi ${esc(opts.name)},` : 'Hi there,';
  const bodyHtml = opts.body ? `<p style="margin:0 0 20px;color:${BRAND.ink};font-size:15px;line-height:1.6;">${esc(opts.body)}</p>` : '';
  const cta =
    opts.ctaUrl && opts.ctaLabel
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">
           <tr><td style="border-radius:11px;background:linear-gradient(135deg,${BRAND.mango},${BRAND.mangoDeep});">
             <a href="${esc(opts.ctaUrl)}" target="_blank"
                style="display:inline-block;padding:12px 26px;font-size:15px;font-weight:700;color:${BRAND.evergreen};text-decoration:none;">
               ${esc(opts.ctaLabel)}
             </a>
           </td></tr>
         </table>`
      : '';
  const footer = opts.settingsUrl
    ? `You're receiving this because you have email notifications enabled. <a href="${esc(opts.settingsUrl)}" style="color:${BRAND.green};">Manage preferences</a>.`
    : `You're receiving this because you have an ${APP_NAME} account.`;

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:0;background:${BRAND.surfaceBg};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.surfaceBg};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">
        <tr><td style="background:${BRAND.evergreen};padding:20px 28px;">
          <span style="font-family:'Manrope',Arial,sans-serif;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:.2px;">
            Agro<span style="color:${BRAND.mango};">Traders</span>
          </span>
        </td></tr>
        <tr><td style="padding:28px;font-family:Inter,Arial,sans-serif;">
          <p style="margin:0 0 12px;color:${BRAND.inkSoft};font-size:14px;">${greeting}</p>
          <h1 style="margin:0 0 14px;color:${BRAND.evergreen};font-size:20px;font-weight:800;line-height:1.3;">${esc(opts.title)}</h1>
          ${bodyHtml}
          ${cta}
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid ${BRAND.border};font-family:Inter,Arial,sans-serif;">
          <p style="margin:0;color:${BRAND.inkSoft};font-size:12px;line-height:1.6;">${footer}</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;color:${BRAND.inkSoft};font-family:Inter,Arial,sans-serif;font-size:11px;">© ${APP_NAME}</p>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    greeting.replace(/<[^>]+>/g, ''),
    '',
    opts.title,
    opts.body ? `\n${opts.body}` : '',
    opts.ctaUrl ? `\n${opts.ctaLabel ?? 'Open'}: ${opts.ctaUrl}` : '',
    '',
    footer.replace(/<[^>]+>/g, ''),
  ].join('\n');

  return { html, text };
}
