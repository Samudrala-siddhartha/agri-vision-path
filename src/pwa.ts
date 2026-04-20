// PWA service-worker registration with iframe + preview-host guards.
// Inside the Lovable editor preview the SW must NEVER register, otherwise
// it will cache stale builds and break navigation.

const inIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const host = window.location.hostname;
const isPreviewHost =
  host.includes("id-preview--") ||
  host.includes("lovableproject.com") ||
  host.includes("lovable.app") ||
  host === "localhost" ||
  host === "127.0.0.1";

export async function setupPWA() {
  if (!("serviceWorker" in navigator)) return;

  if (inIframe || isPreviewHost) {
    // Tear down anything that may have been previously registered
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
    return;
  }

  try {
    const { registerSW } = await import("virtual:pwa-register");
    registerSW({
      immediate: true,
      onRegisteredSW(_swUrl, registration) {
        // Hourly update check while the app is open
        if (registration) {
          setInterval(() => registration.update(), 60 * 60 * 1000);
        }
      },
    });
  } catch (e) {
    console.warn("PWA registration skipped:", e);
  }
}
