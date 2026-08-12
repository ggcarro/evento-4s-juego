import "server-only";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getAuthenticatedPlayer() {
  const cookieStore = await cookies();
  const playerId = cookieStore.get("player_id")?.value;
  const playerToken = cookieStore.get("player_token")?.value;
  if (!playerId || !playerToken) return null;

  const admin = createAdminClient();
  const { data: player } = await admin
    .from("players")
    .select("id, name, team_id, session_token, is_kicked")
    .eq("id", playerId)
    .single();

  if (!player || player.session_token !== playerToken || player.is_kicked) {
    return null;
  }

  return { id: player.id, name: player.name, team_id: player.team_id };
}
