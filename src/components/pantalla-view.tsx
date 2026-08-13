"use client";

import { useEffect, useRef, useState } from "react";
import { useGameChannel, useQRChannel } from "@/lib/use-game-channel";
import { getTirafloneTotales, getPujasActuales, getVotosDetalle } from "@/app/juego/actions";
import { Countdown } from "@/components/countdown";
import { QRCodeImage } from "@/components/qr-code";
import type { GameStatePublico, RuletaResultado } from "@/lib/game-types";
import { TEAMS } from "@/lib/teams";

export function PantallaView({ initialState }: { initialState: GameStatePublico }) {
  const [state, setState] = useState(initialState);
  useGameChannel(setState);

  const [qrVisible, setQrVisible] = useState(false);
  useQRChannel(setQrVisible);

  if (qrVisible) {
    return <QRPantalla />;
  }

  if (state.fase === "lobby") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg uppercase tracking-[0.3em] text-zinc-500">Juego del evento</p>
        <h1 className="text-6xl font-black">Esperando a que empiece...</h1>
      </div>
    );
  }

  if (state.fase === "apostando") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <p className="text-lg uppercase tracking-[0.3em] text-amber-400">Apuesta ciega</p>
        <h1 className="text-5xl font-black">¿Cuánto arriesgáis?</h1>
        <p className="text-xl text-zinc-400">La pregunta se revela en cuanto se cierren las apuestas...</p>
      </div>
    );
  }

  if (state.fase === "ruleta" && state.prueba) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-10 px-16 text-center">
        <p className="text-lg font-bold uppercase tracking-wide text-amber-400">🎡 ¡Gira la ruleta!</p>
        <RuletaCeremoniaPantalla
          key={state.prueba.id}
          segmentos={(state.prueba.config.ruleta_segmentos as RuletaResultado[] | undefined) ?? []}
          ruleta={state.ruleta}
          turno={state.ruleta_turno}
          parados={state.ruleta_parados}
        />
      </div>
    );
  }

  if (
    (state.fase === "activa" || state.fase === "revelada" || state.fase === "subastando") &&
    state.prueba
  ) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-10 px-16 text-center">
        <MecanicaBanner mecanica={state.prueba.mecanica} />
        {state.fase === "activa" && (
          <Countdown key={state.ends_at} endsAt={state.ends_at} className="text-2xl font-bold text-zinc-300" />
        )}

        {state.fase === "revelada" && state.prueba.mecanica === "ruleta" && (
          <RuletaPanel
            ruleta={state.ruleta}
            resumen={state.solucion?.ruleta_resumen as Record<string, { mayoria: boolean }> | undefined}
          />
        )}

        <h1 className="text-5xl font-black leading-tight">{state.prueba.enunciado}</h1>

        {state.prueba.tipo === "quiz" &&
          (state.prueba.config.video_url as string | undefined) && (
            <video
              src={state.prueba.config.video_url as string}
              autoPlay
              muted
              loop
              playsInline
              className="max-h-[40vh] rounded-2xl border border-zinc-700"
            />
          )}

        {state.prueba.tipo === "quiz" && (
          <div className="grid grid-cols-2 gap-6 text-3xl font-bold">
            {((state.prueba.config.opciones as string[] | undefined) ?? []).map((op, i) => {
              const isCorrect =
                state.fase === "revelada" && state.solucion?.indice_correcto === i;
              return (
                <div
                  key={i}
                  className={`rounded-2xl border-2 px-8 py-6 ${
                    isCorrect
                      ? "border-green-400 bg-green-400/10 text-green-300"
                      : "border-zinc-700 text-zinc-100"
                  }`}
                >
                  {op}
                </div>
              );
            })}
          </div>
        )}

        {state.prueba.tipo === "true_false" && (
          <div className="flex gap-8 text-4xl font-black">
            {[true, false].map((val) => {
              const isCorrect = state.fase === "revelada" && state.solucion?.correcto === val;
              return (
                <div
                  key={String(val)}
                  className={`rounded-2xl border-2 px-12 py-8 ${
                    isCorrect
                      ? "border-green-400 bg-green-400/10 text-green-300"
                      : "border-zinc-700 text-zinc-100"
                  }`}
                >
                  {val ? "Verdadero" : "Falso"}
                </div>
              );
            })}
          </div>
        )}

        {state.prueba.tipo === "slider" && (
          <p className="text-4xl font-black text-zinc-100">
            {state.fase === "revelada"
              ? `La respuesta era: ${String(state.solucion?.objetivo)}`
              : `Entre ${String(state.prueba.config.min)} y ${String(state.prueba.config.max)}`}
          </p>
        )}

        {state.prueba.tipo === "votacion" && (
          <VotacionPantalla
            pruebaId={state.prueba.id}
            opciones={(state.prueba.config.opciones as string[] | undefined) ?? []}
            revelado={state.fase === "revelada"}
            indiceCorrecto={
              state.fase === "revelada"
                ? (state.solucion?.indice_correcto as number | undefined)
                : undefined
            }
            mayoriaPorEquipo={
              state.fase === "revelada"
                ? (state.solucion?.mayoriaPorEquipo as Record<string, number> | undefined)
                : undefined
            }
          />
        )}

        {state.prueba.tipo === "tira_afloja" && (
          <TiraAflojaBar
            pruebaId={state.prueba.id}
            revelado={state.fase === "revelada"}
            totalesFinal={
              state.fase === "revelada"
                ? (state.solucion?.totales as Record<string, number> | undefined)
                : undefined
            }
          />
        )}

        {state.prueba.tipo === "subasta" && (
          <PujasBar
            pruebaId={state.prueba.id}
            revelado={state.fase === "revelada"}
            pujasFinal={
              state.fase === "revelada"
                ? (state.solucion?.pujas as Record<string, number> | undefined)
                : undefined
            }
          />
        )}

        {state.fase === "revelada" && state.prueba.tipo === "subasta" && (
          <SubastaResultado solucion={state.solucion} />
        )}

        {state.fase === "revelada" && state.elegidos && (
          <ElegidosBanner mecanica={state.prueba.mecanica} elegidos={state.elegidos} />
        )}
      </div>
    );
  }

  if (state.fase === "leaderboard") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-16 text-center">
        <h1 className="text-5xl font-black">Clasificación</h1>
        <ol className="flex w-full max-w-2xl flex-col gap-4">
          {state.leaderboard?.map((entry, i) => {
            const team = TEAMS.find((t) => t.id === entry.team_id);
            return (
              <li
                key={entry.team_id}
                className="flex items-center gap-4 rounded-2xl border border-zinc-700 px-8 py-5 text-left text-3xl font-bold"
              >
                <span className="text-zinc-500">{i + 1}</span>
                <span>{team?.icon}</span>
                <span className="flex-1">{team?.name}</span>
                <span className="text-zinc-300">{entry.avg_score} pts</span>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  return null;
}

function QRPantalla() {
  // Este componente solo se monta tras un toggle del master por el canal de
  // Realtime (qrVisible arranca en false), nunca en el render inicial ni en
  // el servidor, así que leer window aquí es seguro.
  const [origin] = useState(() => window.location.origin);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <p className="text-lg uppercase tracking-[0.3em] text-amber-400">Únete al juego</p>
      <h1 className="text-4xl font-black">Escanea el código para entrar</h1>
      <QRCodeImage value={origin} size={360} />
      <p className="font-mono text-2xl text-zinc-300">{origin}</p>
    </div>
  );
}

function MecanicaBanner({ mecanica }: { mecanica: NonNullable<GameStatePublico["prueba"]>["mecanica"] }) {
  const texto =
    mecanica === "portavoz_secreto"
      ? "🎭 Portavoz secreto en juego"
      : mecanica === "doble_aleatorio"
        ? "🎲 Doble aleatorio en juego"
        : mecanica === "apuesta_ciega"
          ? "💰 Apuestas ciegas en juego"
          : mecanica === "ruleta"
            ? "🎡 Ruleta en juego"
            : null;
  if (!texto) return null;
  return <p className="text-lg font-bold uppercase tracking-wide text-amber-400">{texto}</p>;
}

function RuletaPanel({
  ruleta,
  resumen,
}: {
  ruleta: GameStatePublico["ruleta"];
  resumen?: Record<string, { mayoria: boolean }>;
}) {
  if (!ruleta) return null;
  return (
    <div className="grid w-full max-w-5xl grid-cols-2 gap-5 sm:grid-cols-4">
      {TEAMS.map((t) => {
        const entrada = ruleta[t.id];
        if (!entrada) return null;
        const mayoria = resumen?.[t.id]?.mayoria;
        return (
          <div
            key={t.id}
            className="flex flex-col items-center gap-2 rounded-2xl border-2 px-4 py-5"
            style={{ borderColor: t.color, backgroundColor: `${t.color}1a` }}
          >
            <span className="text-sm font-bold uppercase tracking-wide" style={{ color: t.color }}>
              {t.icon} {t.name}
            </span>
            <p className="text-lg font-black" style={{ color: t.color }}>
              {entrada.representante.name}
            </p>
            <p className="text-sm font-bold text-zinc-100">
              {entrada.resultado.tipo === "convocatoria"
                ? "☠️ 4ª convocatoria"
                : `🎯 +${entrada.resultado.valor} pts`}
            </p>
            <p
              className={`text-xs font-semibold ${
                entrada.resultado.tipo === "convocatoria"
                  ? "text-red-400"
                  : mayoria
                    ? "text-green-400"
                    : "text-zinc-400"
              }`}
            >
              {entrada.resultado.tipo === "convocatoria"
                ? "Marcador a 0"
                : mayoria
                  ? "¡Mayoría acertó! Bote conseguido"
                  : "Mayoría falló, sin bote"}
            </p>
          </div>
        );
      })}
    </div>
  );
}

const REEL_CARD_WIDTH = 170;
const REEL_VIEW_WIDTH = 560;
const REEL_LANDING_MS = 2200;

function indexDeResultado(segmentos: RuletaResultado[], objetivo: RuletaResultado): number {
  const i = segmentos.findIndex((s) =>
    s.tipo === "convocatoria" && objetivo.tipo === "convocatoria"
      ? true
      : s.tipo === "puntos" && objetivo.tipo === "puntos" && s.valor === objetivo.valor
  );
  return i >= 0 ? i : 0;
}

// La tira muestra las casillas REALES de esta pregunta, girando en bucle
// continuo, hasta que llega la señal de "parar" (el equipo pasa a
// ruleta_parados) — entonces frena con una transición y aterriza EXACTO en
// la casilla que ya estaba decidida desde que se lanzó la prueba.
function RuletaReel({
  segmentos,
  objetivo,
  girando,
}: {
  segmentos: RuletaResultado[];
  objetivo: RuletaResultado;
  girando: boolean;
}) {
  const n = Math.max(1, segmentos.length);
  const vueltas = 6;
  const tira = Array.from({ length: vueltas }, () => segmentos).flat();
  const targetIndex = indexDeResultado(segmentos, objetivo);
  const offsetParado =
    (vueltas - 2) * n * REEL_CARD_WIDTH +
    targetIndex * REEL_CARD_WIDTH -
    (REEL_VIEW_WIDTH / 2 - REEL_CARD_WIDTH / 2);

  return (
    <div
      className="relative mx-auto overflow-hidden rounded-xl border-2 border-zinc-700 bg-zinc-900"
      style={{ width: REEL_VIEW_WIDTH, height: 88 }}
    >
      <div className="pointer-events-none absolute left-1/2 top-0 z-10 h-full w-1 -translate-x-1/2 bg-amber-400" />
      <div
        className="flex h-full"
        style={
          girando
            ? ({
                "--loop-width": `${n * REEL_CARD_WIDTH}px`,
                animation: `ruleta-spin ${Math.max(0.6, n * 0.35).toFixed(2)}s linear infinite`,
              } as React.CSSProperties)
            : {
                transform: `translateX(-${offsetParado}px)`,
                transition: `transform ${REEL_LANDING_MS}ms cubic-bezier(0.12,0.71,0.28,1)`,
              }
        }
      >
        {tira.map((seg, i) => (
          <div
            key={i}
            className="flex shrink-0 flex-col items-center justify-center gap-0.5 border-r border-zinc-700"
            style={{ width: REEL_CARD_WIDTH }}
          >
            <span className="text-xl">{seg.tipo === "convocatoria" ? "☠️" : "🎯"}</span>
            <span className="text-sm font-bold text-zinc-100">
              {seg.tipo === "convocatoria" ? "4ª convocatoria" : `+${seg.valor} pts`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RuletaTurnoCard({
  team,
  segmentos,
  entrada,
  enTurno,
  yaResuelto,
}: {
  team: { id: string; name: string; icon: string; color: string };
  segmentos: RuletaResultado[];
  entrada: { representante: { name: string }; resultado: RuletaResultado } | undefined;
  enTurno: boolean;
  yaResuelto: boolean;
}) {
  const [aterrizando, setAterrizando] = useState(false);
  const eraTurnoRef = useRef(false);

  useEffect(() => {
    if (eraTurnoRef.current && !enTurno && yaResuelto) {
      setAterrizando(true);
      const t = setTimeout(() => setAterrizando(false), REEL_LANDING_MS);
      eraTurnoRef.current = enTurno;
      return () => clearTimeout(t);
    }
    eraTurnoRef.current = enTurno;
  }, [enTurno, yaResuelto]);

  if (!entrada) return null;

  if (enTurno || aterrizando) {
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-2xl border-2 px-4 py-5"
        style={{ borderColor: team.color, backgroundColor: `${team.color}1a` }}
      >
        <span className="text-base font-bold uppercase tracking-wide" style={{ color: team.color }}>
          {team.icon} {team.name}
        </span>
        <p className="text-lg font-black text-zinc-100">{entrada.representante.name}</p>
        <RuletaReel segmentos={segmentos} objetivo={entrada.resultado} girando={enTurno} />
      </div>
    );
  }

  if (yaResuelto) {
    return (
      <div
        className="flex flex-col items-center gap-2 rounded-2xl border-2 px-4 py-5 opacity-90"
        style={{ borderColor: team.color, backgroundColor: `${team.color}1a` }}
      >
        <span className="text-sm font-bold uppercase tracking-wide" style={{ color: team.color }}>
          {team.icon} {team.name}
        </span>
        <p className="text-base font-black" style={{ color: team.color }}>
          {entrada.representante.name}
        </p>
        <p className="text-sm font-bold text-zinc-100">
          {entrada.resultado.tipo === "convocatoria"
            ? "☠️ 4ª convocatoria"
            : `🎯 +${entrada.resultado.valor} pts`}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-zinc-800 px-4 py-5 opacity-50">
      <span className="text-sm font-bold uppercase tracking-wide text-zinc-400">
        {team.icon} {team.name}
      </span>
      <p className="text-sm text-zinc-500">Esperando su turno...</p>
    </div>
  );
}

function RuletaCeremoniaPantalla({
  segmentos,
  ruleta,
  turno,
  parados,
}: {
  segmentos: RuletaResultado[];
  ruleta: GameStatePublico["ruleta"];
  turno: GameStatePublico["ruleta_turno"];
  parados: GameStatePublico["ruleta_parados"];
}) {
  if (!ruleta) return null;
  return (
    <div className="grid w-full max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2">
      {TEAMS.map((t) => {
        const entrada = ruleta[t.id];
        if (!entrada) return null;
        return (
          <RuletaTurnoCard
            key={t.id}
            team={t}
            segmentos={segmentos}
            entrada={entrada}
            enTurno={turno === t.id}
            yaResuelto={(parados ?? []).includes(t.id)}
          />
        );
      })}
    </div>
  );
}

function ElegidosBanner({
  mecanica,
  elegidos,
}: {
  mecanica: NonNullable<GameStatePublico["prueba"]>["mecanica"];
  elegidos: NonNullable<GameStatePublico["elegidos"]>;
}) {
  if (mecanica !== "portavoz_secreto" && mecanica !== "doble_aleatorio") return null;
  const titulo = mecanica === "portavoz_secreto" ? "Los portavoces eran..." : "Doblaron puntos...";
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-8 py-4 text-xl font-bold">
      <p className="text-amber-400">{titulo}</p>
      {Object.entries(elegidos).map(([teamId, info]) => {
        const team = TEAMS.find((t) => t.id === teamId);
        return (
          <p key={teamId} className="text-zinc-100">
            {team?.icon} {team?.name}: {info.name}
          </p>
        );
      })}
    </div>
  );
}

function SubastaResultado({ solucion }: { solucion: GameStatePublico["solucion"] }) {
  const subasta = solucion?.subasta as
    | { equipo: string; cantidad: number; premio: number; neto: number }
    | null
    | undefined;
  if (!subasta) {
    return <p className="text-2xl font-bold text-zinc-400">Nadie pujó, no hubo ganador.</p>;
  }
  const team = TEAMS.find((t) => t.id === subasta.equipo);
  return (
    <div className="rounded-2xl border-2 border-green-400 bg-green-400/10 px-10 py-6 text-3xl font-black text-green-300">
      Ganó {team?.icon} {team?.name} · pujó {subasta.cantidad} · premio {subasta.premio} · neto{" "}
      {subasta.neto >= 0 ? "+" : ""}
      {subasta.neto}
    </div>
  );
}

function PujasBar({
  pruebaId,
  revelado,
  pujasFinal,
}: {
  pruebaId: string;
  revelado: boolean;
  pujasFinal?: Record<string, number>;
}) {
  const [pujasEnVivo, setPujasEnVivo] = useState<Record<string, number>>({});

  useEffect(() => {
    if (revelado) return;
    let cancelado = false;
    const interval = setInterval(async () => {
      const actuales = await getPujasActuales(pruebaId);
      if (!cancelado) setPujasEnVivo(actuales);
    }, 1000);
    return () => {
      cancelado = true;
      clearInterval(interval);
    };
  }, [pruebaId, revelado]);

  const pujas = revelado ? (pujasFinal ?? {}) : pujasEnVivo;
  const max = Math.max(1, ...TEAMS.map((t) => pujas[t.id] ?? 0));

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      {TEAMS.map((t) => {
        const valor = pujas[t.id] ?? 0;
        return (
          <div key={t.id} className="flex items-center gap-4">
            <span className="w-40 shrink-0 text-left text-xl font-bold">
              {t.icon} {t.name}
            </span>
            <div className="h-8 flex-1 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${(valor / max) * 100}%`, backgroundColor: t.color }}
              />
            </div>
            <span className="w-16 text-right text-xl font-bold">{valor}</span>
          </div>
        );
      })}
    </div>
  );
}

function calcularMayorias(votos: { team_id: string; indice: number }[]): Record<string, number> {
  const porEquipo = new Map<string, Map<number, number>>();
  for (const v of votos) {
    const conteo = porEquipo.get(v.team_id) ?? new Map<number, number>();
    conteo.set(v.indice, (conteo.get(v.indice) ?? 0) + 1);
    porEquipo.set(v.team_id, conteo);
  }
  const resultado: Record<string, number> = {};
  for (const [teamId, conteo] of porEquipo) {
    resultado[teamId] = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }
  return resultado;
}

function VotacionPantalla({
  pruebaId,
  opciones,
  revelado,
  indiceCorrecto,
  mayoriaPorEquipo,
}: {
  pruebaId: string;
  opciones: string[];
  revelado: boolean;
  indiceCorrecto?: number;
  mayoriaPorEquipo?: Record<string, number>;
}) {
  const [votosEnVivo, setVotosEnVivo] = useState<{ team_id: string; indice: number }[]>([]);

  useEffect(() => {
    if (revelado) return;
    let cancelado = false;
    const interval = setInterval(async () => {
      const votos = await getVotosDetalle(pruebaId);
      if (!cancelado) setVotosEnVivo(votos);
    }, 1000);
    return () => {
      cancelado = true;
      clearInterval(interval);
    };
  }, [pruebaId, revelado]);

  const mayorias = revelado ? (mayoriaPorEquipo ?? {}) : calcularMayorias(votosEnVivo);

  return (
    <div className="flex w-full max-w-3xl flex-col gap-8">
      <div className="grid grid-cols-2 gap-6 text-2xl font-bold">
        {opciones.map((op, i) => {
          const isCorrect = revelado && indiceCorrecto === i;
          return (
            <div
              key={i}
              className={`rounded-2xl border-2 px-6 py-5 ${
                isCorrect
                  ? "border-green-400 bg-green-400/10 text-green-300"
                  : "border-zinc-700 text-zinc-100"
              }`}
            >
              {op}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {TEAMS.map((t) => {
          const mayoria = mayorias[t.id];
          if (mayoria === undefined) return null;
          const acerto = revelado && indiceCorrecto === mayoria;
          return (
            <span
              key={t.id}
              className={`rounded-full border px-4 py-2 text-lg font-bold ${
                acerto ? "border-green-400 text-green-300" : "border-zinc-600 text-zinc-200"
              }`}
            >
              {t.icon} {t.name}: {opciones[mayoria] ?? "?"}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function TiraAflojaBar({
  pruebaId,
  revelado,
  totalesFinal,
}: {
  pruebaId: string;
  revelado: boolean;
  totalesFinal?: Record<string, number>;
}) {
  const [totalesEnVivo, setTotalesEnVivo] = useState<Record<string, number>>({});

  useEffect(() => {
    if (revelado) return;
    let cancelado = false;
    const interval = setInterval(async () => {
      const actuales = await getTirafloneTotales(pruebaId);
      if (!cancelado) setTotalesEnVivo(actuales);
    }, 1000);
    return () => {
      cancelado = true;
      clearInterval(interval);
    };
  }, [pruebaId, revelado]);

  const totales = revelado ? (totalesFinal ?? {}) : totalesEnVivo;
  const max = Math.max(1, ...TEAMS.map((t) => totales[t.id] ?? 0));

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      {TEAMS.map((t) => {
        const valor = totales[t.id] ?? 0;
        return (
          <div key={t.id} className="flex items-center gap-4">
            <span className="w-40 shrink-0 text-left text-xl font-bold">
              {t.icon} {t.name}
            </span>
            <div className="h-8 flex-1 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${(valor / max) * 100}%`, backgroundColor: t.color }}
              />
            </div>
            <span className="w-16 text-right text-xl font-bold">{valor}</span>
          </div>
        );
      })}
    </div>
  );
}
