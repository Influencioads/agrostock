/**
 * The URL path for every root-stack screen, split out from `linking.ts`.
 *
 * Lives in its own module for the same reason `sectionRegistryKeys.ts` does: it
 * imports no React Native and no Expo, which is what lets `linking.test.ts` read it.
 * `linking.ts` itself pulls in `expo-linking`, so a test that imported it could not
 * be parsed at all — and the gap this map exists to catch (a registered screen with
 * no path) is exactly the kind that ships when nothing can assert on it.
 *
 * Keys must match `RootStackParamList` exactly; the test enforces both directions.
 */
export const SCREEN_PATHS = {
  // The role tabs live under "App" and own the root URL.
  App: '',
  ProductDetail: 'product/:slug',
  Search: 'search',
  Cart: 'cart',
  Checkout: 'checkout',
  SignIn: 'signin',
  SignUp: 'signup',
  ForgotPassword: 'forgot-password',
  OtpSignIn: 'otp',
  Notifications: 'notifications',
  NotificationSettings: 'notifications/settings',
  Offices: 'offices',
  SafeDeal: 'safe-deal',
  Kyc: 'kyc',
  LiveTracking: 'tracking',
  RolesAccess: 'roles',
  Community: 'community',
  Support: 'support',
  Directory: 'directory/:type',
  // Registered screens that had no path at all: both were reachable by tapping
  // through the app but by no link, so a share, an email or a push route could
  // never land on them. `Services` is the mobile twin of web's `/services`, and
  // the path matches it so the same URL means the same screen on both.
  Services: 'services',
  Hires: 'hires',
  PublicProfile: 'u/:userId',
  AuctionsBoard: 'auctions',
  BuyerBidsBoard: 'bids',
  BuyerBidRoom: 'bid/:id',
  Requirements: 'requirements',
  ProfileForm: 'profile/edit',
  Section: 'console/:role/:section',
} as const;
