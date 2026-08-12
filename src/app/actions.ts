"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TeamId } from "@/lib/supabase/types";

const TEAM_IDS: TeamId[] = ["4space", "wolfast", "etech", "gijonudos"];

const LEETSPEAK: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
};

// Quita acentos, pasa a minúsculas y deshace sustituciones tipo leetspeak
// para comparar nombres contra la lista de palabras baneadas.
function normalize(raw: string) {
  let s = raw
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  for (const [digit, letter] of Object.entries(LEETSPEAK)) {
    s = s.split(digit).join(letter);
  }
  return s;
}

const SESSION_COOKIE_MAX_AGE = 60 * 60 * 8; // 8h, cubre el evento con margen

export type RegisterState = { error?: string };

export async function registerPlayer(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const rawName = String(formData.get("name") ?? "").trim();
  const teamId = String(formData.get("team_id") ?? "") as TeamId;

  if (rawName.length < 2 || rawName.length > 20) {
    return { error: "El nombre debe tener entre 2 y 20 caracteres." };
  }
  if (!TEAM_IDS.includes(teamId)) {
    return { error: "Elige un equipo." };
  }

  const admin = createAdminClient();
  const normalizedNoSpaces = normalize(rawName).replace(/[^a-z0-9]/g, "");

  const { data: bannedWords, error: bannedError } = await admin
    .from("banned_words")
    .select("word");

  if (bannedError) {
    return { error: "No se pudo comprobar el nombre, inténtalo de nuevo." };
  }

  const isBanned = bannedWords.some(({ word }) =>
    normalizedNoSpaces.includes(normalize(word))
  );
  if (isBanned) {
    return { error: "Ese nombre no está permitido, prueba con otro." };
  }

  const { data: inserted, error: insertError } = await admin
    .from("players")
    .insert({ name: rawName, team_id: teamId })
    .select("id, session_token")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return { error: "Ese nombre ya está en uso, prueba otro." };
    }
    return { error: "No se pudo crear el jugador, inténtalo de nuevo." };
  }

  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  };
  cookieStore.set("player_id", inserted.id, cookieOptions);
  cookieStore.set("player_token", inserted.session_token, cookieOptions);

  redirect("/juego");
}
