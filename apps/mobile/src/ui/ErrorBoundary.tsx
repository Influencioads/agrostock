import { Component, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { C, radius, space, type } from '../theme/tokens';

/**
 * Last line of defence for a render error.
 *
 * Without one, a throw anywhere in the tree unmounts the whole app: React 19
 * discards the root, and a release build has no LogBox to show — the user gets a
 * blank screen and force-quitting is the only way out (relaunch lands on the
 * same screen and throws again). This catches it and offers a way back.
 *
 * Deliberately NOT translated: the i18n provider sits inside this boundary, so
 * if it is what failed, `t` is exactly what we cannot call. English is the
 * honest choice for a screen that only appears when something is already broken.
 */
interface Props {
  children: ReactNode;
  /** Clears app state so "Try again" lands somewhere useful (query cache, etc.). */
  onReset?: () => void;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Release builds have no LogBox; this is what makes the failure findable in
    // `adb logcat` / Xcode console instead of a silent blank screen.
    console.error('[ErrorBoundary]', error);
  }

  reset = () => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: C.page, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md }}>
        <Text style={{ ...type.h2, color: C.ink, textAlign: 'center' }}>Something went wrong</Text>
        <Text style={{ ...type.body, color: C.inkMuted, textAlign: 'center' }}>
          The app hit an unexpected error. You can try again — your account stays signed in.
        </Text>
        {/* The message, not the stack: enough for a user to quote in a support
            ticket, not enough to leak internals. */}
        <Text style={{ ...type.caption, color: C.inkMuted, textAlign: 'center' }} numberOfLines={3}>
          {error.message}
        </Text>
        <Pressable
          onPress={this.reset}
          style={{ backgroundColor: C.green, borderRadius: radius.md, paddingHorizontal: space.xl, paddingVertical: 14, minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={{ ...type.title, color: '#fff' }}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}
