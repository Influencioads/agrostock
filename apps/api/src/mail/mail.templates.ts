/**
 * Branded (green + mango) transactional email templates. Table-based, inline
 * styles only — the layout that actually survives Gmail/Outlook.
 *
 * Two render paths share one branded shell (`wrapBrandedShell`):
 *  - `renderNotificationEmail` — the built-in fallback used when no admin
 *    `EmailTemplate` row exists (or mail is rendered directly in code).
 *  - `renderEditableTemplate` — renders an admin-edited template: the admin owns
 *    `subject` + a `bodyHtml` fragment with `{{variables}}`; we interpolate the
 *    (escaped) values and drop the fragment into the same fixed shell so the
 *    layout can never be broken from the admin UI.
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

export function esc(s: string): string {
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

/** The gradient CTA button, shared by both render paths. */
function ctaButton(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">
           <tr><td style="border-radius:11px;background:linear-gradient(135deg,${BRAND.mango},${BRAND.mangoDeep});">
             <a href="${esc(url)}" target="_blank"
                style="display:inline-block;padding:12px 26px;font-size:15px;font-weight:700;color:${BRAND.evergreen};text-decoration:none;">
               ${esc(label)}
             </a>
           </td></tr>
         </table>`;
}

/**
 * Wrap arbitrary inner content in the fixed branded shell (header bar, greeting,
 * unsubscribe footer). `innerHtml` is trusted HTML the caller has already built
 * and escaped as needed.
 */
export function wrapBrandedShell(opts: { innerHtml: string; name?: string; settingsUrl?: string }): string {
  const greeting = opts.name ? `Hi ${esc(opts.name)},` : 'Hi there,';
  const footer = opts.settingsUrl
    ? `You're receiving this because you have email notifications enabled. <a href="${esc(opts.settingsUrl)}" style="color:${BRAND.green};">Manage preferences</a>.`
    : `You're receiving this because you have an ${APP_NAME} account.`;

  return `<!doctype html>
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
          ${opts.innerHtml}
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
}

const FOOTER_TEXT = (settingsUrl?: string) =>
  settingsUrl
    ? "You're receiving this because you have email notifications enabled."
    : `You're receiving this because you have an ${APP_NAME} account.`;

export function renderNotificationEmail(opts: RenderOptions): { html: string; text: string } {
  const bodyHtml = opts.body
    ? `<p style="margin:0 0 20px;color:${BRAND.ink};font-size:15px;line-height:1.6;">${esc(opts.body)}</p>`
    : '';
  const cta = opts.ctaUrl && opts.ctaLabel ? ctaButton(opts.ctaUrl, opts.ctaLabel) : '';
  const innerHtml = `<h1 style="margin:0 0 14px;color:${BRAND.evergreen};font-size:20px;font-weight:800;line-height:1.3;">${esc(opts.title)}</h1>
          ${bodyHtml}
          ${cta}`;

  const html = wrapBrandedShell({ innerHtml, name: opts.name, settingsUrl: opts.settingsUrl });

  const greeting = opts.name ? `Hi ${esc(opts.name)},` : 'Hi there,';
  const text = [
    greeting.replace(/<[^>]+>/g, ''),
    '',
    opts.title,
    opts.body ? `\n${opts.body}` : '',
    opts.ctaUrl ? `\n${opts.ctaLabel ?? 'Open'}: ${opts.ctaUrl}` : '',
    '',
    FOOTER_TEXT(opts.settingsUrl),
  ].join('\n');

  return { html, text };
}

/* ── Editable admin templates ─────────────────────────────────────── */

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** Flat, already-resolved variable values available to an editable template. */
export type TemplateVars = Record<string, string | number | null | undefined>;

/**
 * Interpolate `{{var}}` placeholders. Substituted values are HTML-escaped
 * (unless `raw`) so a value can never inject markup; unknown/blank vars render
 * empty. The template body itself is trusted admin HTML and is not escaped.
 */
export function interpolate(template: string, vars: TemplateVars, raw = false): string {
  return template.replace(PLACEHOLDER, (_m, key: string) => {
    const v = vars[key];
    if (v == null) return '';
    const s = String(v);
    return raw ? s : esc(s);
  });
}

export interface EditableTemplateInput {
  subject: string;
  bodyHtml: string;
  ctaLabel?: string | null;
}

/**
 * Render an admin-edited template into a full branded email. `vars` are the
 * resolved values (recipient name, notification title/body, scalar params, …);
 * `ctaUrl` — when present — appends the branded button using the template's
 * `ctaLabel` (or a default).
 */
export function renderEditableTemplate(
  tpl: EditableTemplateInput,
  vars: TemplateVars,
  ctx: { name?: string; ctaUrl?: string; settingsUrl?: string } = {},
): { subject: string; html: string; text: string } {
  const subject = interpolate(tpl.subject, vars).trim() || APP_NAME;
  const bodyHtml = interpolate(tpl.bodyHtml, vars);
  const cta = ctx.ctaUrl ? ctaButton(ctx.ctaUrl, (tpl.ctaLabel || 'Open AgroTraders').trim()) : '';
  const innerHtml = `<div style="color:${BRAND.ink};font-size:15px;line-height:1.6;">${bodyHtml}</div>
          ${cta}`;

  const html = wrapBrandedShell({ innerHtml, name: ctx.name, settingsUrl: ctx.settingsUrl });

  const greeting = ctx.name ? `Hi ${ctx.name},` : 'Hi there,';
  const text = [
    greeting,
    '',
    bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    ctx.ctaUrl ? `\n${(tpl.ctaLabel || 'Open').trim()}: ${ctx.ctaUrl}` : '',
    '',
    FOOTER_TEXT(ctx.settingsUrl),
  ].join('\n');

  return { subject, html, text };
}
