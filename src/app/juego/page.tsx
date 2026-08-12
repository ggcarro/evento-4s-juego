import Link from "next/link";
import { getAuthenticatedPlayer } from "@/lib/session";
import { TEAMS } from "@/lib/teams";

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

  const team = TEAMS.find((t) => t.id === player.team_id);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-zinc-50 px-6 text-center">
      <span
        className="flex h-16 w-16 items-center justify-center rounded-full text-3xl"
        style={{ backgroundColor: `${team?.color}22` }}
      >
        {team?.icon}
      </span>
      <p className="text-sm font-medium text-zinc-500">{team?.name}</p>
      <h1 className="text-2xl font-bold text-zinc-900">Hola, {player.name} 👋</h1>
      <div className="mt-4 animate-pulse text-4xl">⏳</div>
      <p className="max-w-xs text-zinc-500">
        Esperando a que el master lance la siguiente prueba.
      </p>
    </div>
  );
}
