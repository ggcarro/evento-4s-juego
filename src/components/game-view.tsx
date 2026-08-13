"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  submitAnswer,
  submitWager,
  registrarTaps,
  submitBid,
  getPujasActuales,
  getMiPuntuacion,
  submitVoto,
  getVotosDetalle,
} from "@/app/juego/actions";
import { useGameChannel } from "@/lib/use-game-channel";
import type { GameStatePublico } from "@/lib/game-types";
import { TEAMS } from "@/lib/teams";
import type { TeamId } from "@/lib/supabase/types";

type Player = { id: string; name: string; team_id: TeamId };

export function GameView({
  player,
  initialState,
}: {
  player: Player;
  initialState: GameStatePublico;
}) {
  const [state, setState] = useState(initialState);
  const [answered, setAnswered] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useGameChannel((next) => {
    setState((prev) => {
      if (prev.prueba?.id !== next.prueba?.id || prev.fase !== next.fase) {
        setAnswered(null);
        setMessage(null);
      }
      return next;
    });
  });

  const team = TEAMS.find((t) => t.id === player.team_id);

  function enviar(respuesta: Record<string, unknown>) {
    if (!state.prueba) return;
    setAnswered(respuesta);
    startTransition(async () => {
      const result = await submitAnswer(state.prueba!.id, respuesta);
      setMessage(result.message);
    });
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-4 bg-zinc-50 px-6 py-10 text-center">
      <div className="flex items-center gap-2">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
          style={{ backgroundColor: `${team?.color}22` }}
        >
          {team?.icon}
        </span>
        <span className="text-sm font-medium text-zinc-600">
          {player.name} · {team?.name}
        </span>
      </div>

      {state.fase === "lobby" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="animate-pulse text-5xl">⏳</div>
          <h1 className="text-2xl font-bold text-zinc-900">Esperando al master...</h1>
          <p className="max-w-xs text-zinc-500">
            Aquí aparecerá la prueba en cuanto empiece la siguiente ronda.
          </p>
        </div>
      )}

      {state.fase === "apostando" && state.prueba && (
        <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-5">
          <h1 className="text-xl font-bold text-zinc-900">💰 Doble o nada</h1>
          <p className="text-sm text-zinc-500">
            Todavía no sabes de qué va la pregunta. Arriesga los puntos que quieras de los que
            llevas: si aciertas los doblas, si fallas los pierdes.
          </p>
          <ApuestaLibreInput key={state.prueba.id} pruebaId={state.prueba.id} />
        </div>
      )}

      {state.fase === "subastando" && state.prueba && (
        <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-5">
          <h1 className="text-xl font-bold text-zinc-900">🔨 {state.prueba.enunciado}</h1>
          <p className="text-sm text-zinc-500">
            Pujad entre todos por el equipo. Vale la última puja que mande cualquiera.
          </p>
          <SubastaInput pruebaId={state.prueba.id} equipo={player.team_id} />
        </div>
      )}

      {state.fase === "activa" && state.prueba && (
        <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-5">
          <MecanicaBadge mecanica={state.prueba.mecanica} />

          {state.prueba.tipo === "tira_afloja" ? (
            <TiraAflojaInput
              key={state.prueba.id}
              pruebaId={state.prueba.id}
              enunciado={state.prueba.enunciado}
            />
          ) : state.prueba.tipo === "votacion" ? (
            <VotacionInput
              key={state.prueba.id}
              pruebaId={state.prueba.id}
              enunciado={state.prueba.enunciado}
              opciones={(state.prueba.config.opciones as string[] | undefined) ?? []}
              equipo={player.team_id}
              propioId={player.id}
            />
          ) : (
            <>
              <h1 className="text-xl font-bold text-zinc-900">{state.prueba.enunciado}</h1>
              {answered ? (
                <p className="text-sm font-medium text-zinc-500">
                  {pending ? "Enviando..." : message ?? "Respuesta enviada, esperando al resto..."}
                </p>
              ) : (
                <PruebaInput prueba={state.prueba} onSubmit={enviar} disabled={pending} />
              )}
            </>
          )}
        </div>
      )}

      {state.fase === "revelada" && state.prueba && (
        <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4">
          <h1 className="text-xl font-bold text-zinc-900">{state.prueba.enunciado}</h1>
          <RespuestaCorrecta prueba={state.prueba} solucion={state.solucion} />
          <ElegidosReveal mecanica={state.prueba.mecanica} elegidos={state.elegidos} />
          {answered && (
            <p className="text-sm font-medium text-zinc-500">Tu respuesta ya quedó registrada.</p>
          )}
        </div>
      )}

      {state.fase === "leaderboard" && (
        <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-3">
          <h1 className="text-xl font-bold text-zinc-900">Clasificación</h1>
          <ol className="flex w-full flex-col gap-2">
            {state.leaderboard?.map((entry, i) => {
              const t = TEAMS.find((x) => x.id === entry.team_id);
              return (
                <li
                  key={entry.team_id}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left"
                >
                  <span className="w-5 text-zinc-400">{i + 1}.</span>
                  <span>{t?.icon}</span>
                  <span className="flex-1 font-medium text-zinc-900">{t?.name}</span>
                  <span className="text-sm text-zinc-500">{entry.avg_score} pts</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

function MecanicaBadge({ mecanica }: { mecanica: NonNullable<GameStatePublico["prueba"]>["mecanica"] }) {
  const texto =
    mecanica === "portavoz_secreto"
      ? "🎭 Portavoz secreto: solo cuenta la respuesta de un elegido por equipo"
      : mecanica === "doble_aleatorio"
        ? "🎲 Alguien de tu equipo puede doblar los puntos esta ronda"
        : mecanica === "apuesta_ciega"
          ? "💰 Tu apuesta de esta ronda sigue en juego"
          : null;
  if (!texto) return null;
  return (
    <p className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
      {texto}
    </p>
  );
}

function ElegidosReveal({
  mecanica,
  elegidos,
}: {
  mecanica: NonNullable<GameStatePublico["prueba"]>["mecanica"];
  elegidos: GameStatePublico["elegidos"];
}) {
  if (!mecanica || !elegidos) return null;
  const titulo = mecanica === "portavoz_secreto" ? "Portavoces de esta ronda" : "Doblaron puntos";
  return (
    <div className="w-full rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-xs">
      <p className="mb-1 font-semibold text-amber-900">{titulo}</p>
      {Object.entries(elegidos).map(([teamId, info]) => {
        const team = TEAMS.find((t) => t.id === teamId);
        return (
          <p key={teamId} className="text-amber-800">
            {team?.icon} {team?.name}: {info.name}
          </p>
        );
      })}
    </div>
  );
}

function TiraAflojaInput({ pruebaId, enunciado }: { pruebaId: string; enunciado: string }) {
  const [taps, setTaps] = useState(0);
  const tapsRef = useRef(0);
  const lastSent = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (tapsRef.current !== lastSent.current) {
        lastSent.current = tapsRef.current;
        registrarTaps(pruebaId, tapsRef.current);
      }
    }, 400);
    return () => {
      clearInterval(interval);
      if (tapsRef.current !== lastSent.current) {
        registrarTaps(pruebaId, tapsRef.current);
      }
    };
  }, [pruebaId]);

  return (
    <div className="flex flex-col items-center gap-4">
      <h1 className="text-xl font-bold text-zinc-900">{enunciado}</h1>
      <span className="text-5xl font-black text-zinc-900">{taps}</span>
      <button
        type="button"
        onClick={() => {
          tapsRef.current += 1;
          setTaps(tapsRef.current);
        }}
        className="h-32 w-32 select-none rounded-full bg-zinc-900 text-lg font-bold text-white active:scale-95"
      >
        ¡DALE!
      </button>
    </div>
  );
}

function ApuestaLibreInput({ pruebaId }: { pruebaId: string }) {
  const [maxPuntos, setMaxPuntos] = useState(0);
  const [valor, setValor] = useState(0);
  const [ultimaEnviada, setUltimaEnviada] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    getMiPuntuacion().then((p) => setMaxPuntos(Math.max(0, p)));
  }, []);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <p className="text-xs text-zinc-400">Llevas {maxPuntos} pts</p>
      <span className="text-3xl font-bold text-zinc-900">{Math.min(valor, maxPuntos)} pts</span>
      <input
        type="range"
        min={0}
        max={maxPuntos}
        step={10}
        value={Math.min(valor, maxPuntos)}
        onChange={(e) => setValor(Number(e.target.value))}
        disabled={maxPuntos === 0}
        className="w-full"
      />
      <button
        type="button"
        disabled={maxPuntos === 0}
        onClick={() => {
          const cantidad = Math.min(valor, maxPuntos);
          setUltimaEnviada(cantidad);
          submitWager(pruebaId, cantidad).then((result) => setMensaje(result.message));
        }}
        className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        {ultimaEnviada === null ? "Apostar" : "Cambiar apuesta"}
      </button>
      {ultimaEnviada !== null && (
        <p className="text-xs text-zinc-500">{mensaje ?? `Apostados: ${ultimaEnviada} pts`}</p>
      )}
    </div>
  );
}

function SubastaInput({ pruebaId, equipo }: { pruebaId: string; equipo: TeamId }) {
  const [valor, setValor] = useState(0);
  const [ultimaEnviada, setUltimaEnviada] = useState<number | null>(null);
  const [pujas, setPujas] = useState<Record<string, number>>({});

  useEffect(() => {
    const interval = setInterval(async () => {
      setPujas(await getPujasActuales(pruebaId));
    }, 1000);
    return () => clearInterval(interval);
  }, [pruebaId]);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <span className="text-3xl font-bold text-zinc-900">{valor} pts</span>
      <input
        type="range"
        min={0}
        max={500}
        step={10}
        value={valor}
        onChange={(e) => setValor(Number(e.target.value))}
        className="w-full"
      />
      <button
        type="button"
        onClick={() => {
          setUltimaEnviada(valor);
          submitBid(pruebaId, valor);
        }}
        className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white"
      >
        {ultimaEnviada === null ? "Pujar" : "Repujar"}
      </button>
      {ultimaEnviada !== null && (
        <p className="text-xs text-zinc-500">Vuestra puja actual: {ultimaEnviada} pts</p>
      )}

      <div className="mt-2 flex w-full flex-col gap-1.5">
        {TEAMS.map((t) => (
          <div
            key={t.id}
            className={`flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm ${
              t.id === equipo ? "border-zinc-900 font-semibold" : "border-zinc-200 text-zinc-500"
            }`}
          >
            <span>
              {t.icon} {t.name}
            </span>
            <span>{pujas[t.id] ?? 0} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VotacionInput({
  pruebaId,
  enunciado,
  opciones,
  equipo,
  propioId,
}: {
  pruebaId: string;
  enunciado: string;
  opciones: string[];
  equipo: TeamId;
  propioId: string;
}) {
  const [miVoto, setMiVoto] = useState<number | null>(null);
  const [votos, setVotos] = useState<{ player_id: string; nombre: string; indice: number }[]>([]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const todos = await getVotosDetalle(pruebaId);
      const delEquipo = todos.filter((v) => v.team_id === equipo);
      setVotos(delEquipo);
      const propio = delEquipo.find((v) => v.player_id === propioId);
      if (propio) setMiVoto(propio.indice);
    }, 1000);
    return () => clearInterval(interval);
  }, [pruebaId, equipo, propioId]);

  function votar(indice: number) {
    setMiVoto(indice);
    submitVoto(pruebaId, indice);
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <h1 className="text-xl font-bold text-zinc-900">🗳️ {enunciado}</h1>
      <div className="flex w-full flex-col gap-2">
        {opciones.map((opcion, i) => (
          <button
            key={i}
            type="button"
            onClick={() => votar(i)}
            className={`rounded-lg border px-4 py-2.5 text-left text-sm font-medium ${
              miVoto === i
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 text-zinc-800 hover:border-zinc-900"
            }`}
          >
            {opcion}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-1 rounded-lg border border-zinc-200 bg-white p-3 text-left">
        <p className="text-xs font-semibold text-zinc-500">Vuestro equipo va votando:</p>
        {votos.length === 0 && <p className="text-xs text-zinc-400">Nadie ha votado todavía.</p>}
        {votos.map((v) => (
          <p key={v.player_id} className="text-xs text-zinc-700">
            {v.nombre}: <span className="font-medium">{opciones[v.indice] ?? "?"}</span>
          </p>
        ))}
      </div>
      <p className="text-xs text-zinc-400">
        Gana la opción con más votos de tu equipo — puedes cambiar tu voto mientras dé tiempo.
      </p>
    </div>
  );
}

function PruebaInput({
  prueba,
  onSubmit,
  disabled,
}: {
  prueba: NonNullable<GameStatePublico["prueba"]>;
  onSubmit: (respuesta: Record<string, unknown>) => void;
  disabled: boolean;
}) {
  if (prueba.tipo === "quiz") {
    const opciones = (prueba.config.opciones as string[] | undefined) ?? [];
    return (
      <div className="flex w-full flex-col gap-2">
        {opciones.map((opcion, i) => (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onSubmit({ indice: i })}
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:border-zinc-900 disabled:opacity-40"
          >
            {opcion}
          </button>
        ))}
      </div>
    );
  }

  if (prueba.tipo === "true_false") {
    return (
      <div className="flex w-full gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSubmit({ valor: true })}
          className="flex-1 rounded-lg border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-800 hover:border-zinc-900 disabled:opacity-40"
        >
          Verdadero
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSubmit({ valor: false })}
          className="flex-1 rounded-lg border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-800 hover:border-zinc-900 disabled:opacity-40"
        >
          Falso
        </button>
      </div>
    );
  }

  if (prueba.tipo === "slider") {
    const min = Number(prueba.config.min ?? 0);
    const max = Number(prueba.config.max ?? 100);
    return <SliderInput min={min} max={max} disabled={disabled} onSubmit={onSubmit} />;
  }

  return <p className="text-sm text-zinc-500">Tipo de prueba no soportado todavía.</p>;
}

function SliderInput({
  min,
  max,
  disabled,
  onSubmit,
}: {
  min: number;
  max: number;
  disabled: boolean;
  onSubmit: (respuesta: Record<string, unknown>) => void;
}) {
  const [valor, setValor] = useState(Math.round((min + max) / 2));
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <span className="text-3xl font-bold text-zinc-900">{valor}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={valor}
        disabled={disabled}
        onChange={(e) => setValor(Number(e.target.value))}
        className="w-full"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSubmit({ valor })}
        className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        Confirmar
      </button>
    </div>
  );
}

function RespuestaCorrecta({
  prueba,
  solucion,
}: {
  prueba: NonNullable<GameStatePublico["prueba"]>;
  solucion: GameStatePublico["solucion"];
}) {
  if (!solucion) return null;

  if (prueba.tipo === "quiz") {
    const opciones = (prueba.config.opciones as string[] | undefined) ?? [];
    const indice = solucion.indice_correcto as number;
    return (
      <p className="rounded-lg bg-green-100 px-4 py-2.5 text-sm font-semibold text-green-800">
        Correcta: {opciones[indice]}
      </p>
    );
  }
  if (prueba.tipo === "true_false") {
    return (
      <p className="rounded-lg bg-green-100 px-4 py-2.5 text-sm font-semibold text-green-800">
        Correcta: {solucion.correcto ? "Verdadero" : "Falso"}
      </p>
    );
  }
  if (prueba.tipo === "slider") {
    return (
      <p className="rounded-lg bg-green-100 px-4 py-2.5 text-sm font-semibold text-green-800">
        El número era: {String(solucion.objetivo)}
      </p>
    );
  }
  if (prueba.tipo === "votacion") {
    const opciones = (prueba.config.opciones as string[] | undefined) ?? [];
    const indiceCorrecto = solucion.indice_correcto as number;
    const mayoriaPorEquipo = (solucion.mayoriaPorEquipo as Record<string, number>) ?? {};
    return (
      <div className="flex w-full flex-col gap-2">
        <p className="rounded-lg bg-green-100 px-4 py-2.5 text-sm font-semibold text-green-800">
          Correcta: {opciones[indiceCorrecto]}
        </p>
        {TEAMS.map((t) => {
          const mayoria = mayoriaPorEquipo[t.id];
          if (mayoria === undefined) return null;
          const acerto = mayoria === indiceCorrecto;
          return (
            <p key={t.id} className={`text-xs ${acerto ? "text-green-700" : "text-zinc-500"}`}>
              {t.icon} {t.name} votó: {opciones[mayoria] ?? "?"} {acerto ? "✓" : ""}
            </p>
          );
        })}
      </div>
    );
  }
  if (prueba.tipo === "subasta") {
    const subasta = solucion.subasta as
      | { equipo: string; cantidad: number; premio: number; neto: number }
      | null;
    const pujas = (solucion.pujas as Record<string, number>) ?? {};
    const equipoGanador = TEAMS.find((t) => t.id === subasta?.equipo);
    return (
      <div className="flex w-full flex-col gap-2">
        {subasta ? (
          <p className="rounded-lg bg-green-100 px-4 py-2.5 text-sm font-semibold text-green-800">
            Ganó {equipoGanador?.icon} {equipoGanador?.name} con {subasta.cantidad} pts · premio{" "}
            {subasta.premio} · neto {subasta.neto >= 0 ? "+" : ""}
            {subasta.neto}
          </p>
        ) : (
          <p className="rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-600">
            Nadie pujó, no hubo ganador.
          </p>
        )}
        {TEAMS.map((t) => (
          <p key={t.id} className="text-xs text-zinc-500">
            {t.icon} {t.name}: {pujas[t.id] ?? 0} pts pujados
          </p>
        ))}
      </div>
    );
  }
  if (prueba.tipo === "tira_afloja") {
    const totales = (solucion.totales as Record<string, number>) ?? {};
    const ganador = solucion.ganador as string | null;
    const equipoGanador = TEAMS.find((t) => t.id === ganador);
    return (
      <div className="flex w-full flex-col gap-2">
        <p className="rounded-lg bg-green-100 px-4 py-2.5 text-sm font-semibold text-green-800">
          Ganó {equipoGanador?.icon} {equipoGanador?.name ?? "nadie"}
        </p>
        {TEAMS.map((t) => (
          <p key={t.id} className="text-xs text-zinc-500">
            {t.icon} {t.name}: {totales[t.id] ?? 0} pulsaciones
          </p>
        ))}
      </div>
    );
  }
  return null;
}
