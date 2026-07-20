import { EarningsScreen } from '../components/MoneyScreens';

/** Worker earnings tab — read-only earnings with breakdown + withdraw. */
export function WorkerEarnings() {
  // Tab root (no navigator header), so it must opt into the top status-bar inset.
  return <EarningsScreen edges={['top']} />;
}
