export type BackNavigation = {
  canGoBack: () => boolean;
  goBack: () => void;
  navigate: (screen: string) => void;
};

export function navigateBack(navigation: BackNavigation, fallback = 'Home') {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }
  navigation.navigate(fallback);
}
