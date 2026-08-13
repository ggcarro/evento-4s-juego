"use client";

import { useEffect, useState } from "react";

function segundosRestantes(endsAt: string | null): number | null {
  if (!endsAt) return null;
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 1000));
}

// Cuenta atrás recalculada cada segundo a partir de `ends_at` (no decrementa
// un contador local) para no acumular deriva si la pestaña estuvo en
// background o el reloj del cliente no es perfecto. Si `ends_at` cambia
// mientras el componente sigue montado (mismo timer, nuevo objetivo), el
// que lo usa debe forzar un remount con `key={endsAt}` — igual que ya se
// hace en otros sitios de la app para evitar estado obsoleto.
export function Countdown({
  endsAt,
  className,
}: {
  endsAt: string | null;
  className?: string;
}) {
  const [restantes, setRestantes] = useState(() => segundosRestantes(endsAt));

  useEffect(() => {
    if (!endsAt) return;
    const interval = setInterval(() => setRestantes(segundosRestantes(endsAt)), 250);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (restantes === null) return null;

  return <span className={className}>⏱ {restantes}s</span>;
}
