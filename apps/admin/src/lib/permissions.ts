import type { AdminPermission } from '@agrotraders/api-client';

/**
 * i18n key for the human label of an admin permission (admin namespace).
 * Render with `t(permissionLabelKey(p))` so the label follows the locale.
 */
export const permissionLabelKey = (perm: AdminPermission): string => `perm.${perm}`;

/**
 * Permissions grouped into the same sections as the sidebar, for the matrix UI.
 * `group` is a stable token that indexes `admin:navGroup` — translate at the
 * render site with `t(\`navGroup.${group}\`)`.
 */
export const PERMISSION_GROUPS: { group: string; perms: AdminPermission[] }[] = [
  { group: 'Platform', perms: ['users_manage', 'kyc_review', 'role_requests', 'staff_manage'] },
  {
    group: 'Marketplace',
    perms: ['products_moderate', 'markets_manage', 'ads_moderate', 'auctions_manage', 'bids_manage', 'orders_manage', 'disputes_manage', 'reviews_moderate'],
  },
  { group: 'Finance', perms: ['finance_manage'] },
  { group: 'Logistics', perms: ['transport_manage', 'loaders_manage'] },
  { group: 'Messaging', perms: ['support_agent', 'community_moderate'] },
  { group: 'Company', perms: ['offices_manage', 'cms_manage', 'branding_manage', 'reports_view', 'audit_view'] },
];

export const ALL_PERMISSIONS: AdminPermission[] = PERMISSION_GROUPS.flatMap((g) => g.perms);
