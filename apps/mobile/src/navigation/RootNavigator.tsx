import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { C } from '../theme/tokens';
import { useI18n } from '../i18n';
import type { RootStackParamList } from './types';
import { RoleRouter } from './RoleRouter';
import { SectionScreen } from './SectionScreen';
import { ProductDetail } from '../screens/public/ProductDetail';
import { Search } from '../screens/public/Search';
import { Offices } from '../screens/public/Offices';
import { RfqBasket } from '../screens/public/RfqBasket';
import { Checkout } from '../screens/public/Checkout';
import { Notifications } from '../screens/public/Notifications';
import { NotificationSettings } from '../screens/public/NotificationSettings';
import { LiveTracking } from '../screens/public/LiveTracking';
import { SignIn } from '../screens/auth/SignIn';
import { SignUp } from '../screens/auth/SignUp';
import { ForgotPassword } from '../screens/auth/ForgotPassword';
import { OtpSignIn } from '../screens/auth/OtpSignIn';
import { Kyc } from '../screens/auth/Kyc';
import { RolesAccess } from '../screens/RolesAccess';
import { Community } from '../screens/community/Community';
import { Support } from '../screens/support/Support';
import { Directory } from '../screens/public/Directory';
import { PublicProfile } from '../screens/public/PublicProfile';
import { AuctionsBoard } from '../screens/public/AuctionsBoard';
import { BuyerBidsBoard } from '../screens/public/BuyerBidsBoard';
import { BuyerBidRoom } from '../screens/public/BuyerBidRoom';
import { RequirementsBoard } from '../screens/public/Requirements';
import { ProfileForm } from '../screens/ProfileForm';
import { HiresScreen } from '../screens/HiresScreen';
import { BuyerSafeDeal } from '../screens/buyer/SafeDeal';
import { BackButton } from './backNavigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

const headerStyle = {
  headerStyle: { backgroundColor: C.white },
  headerTintColor: C.ink,
  headerTitleStyle: { fontWeight: '800' as const },
  headerShadowVisible: false,
};

export function RootNavigator() {
  const { t } = useI18n();
  /** `Stack.Screen name` is the route id and stays in English; only the title is translated. */
  const title = (name: string) => ({ title: t(`nav:stack.${name}`) });

  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        ...headerStyle,
        headerLeft: () => <BackButton navigation={navigation} fallback="App" />,
      })}
    >
      <Stack.Screen name="App" component={RoleRouter} options={{ headerShown: false }} />
      <Stack.Screen name="ProductDetail" component={ProductDetail} options={title('ProductDetail')} />
      {/* Screens rendering their own <AppBar> must hide the stack header, or the
          two stack up with duplicate titles and back chevrons. */}
      <Stack.Screen name="Search" component={Search} options={{ headerShown: false }} />
      <Stack.Screen name="Offices" component={Offices} options={title('Offices')} />
      <Stack.Screen name="SafeDeal" component={BuyerSafeDeal} options={title('SafeDeal')} />
      {/* Route id stays `Cart` — it is the basket icon's target across the app. */}
      <Stack.Screen name="Cart" component={RfqBasket} options={{ headerShown: false }} />
      <Stack.Screen name="Checkout" component={Checkout} options={{ headerShown: false }} />
      <Stack.Screen name="Notifications" component={Notifications} options={title('Notifications')} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettings} options={{ title: t('mobile:pubX.notif.settingsTitle') }} />
      <Stack.Screen name="LiveTracking" component={LiveTracking} options={title('LiveTracking')} />
      <Stack.Screen name="SignIn" component={SignIn} options={{ ...title('SignIn'), presentation: 'modal' }} />
      <Stack.Screen name="SignUp" component={SignUp} options={{ ...title('SignUp'), presentation: 'modal' }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} options={{ title: t('mobile:auth.forgotPassword.title'), presentation: 'modal' }} />
      <Stack.Screen name="OtpSignIn" component={OtpSignIn} options={{ title: t('mobile:auth.otpLogin.title'), presentation: 'modal' }} />
      <Stack.Screen name="Kyc" component={Kyc} options={title('Kyc')} />
      <Stack.Screen name="RolesAccess" component={RolesAccess} options={title('RolesAccess')} />
      <Stack.Screen name="Community" component={Community} options={{ title: t('mobile:hub.community'), headerShown: false }} />
      <Stack.Screen name="Support" component={Support} options={{ title: t('mobile:hub.support'), headerShown: false }} />
      <Stack.Screen
        name="Directory"
        options={({ route }) => ({ title: route.params.title })}
      >
        {({ route }) => <Directory type={route.params.type} />}
      </Stack.Screen>
      <Stack.Screen name="PublicProfile" component={PublicProfile} options={title('PublicProfile')} />
      <Stack.Screen name="AuctionsBoard" component={AuctionsBoard} options={title('AuctionsBoard')} />
      <Stack.Screen name="BuyerBidsBoard" component={BuyerBidsBoard} options={title('BuyerBidsBoard')} />
      <Stack.Screen name="BuyerBidRoom" options={title('BuyerBidRoom')}>
        {({ route }) => <BuyerBidRoom id={route.params.id} />}
      </Stack.Screen>
      <Stack.Screen name="Requirements" component={RequirementsBoard} options={title('Requirements')} />
      <Stack.Screen name="ProfileForm" component={ProfileForm} options={title('ProfileForm')} />
      <Stack.Screen name="Hires" component={HiresScreen} options={title('Hires')} />
      <Stack.Screen name="Section" component={SectionScreen} options={({ route }) => ({ title: route.params.title })} />
    </Stack.Navigator>
  );
}
