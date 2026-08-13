import "server-only";
import { cookies } from "next/headers";

const MASTER_COOKIE = "master_session";

export async function isMaster() {
  const cookieStore = await cookies();
  const value = cookieStore.get(MASTER_COOKIE)?.value;
  return Boolean(value) && value === process.env.MASTER_PIN;
}

// Lanza si quien llama a una Server Action de master no tiene la cookie
// correcta. Server Actions son endpoints públicos por su URL interna, así
// que cada una debe volver a comprobar esto, no basta con proteger la página.
export async function requireMaster() {
  if (!(await isMaster())) {
    throw new Error("No autorizado");
  }
}

export async function setMasterCookie() {
  const cookieStore = await cookies();
  cookieStore.set(MASTER_COOKIE, process.env.MASTER_PIN!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}
