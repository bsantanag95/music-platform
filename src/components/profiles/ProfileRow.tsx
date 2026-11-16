import type { ReactNode } from "react";

// Fila de dos secciones del cuerpo del perfil (spec social-profiles, "Cuerpo del
// perfil en filas"; openspec: redesign-user-profile-phase2): lado a lado desde
// `lg`, con un filete entre ambas, y apiladas en pantallas angostas. Quien la
// compone decide con datos si hay una o dos secciones: con una sola, ocupa la
// fila entera, sin hueco. Sin ninguna, no dibuja nada.
export function ProfileRow({ start, end }: { start: ReactNode | null; end: ReactNode | null }) {
  if (!start && !end) return null;
  if (!start || !end) return <div className="flex w-full min-w-0 flex-col">{start ?? end}</div>;
  return (
    <div className="grid w-full min-w-0 gap-10 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-ink-border">
      <div className="flex min-w-0 flex-col lg:pr-10">{start}</div>
      <div className="flex min-w-0 flex-col lg:pl-10">{end}</div>
    </div>
  );
}
