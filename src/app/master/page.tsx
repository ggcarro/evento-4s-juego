const CONTROLES_PENDIENTES = [
  "Lanzar siguiente prueba",
  "Controlar timer (pausar / reanudar)",
  "Revelar respuesta correcta",
  "Mostrar leaderboard",
  "Saltar prueba",
  "Expulsar / renombrar jugador",
];

export default function MasterPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 bg-zinc-50 px-6 py-10">
      <h1 className="text-2xl font-bold text-zinc-900">Control de la partida</h1>

      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6">
        <p className="text-sm font-medium text-zinc-500">
          Controles por conectar en la siguiente iteración:
        </p>
        <ul className="mt-3 flex flex-col gap-2 text-sm text-zinc-700">
          {CONTROLES_PENDIENTES.map((control) => (
            <li key={control} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
              {control}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
