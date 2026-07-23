/** Root native-stack: role tabs live under "App"; everything else is pushed over it. */
export type RootStackParamList = {
  App: undefined;
  ProductDetail: { slug: string };
  Search: { q?: string; category?: string; title?: string } | undefined;
  Cart: undefined;
  Checkout: { slug?: string } | undefined;
  SignIn: { reason?: string } | undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  OtpSignIn: undefined;
  Notifications: undefined;
  NotificationSettings: undefined;
  Offices: undefined;
  SafeDeal: undefined;
  Kyc: undefined;
  LiveTracking: { reference?: string; fromCity?: string; toCity?: string; cargo?: string; status?: string } | undefined;
  RolesAccess: undefined;
  Community: { dmUserId?: string; dmName?: string } | undefined;
  Support: undefined;
  Directory: { type: 'sellers' | 'transporters' | 'loaders' | 'workers'; title: string };
  PublicProfile: { userId: string };
  AuctionsBoard: undefined;
  /** Public board of live buyer bids (reverse auctions). Not the community `Requirements` board. */
  BuyerBidsBoard: undefined;
  /** The reverse-auction bid room for one buyer bid. Not the community `Requirements` board. */
  BuyerBidRoom: { id: string };
  Requirements: undefined;
  ProfileForm: undefined;
  Hires: undefined;
  Section: { role: string; section: string; title: string; productId?: string };
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
