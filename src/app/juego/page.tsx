import Link from "next/link";
import { getAuthenticatedPlayer } from "@/lib/session";
import { getPublicGameState } from "@/lib/game-state";
import { GameView } from "@/components/game-view";

export default async function JuegoPage() {
  const player = await getAuthenticatedPlayer();

  if (!player) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-zinc-50 px-6 text-center">
        <h1 className="text-xl font-bold text-zinc-900">
          No encontramos tu sesión
        </h1>
        <p className="max-w-xs text-zinc-500">
          Puede que haya caducado. Vuelve a inscribirte.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Volver a entrar
        </Link>
      </div>
    );
  }

  const initialState = await getPublicGameState();

  return <GameView player={player} initialState={initialState} />;
}
