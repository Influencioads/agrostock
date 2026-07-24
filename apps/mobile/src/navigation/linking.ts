import type { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import type { RootStackParamList } from './types';

/**
 * F33: URL/deep-link routing for the root native stack.
 *
 * The app declared a custom scheme (`agrotraders://`) and Android intent filters
 * but never gave `NavigationContainer` a `linking` map, so external links opened
 * the app on its default screen instead of the intended one. This maps both the
 * custom scheme and the public HTTPS origins to concrete screens, preserving
 * resource IDs (`:slug`, `:id`, `:userId`) through the URL. Cold- and warm-start
 * both resolve because React Navigation reads the initial URL on mount and
 * subscribes to subsequent ones.
 *
 * Push-notification taps are handled separately via `routeForNotification`
 * (see `navigationRef.ts` / `push.ts`); this covers user-facing URLs (email
 * links, shares, universal/app links).
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    // Custom scheme (agrotraders://…) and, in dev, the exp:// wrapper.
    Linking.createURL('/'),
    'agrotraders://',
    // Public HTTPS origins for universal/app links.
    'https://agrotraders.org',
    'https://www.agrotraders.org',
  ],
  config: {
    screens: {
      // The role tabs live under "App" and own the root URL.
      App: '',
      ProductDetail: 'product/:slug',
      Search: 'search',
      Cart: 'cart',
      Checkout: 'checkout/:slug?',
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
      PublicProfile: 'u/:userId',
      AuctionsBoard: 'auctions',
      BuyerBidsBoard: 'bids',
      BuyerBidRoom: 'bid/:id',
      Requirements: 'requirements',
      ProfileForm: 'profile/edit',
      Section: 'console/:role/:section',
    },
  },
};
