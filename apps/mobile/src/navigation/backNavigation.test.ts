import { describe, expect, it, vi } from 'vitest';
import { navigateBack } from './backAction';

describe('navigateBack', () => {
  it('uses navigation history when the screen can go back', () => {
    const navigation = {
      canGoBack: () => true,
      goBack: vi.fn(),
      navigate: vi.fn(),
    };

    navigateBack(navigation);

    expect(navigation.goBack).toHaveBeenCalledOnce();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('returns a root tab screen to Home when there is no history', () => {
    const navigation = {
      canGoBack: () => false,
      goBack: vi.fn(),
      navigate: vi.fn(),
    };

    navigateBack(navigation);

    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith('Home');
  });
});
