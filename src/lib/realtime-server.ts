import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { GAME_CHANNEL, GAME_EVENT, QR_EVENT, type GameStatePublico } from "@/lib/game-types";

// Abre un canal, espera a que quede suscrito, manda el mensaje y lo cierra —
// las acciones del master no son tan frecuentes como para mantener una
// conexión persistente en el servidor.
async function broadcast(event: string, payload: unknown) {
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

  await channel.send({ type: "broadcast", event, payload });
  await admin.removeChannel(channel);
}

// Emite el estado público de la partida a todos los clientes conectados
// (jugadores + pantalla).
export async function broadcastGameState(state: GameStatePublico) {
  await broadcast(GAME_EVENT, state);
}

// Muestra/oculta el QR de acceso en la pantalla. Es puramente cosmético (no
// forma parte del estado del juego ni se persiste), así que va por un evento
// separado en vez de colgar de GameStatePublico.
export async function broadcastQR(visible: boolean) {
  await broadcast(QR_EVENT, { visible });
}
