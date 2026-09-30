import { useEffect, useRef } from 'react';
import { ActivityIndicator, LogBox, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Push (expo-notifications / FCM) is intentionally unsupported in Expo Go — it
// needs a development build. In Expo Go the SDK logs a hard error on every launch
// that pops a blocking LogBox overlay; silence that specific noise so Expo Go
// stays usable. Real builds are unaffected (the message never fires there).
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
  // @react-native-firebase logs this on every Expo Go launch (no native module);
  // push is already guarded off in that client, so the message is pure noise.
  'Native module RNFBAppModule not found',
]);
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/lib/queryClient';
import { AuthProvider, useAuth } from './src/auth/AuthProvider';
import { I18nProvider } from './src/i18n';
import { CurrencyProvider } from './src/currency/CurrencyContext';
import { ChatBadgeProvider } from './src/chat/ChatBadgeContext';
import { ChatFab } from './src/chat/ChatFab';
import { BasketProvider } from './src/basket/BasketContext';
import { DeliverToProvider } from './src/lib/deliverTo';
import { ModerationProvider } from './src/moderation/ModerationProvider';
import { RootNavigator } from './src/navigation/RootNavigator';
import { FirstRunGate } from './src/onboarding/FirstRunPrefs';
import { flushPendingNotificationRoute, navigationRef } from './src/navigation/navigationRef';
import { linking } from './src/navigation/linking';
import { registerForPush, unregisterForPush } from './src/lib/push';
import { IapSync } from './src/lib/IapSync';
import { C } from './src/theme/tokens';
import { useAppFonts } from './src/theme/fonts';
import { ErrorBoundary } from './src/ui/ErrorBoundary';

/** Registers/tears down FCM push as the signed-in user changes. */
function PushManager() {
  const { user } = useAuth();
  const prev = useRef(user);
  useEffect(() => {
    if (user) void registerForPush();
    else if (prev.current) void unregisterForPush();
    prev.current = user;
  }, [user]);
  return null;
}

function Gate() {
  const { ready } = useAuth();
  // One startup gate, not two: the session restore and the font registration
  // race in parallel and the splash holds until both settle. `useAppFonts`
  // resolves truthy on failure too, so a bad font asset can't wedge the boot.
  const fontsReady = useAppFonts();
  if (!ready || !fontsReady) {
    return (
      <View style={{ flex: 1, backgroundColor: C.evergreen, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }
  return (
    <>
      <PushManager />
      <IapSync />
      <FirstRunGate>
        <RootNavigator />
        <ChatFab />
      </FirstRunGate>
    </>
  );
}

export default function App() {
  return (
    // Outermost, and OUTSIDE every provider: a throw from a provider's own render
    // (i18n resources, currency, secure-store) is exactly the case that would
    // otherwise leave a release build on a blank screen with no way back.
    <ErrorBoundary onReset={() => queryClient.clear()}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <I18nProvider>
              <CurrencyProvider>
                <ChatBadgeProvider>
                  <BasketProvider>
                    <DeliverToProvider>
                      {/* Guideline 1.2: report/block has to reach posts, chat,
                          DMs, listings and profiles, so the sheet lives above
                          the navigator rather than in any one screen. */}
                      <ModerationProvider>
                        <NavigationContainer ref={navigationRef} linking={linking} onReady={flushPendingNotificationRoute}>
                          <StatusBar style="dark" />
                          <Gate />
                        </NavigationContainer>
                      </ModerationProvider>
                    </DeliverToProvider>
                  </BasketProvider>
                </ChatBadgeProvider>
              </CurrencyProvider>
            </I18nProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
