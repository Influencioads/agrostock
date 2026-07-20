import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme/tokens';
import { MotiView, useReduceMotion } from '../ui';
import { useI18n } from '../i18n';
import { useChatBadge } from '../chat/ChatBadgeContext';
import { MoreHub } from '../screens/MoreHub';
import { Home } from '../screens/public/Home';
import { Offers } from '../screens/public/Offers';
import { Browse } from '../screens/public/Browse';
import { BuyerOrders } from '../screens/buyer/Orders';
// BuyerDashboard is reached through the More hub (registry key `buyer:dashboard`).
import { SellerDashboard } from '../screens/seller/Dashboard';
import { SellerInventory } from '../screens/seller/Inventory';
import { SellerOrders } from '../screens/seller/Orders';
import { TransporterDashboard } from '../screens/transporter/Dashboard';
import { TransporterRequests } from '../screens/transporter/Requests';
import { TransporterTrips } from '../screens/transporter/Trips';
import { LoaderDashboard } from '../screens/loaderco/Dashboard';
import { LoaderJobs } from '../screens/loaderco/Jobs';
import { LoaderWorkers } from '../screens/loaderco/Workers';
import { WorkerDashboard } from '../screens/worker/Dashboard';
import { WorkerJobs } from '../screens/worker/Jobs';
import { WorkerEarnings } from '../screens/worker/Earnings';

const Tab = createBottomTabNavigator();

function TabIcon({ name, color, size, focused }: { name: keyof typeof Ionicons.glyphMap; color: string; size: number; focused: boolean }) {
  const reduce = useReduceMotion();
  return (
    <MotiView
      animate={{ scale: reduce ? 1 : focused ? 1.16 : 1, translateY: reduce ? 0 : focused ? -1 : 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 18 }}
    >
      <Ionicons name={name} size={size} color={color} />
    </MotiView>
  );
}

function icon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <TabIcon name={name} color={color} size={size} focused={focused} />
  );
}

/**
 * Tab label that shrinks to fit its slot instead of clipping — long localized
 * labels (e.g. Russian "Предложения", German compounds) stay on one line.
 */
function TabLabel({ label, color }: { label: string; color: string }) {
  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.8}
      style={{ fontSize: 11, fontWeight: '600', color, textAlign: 'center', paddingHorizontal: 2 }}
    >
      {label}
    </Text>
  );
}

function tabLabel(label: string) {
  return ({ color }: { color: string }) => <TabLabel label={label} color={color} />;
}

// No top header: every tab screen renders its own title/branded header and opts
// back into the status-bar inset with edges={['top']}. Movement between tabs is
// the bottom bar; genuine back-navigation lives on the root stack's pushed screens.
const screenOptions = {
  headerShown: false,
  tabBarActiveTintColor: C.green,
  tabBarInactiveTintColor: C.inkSoft,
  tabBarStyle: { backgroundColor: C.white, borderTopColor: C.border, height: 58, paddingBottom: 6, paddingTop: 6 },
  tabBarLabelStyle: { fontSize: 11, fontWeight: '600' as const },
};

/**
 * Options for the hub tab (Account/More) that hosts the chat entry points:
 * shows the live unread chat badge on the bottom tab bar.
 */
function useHubTabOptions(name: keyof typeof Ionicons.glyphMap, labelKey: string) {
  const { t } = useI18n();
  const { unread } = useChatBadge();
  return {
    tabBarIcon: icon(name),
    tabBarLabel: tabLabel(t(`nav:tab.${labelKey}`)),
    tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
    tabBarBadgeStyle: { backgroundColor: C.error, color: C.white, fontSize: 10, fontWeight: '800' as const },
  };
}

/**
 * `Tab.Screen name` doubles as the route id, so it must stay in English; the
 * visible label comes from `nav:tab.<name>` instead.
 */
function useTabOptions() {
  const { t } = useI18n();
  return (name: keyof typeof Ionicons.glyphMap, labelKey: string) => ({
    tabBarIcon: icon(name),
    tabBarLabel: tabLabel(t(`nav:tab.${labelKey}`)),
  });
}

export function ShopTabs() {
  const tab = useTabOptions();
  const hub = useHubTabOptions('person', 'Account');
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Home" component={Home} options={tab('home', 'Home')} />
      <Tab.Screen name="Offers" component={Offers} options={tab('pricetags', 'Offers')} />
      <Tab.Screen name="Browse" component={Browse} options={tab('grid', 'Browse')} />
      <Tab.Screen name="Orders" component={BuyerOrders} options={tab('cube', 'Orders')} />
      <Tab.Screen name="Account" component={MoreHub} options={hub} />
    </Tab.Navigator>
  );
}

export function SellerTabs() {
  const tab = useTabOptions();
  const hub = useHubTabOptions('ellipsis-horizontal', 'More');
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Home" component={Home} options={tab('home', 'Home')} />
      <Tab.Screen name="Dashboard" component={SellerDashboard} options={tab('speedometer', 'Dashboard')} />
      <Tab.Screen name="Inventory" component={SellerInventory} options={tab('storefront', 'Inventory')} />
      <Tab.Screen name="Orders" component={SellerOrders} options={tab('cube', 'Orders')} />
      <Tab.Screen name="More" component={MoreHub} options={hub} />
    </Tab.Navigator>
  );
}

export function TransporterTabs() {
  const tab = useTabOptions();
  const hub = useHubTabOptions('ellipsis-horizontal', 'More');
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Home" component={Home} options={tab('home', 'Home')} />
      <Tab.Screen name="Dashboard" component={TransporterDashboard} options={tab('speedometer', 'Dashboard')} />
      <Tab.Screen name="Requests" component={TransporterRequests} options={tab('cube', 'Requests')} />
      <Tab.Screen name="Trips" component={TransporterTrips} options={tab('car', 'Trips')} />
      <Tab.Screen name="More" component={MoreHub} options={hub} />
    </Tab.Navigator>
  );
}

export function LoaderTabs() {
  const tab = useTabOptions();
  const hub = useHubTabOptions('ellipsis-horizontal', 'More');
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Home" component={Home} options={tab('home', 'Home')} />
      <Tab.Screen name="Dashboard" component={LoaderDashboard} options={tab('speedometer', 'Dashboard')} />
      <Tab.Screen name="Jobs" component={LoaderJobs} options={tab('briefcase', 'Jobs')} />
      <Tab.Screen name="Workers" component={LoaderWorkers} options={tab('people', 'Workers')} />
      <Tab.Screen name="More" component={MoreHub} options={hub} />
    </Tab.Navigator>
  );
}

export function WorkerTabs() {
  const tab = useTabOptions();
  const hub = useHubTabOptions('person', 'Account');
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Home" component={Home} options={tab('home', 'Home')} />
      <Tab.Screen name="Dashboard" component={WorkerDashboard} options={tab('speedometer', 'Dashboard')} />
      <Tab.Screen name="Jobs" component={WorkerJobs} options={tab('briefcase', 'Jobs')} />
      <Tab.Screen name="Earnings" component={WorkerEarnings} options={tab('wallet', 'Earnings')} />
      <Tab.Screen name="Account" component={MoreHub} options={hub} />
    </Tab.Navigator>
  );
}
