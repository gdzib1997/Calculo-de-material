export interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
export interface OfflineStatus {
  ready: boolean;
  compatible: boolean;
  revision: string;
}
let registration: Promise<ServiceWorkerRegistration> | undefined;
export function registerDesktopApp() {
  if (!registration)
    registration = (async () => {
      const root = new URL(import.meta.env.BASE_URL, location.origin),
        existing = await navigator.serviceWorker.getRegistration(root.href);
      if (existing) {
        void existing.update().catch(() => {});
        return existing;
      }
      return navigator.serviceWorker.register(new URL("sw.js", root), {
        scope: root.pathname,
        updateViaCache: "none",
      });
    })();
  return registration;
}
export function desktopStatus(worker: ServiceWorker): Promise<OfflineStatus> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel(),
      timer = setTimeout(() => {
        channel.port1.close();
        reject(new Error("No se pudo confirmar el modo sin conexión."));
      }, 8000);
    channel.port1.onmessage = (e) => {
      clearTimeout(timer);
      channel.port1.close();
      resolve(e.data);
    };
    const mainAsset = document.querySelector<HTMLScriptElement>(
      'script[type="module"][src]',
    )?.src;
    worker.postMessage({ type: "OFFLINE_STATUS", mainAsset }, [channel.port2]);
  });
}
