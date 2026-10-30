"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";
import { SETTINGS_TITLE_ID } from "./SettingsSection";

// Foco al cambiar de pantalla de Ajustes (openspec: polish-settings-overview, D3): tras una navegación dentro del área,
// el foco pasa al título de la pantalla nueva para que un lector de pantalla la anuncie y el teclado siga desde su
// contenido. En la carga inicial no se mueve. El título puede llegar después (el esqueleto de `loading.tsx`), así que
// se espera a que exista.
export function SettingsFocus() {
  const pathname = usePathname();
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    // Cuando cambia la ruta, el título de la pantalla anterior puede seguir montado: enfocarlo perdería el foco al
    // desmontarse. Se espera, observando el DOM, a un título distinto del que había (hasta 3 s).
    const stale = document.getElementById(SETTINGS_TITLE_ID);
    const tryFocus = () => {
      const title = document.getElementById(SETTINGS_TITLE_ID);
      if (!title || title === stale) return false;
      title.focus({ preventScroll: true });
      return true;
    };
    if (tryFocus()) return;
    const observer = new MutationObserver(() => {
      if (tryFocus()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => observer.disconnect(), 3000);
    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, [pathname]);

  return null;
}
