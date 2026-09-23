import { useEffect, useRef, useSyncExternalStore } from 'react';
import { onlineManager } from '@tanstack/react-query';

import { useReplayQueue } from '@/features/scan/hooks';

/** Rejoue une seule fois la file locale à chaque retour effectif du réseau. */
export function OfflineQueueSync() {
  const online = useSyncExternalStore(
    (listener) => onlineManager.subscribe(listener),
    () => onlineManager.isOnline(),
    () => true,
  );
  const { mutate: replay } = useReplayQueue();
  const attemptedWhileOnline = useRef(false);

  useEffect(() => {
    if (!online) {
      attemptedWhileOnline.current = false;
      return;
    }
    if (attemptedWhileOnline.current) return;

    attemptedWhileOnline.current = true;
    replay();
  }, [online, replay]);

  return null;
}
