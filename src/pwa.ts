import { registerSW } from 'virtual:pwa-register';

type UpdateFunction = (reloadPage?: boolean) => Promise<void>;

declare global {
  interface WindowEventMap {
    'pwa:need-refresh': CustomEvent<() => Promise<void>>;
    'pwa:offline-ready': Event;
  }
}

export const setupPwaListeners = () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  let updateSW: UpdateFunction | undefined;

  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (!updateSW) return;
      const runUpdate = () => updateSW?.(true);
      window.dispatchEvent(new CustomEvent('pwa:need-refresh', { detail: runUpdate }));
    },
    onOfflineReady() {
      window.dispatchEvent(new Event('pwa:offline-ready'));
    },
  });
};
