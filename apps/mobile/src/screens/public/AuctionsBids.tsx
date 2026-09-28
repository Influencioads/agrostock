import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, Segmented } from '../../ui';
import { C } from '../../theme/tokens';
import { useI18n } from '../../i18n';
import { useBasketAction } from '../../basket/useBasketAction';
import { AuctionsBoard } from './AuctionsBoard';
import { BuyerBidsBoard } from './BuyerBidsBoard';

/**
 * The shop's "Auctions & Bids" tab: the live auction board and the public
 * buyer-bid (reverse auction) board, and nothing else. It took the Orders
 * tab's slot — orders now live under Account.
 */
export function AuctionsBids() {
  const { t } = useI18n();
  const basketAction = useBasketAction();
  const [view, setView] = useState<'auctions' | 'bids'>('auctions');

  // AppBar owns the status-bar inset — see Browse.tsx.
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.page }} edges={[]}>
      <AppBar title={t('nav:tab.AuctionsBids')} actions={[basketAction]} />
      <Segmented
        options={[
          { id: 'auctions', label: t('nav:stack.AuctionsBoard') },
          { id: 'bids', label: t('nav:stack.BuyerBidsBoard') },
        ]}
        value={view}
        onChange={(id) => setView(id as 'auctions' | 'bids')}
      />
      <View style={{ flex: 1 }}>{view === 'auctions' ? <AuctionsBoard /> : <BuyerBidsBoard />}</View>
    </SafeAreaView>
  );
}
