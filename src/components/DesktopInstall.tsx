import { useEffect, useRef, useState } from "react";
import { Download, Monitor, RefreshCw } from "lucide-react";
import { registerDesktopApp, desktopStatus } from "../lib/desktop";
import type { InstallPrompt } from "../lib/desktop";
export default function DesktopInstall({ canUpdate }: { canUpdate: boolean }) {
  const [phase, setPhase] = useState<
      "preparing" | "ready" | "error" | "unsupported"
    >("preparing"),
    [installed, setInstalled] = useState(
      () => matchMedia("(display-mode: standalone)").matches,
    ),
    [prompt, setPrompt] = useState<InstallPrompt | null>(null),
    [reg, setReg] = useState<ServiceWorkerRegistration | null>(null),
    [update, setUpdate] = useState(false),
    [help, setHelp] = useState(false),
    [online, setOnline] = useState(navigator.onLine),
    requested = useRef(false);
  useEffect(() => {
    let disposed = false;
    const listeners: (() => void)[] = [];
    if (!("serviceWorker" in navigator) || !window.isSecureContext) {
      setPhase("unsupported");
      return;
    }
    function connected() {
      setOnline(navigator.onLine);
    }
    function beforeInstall(event: Event) {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    }
    function appInstalled() {
      setInstalled(true);
      setPrompt(null);
      setHelp(false);
    }
    async function refresh(registration: ServiceWorkerRegistration) {
      if (disposed) return;
      setUpdate(!!registration.waiting && !!registration.active);
      const worker = navigator.serviceWorker.controller ?? registration.active;
      if (!worker) return;
      try {
        const status = await desktopStatus(worker);
        if (!disposed) {
          setPhase(status.ready && status.compatible ? "ready" : "error");
          if (!status.compatible) setUpdate(true);
        }
      } catch {
        if (!disposed) setPhase("error");
      }
    }
    function controlChanged() {
      if (requested.current) {
        location.reload();
        return;
      }
      void registerDesktopApp()
        .then(refresh)
        .catch(() => {});
    }
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", appInstalled);
    window.addEventListener("online", connected);
    window.addEventListener("offline", connected);
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      controlChanged,
    );
    registerDesktopApp()
      .then((registration) => {
        if (disposed) return;
        setReg(registration);
        const watch = () => {
          const worker = registration.installing;
          if (!worker) return;
          const changed = () => {
            void refresh(registration);
            if (worker.state === "redundant" && !registration.active)
              setPhase("error");
          };
          worker.addEventListener("statechange", changed);
          listeners.push(() =>
            worker.removeEventListener("statechange", changed),
          );
        };
        registration.addEventListener("updatefound", watch);
        listeners.push(() =>
          registration.removeEventListener("updatefound", watch),
        );
        watch();
        void refresh(registration);
      })
      .catch(() => {
        if (!disposed) setPhase("error");
      });
    return () => {
      disposed = true;
      listeners.forEach((stop) => stop());
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", appInstalled);
      window.removeEventListener("online", connected);
      window.removeEventListener("offline", connected);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        controlChanged,
      );
    };
  }, []);
  async function install() {
    if (!prompt) {
      setHelp(true);
      return;
    }
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
    } catch {
      setHelp(true);
    } finally {
      setPrompt(null);
    }
  }
  function applyUpdate() {
    if (!canUpdate) return;
    if (reg?.waiting) {
      requested.current = true;
      reg.waiting.postMessage({ type: "ACTIVATE_UPDATE" });
    } else location.reload();
  }
  return (
    <>
      <section className="desktop-install-bar" aria-label="Aplicación para PC">
        <Monitor size={19} />
        <div>
          <b>
            {installed
              ? "Unirack Studio para PC"
              : "Usar Unirack Studio en tu PC"}
          </b>
          <span role="status">
            {phase === "ready"
              ? `${online ? "Listo para usar sin conexión" : "Sin conexión · proyecto disponible"}`
              : phase === "preparing"
                ? "Preparando el uso sin conexión…"
                : phase === "unsupported"
                  ? "Abre el sitio en Edge o Chrome para instalarlo."
                  : "No se pudo preparar el uso sin conexión. Conéctate y vuelve a abrir la aplicación."}
          </span>
        </div>
        {!installed && (
          <button
            className="button outline"
            disabled={phase === "preparing"}
            onClick={() => {
              void install();
            }}
          >
            <Download size={15} />
            Instalar en PC
          </button>
        )}
        {update && (
          <button
            className="button outline"
            onClick={applyUpdate}
            disabled={!canUpdate}
            title={
              canUpdate
                ? "Instalar la nueva versión"
                : "Termina de guardar o exportar tus vistas antes de actualizar"
            }
          >
            <RefreshCw size={15} />
            Actualizar aplicación
          </button>
        )}
        {update && !canUpdate && (
          <span className="help-text">
            Termina de guardar o exportar tus vistas antes de actualizar.
          </span>
        )}
      </section>
      {help && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Instalar en PC"
          >
            <h2>Instalar Unirack Studio en Windows</h2>
            <ol>
              <li>Abre este sitio en Microsoft Edge o Google Chrome.</li>
              <li>Espera el mensaje «Listo para usar sin conexión».</li>
              <li>
                Pulsa el icono de instalar junto a la dirección o busca
                «Instalar Unirack Studio» en el menú del navegador.
              </li>
            </ol>
            <p>
              Se abrirá en su propia ventana y tendrás un acceso desde Inicio.
              El primer uso requiere internet; después puedes trabajar y
              exportar sin conexión.
            </p>
            <p>
              Usa el mismo navegador para conservar tu proyecto. Para pasarlo a
              otro navegador, descarga el JSON con «Guardar proyecto» y
              recupéralo con «Abrir».
            </p>
            <button className="button primary" onClick={() => setHelp(false)}>
              Entendido
            </button>
          </section>
        </div>
      )}
    </>
  );
}
