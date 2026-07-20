import { CommunityWidget } from './community/CommunityWidget';
import { SupportWidget } from './support/SupportWidget';

/**
 * Mounts BOTH chat systems globally. They stay strictly separate: Community is
 * a floating drawer on the bottom-left, Live Support on the bottom-right.
 */
export function ChatWidgets() {
  return (
    <>
      <CommunityWidget />
      <SupportWidget />
    </>
  );
}
