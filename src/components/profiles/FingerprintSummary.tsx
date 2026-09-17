interface FingerprintSummaryProps {
  summary: string[];
}

// Resumen cualitativo de la huella de gusto para los niveles 1-2 del perfil
// (spec `taste-fingerprint`, "Resumen cualitativo para los niveles 1 y 2"):
// hasta 3 frases derivadas de la misma huella que alimenta los gráficos, sin
// gráficos ni cifras acá. La huella completa (curvas, crestas) vive aparte,
// en la vista de Nivel 3. Server Component; no se renderiza sin datos.
export function FingerprintSummary({ summary }: FingerprintSummaryProps) {
  if (summary.length === 0) return null;

  return (
    <ul className="flex w-full max-w-2xl flex-col gap-1">
      {summary.map((phrase) => (
        <li key={phrase} className="font-body text-sm text-paper-muted">
          {phrase}
        </li>
      ))}
    </ul>
  );
}
