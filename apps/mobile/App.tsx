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
]);
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/lib/queryClient';
import { AuthProvider, useAuth } from './src/auth/AuthProvider';
import { I18nProvider } from './src/i18n';
import { CurrencyProvider } from './src/currency/CurrencyContext';
import { ChatBadgeProvider } from './src/chat/ChatBadgeContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import { registerForPush, unregisterForPush } from './src/lib/push';
import { C } from './src/theme/tokens';

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
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: C.evergreen, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }
  return (
    <>
      <PushManager />
      <RootNavigator />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <I18nProvider>
            <CurrencyProvider>
              <ChatBadgeProvider>
                <NavigationContainer ref={navigationRef}>
                  <StatusBar style="dark" />
                  <Gate />
                </NavigationContainer>
              </ChatBadgeProvider>
            </CurrencyProvider>
          </I18nProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
