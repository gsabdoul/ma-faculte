import { useEffect, useState } from 'react';

export function useCachedStatus(url?: string | null) {
  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      if (!url) {
        if (active) setIsCached(false);
        return;
      }
      try {
        const res = await caches.match(url);
        if (active) setIsCached(!!res);
      } catch {
        if (active) setIsCached(false);
      }
    };

    check();

    // Revalide quand le SW change de contrôleur
    const onControllerChange = () => check();
    navigator.serviceWorker?.addEventListener('controllerchange', onControllerChange);
    return () => {
      active = false;
      navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange);
    };
  }, [url]);

  return isCached;
}