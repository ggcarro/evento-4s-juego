"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Genera el QR en el propio navegador (sin depender de ningún servicio
// externo): más fiable para un evento en directo, donde no queremos que un
// tercero caído se lleve por delante la pantalla de acceso.
export function QRCodeImage({ value, size = 320 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    QRCode.toDataURL(value, { width: size, margin: 1 }).then((url) => {
      if (!cancelado) setDataUrl(url);
    });
    return () => {
      cancelado = true;
    };
  }, [value, size]);

  if (!dataUrl) {
    return <div style={{ width: size, height: size }} className="animate-pulse rounded-2xl bg-zinc-800" />;
  }

  // eslint-disable-next-line @next/next/no-img-element -- data: URL generado en el cliente, no aplica next/image
  return <img src={dataUrl} alt="Código QR para unirse al juego" width={size} height={size} className="rounded-2xl bg-white p-3" />;
}
