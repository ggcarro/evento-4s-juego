import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { GAME_CHANNEL, GAME_EVENT, type GameStatePublico } from "@/lib/game-types";

// Emite el estado público de la partida a todos los clientes conectados
// (jugadores + pantalla). Abre un canal, espera a que quede suscrito, manda
// el mensaje y lo cierra — las acciones del master no son tan frecuentes
// como para mantener una conexión persistente en el servidor.
export async function broadcastGameState(state: GameStatePublico) {
  const admin = createAdminClient();
  const channel = admin.channel(GAME_CHANNEL);

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Timeout esperando la suscripción de Realtime"));
    }, 5000);

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timeout);
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        clearTimeout(timeout);
        reject(new Error(`Realtime subscribe falló: ${status}`));
      }
    });
  });

  await channel.send({ type: "broadcast", event: GAME_EVENT, payload: state });
  await admin.removeChannel(channel);
}
