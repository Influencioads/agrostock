/**
 * Roles a visitor can sign up as. Display copy lives in the i18n catalogs:
 * the chip label comes from `enums:role.<id>` and the helper line from
 * `mobile:auth.roleHelper.<id>` — translated at the render site (SignUp.tsx).
 */
export const SIGNUP_ROLES = [
  { id: 'buyer', labelKey: 'buyer' },
  { id: 'seller', labelKey: 'seller' },
  { id: 'transporter', labelKey: 'transporter' },
  { id: 'loaderco', labelKey: 'loaderco' },
  { id: 'worker', labelKey: 'worker' },
] as const;

export type SignupRole = (typeof SIGNUP_ROLES)[number]['id'];
