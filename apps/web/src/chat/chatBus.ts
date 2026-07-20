/**
 * Tiny event bus that lets any page open the global chat widgets — e.g.
 * "Chat with seller" on a product page opens the Community drawer directly on
 * the DM thread with that seller.
 */

export interface OpenDmEvent {
  userId: string;
  name: string;
}

type Handler<T> = (payload: T) => void;

const dmHandlers = new Set<Handler<OpenDmEvent>>();
const supportHandlers = new Set<Handler<void>>();

export const chatBus = {
  openCommunityDm(userId: string, name: string) {
    dmHandlers.forEach((h) => h({ userId, name }));
  },
  openSupport() {
    supportHandlers.forEach((h) => h(undefined as void));
  },
  onOpenDm(handler: Handler<OpenDmEvent>) {
    dmHandlers.add(handler);
    return () => void dmHandlers.delete(handler);
  },
  onOpenSupport(handler: Handler<void>) {
    supportHandlers.add(handler);
    return () => void supportHandlers.delete(handler);
  },
};
