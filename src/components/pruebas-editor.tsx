"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  actualizarPrueba,
  actualizarOrden,
  borrarPrueba,
  type PruebaCampos,
} from "@/app/master/pruebas-actions";
import { TEAMS } from "@/lib/teams";
import type { Dificultad, Mecanica, PruebaTipo, TeamId } from "@/lib/supabase/types";

type Prueba = PruebaCampos & { id: string; orden: number };

const TIPOS: PruebaTipo[] = [
  "quiz",
  "true_false",
  "slider",
  "votacion",
  "tira_afloja",
  "subasta",
];
const DIFICULTADES: Dificultad[] = ["facil", "media", "dificil"];

export function PruebasEditor({ pruebasIniciales }: { pruebasIniciales: Prueba[] }) {
  const [pruebas, setPruebas] = useState(pruebasIniciales);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setPruebas((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const nuevo = arrayMove(items, oldIndex, newIndex).map((p, i) => ({
        ...p,
        orden: i + 1,
      }));
      actualizarOrden(nuevo.map((p) => p.id));
      return nuevo;
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-4 bg-zinc-50 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Editar preguntas</h1>
        <Link href="/master" className="text-sm font-medium text-zinc-600 underline">
          Volver al control
        </Link>
      </div>
      <p className="text-sm text-zinc-500">
        Arrastra del icono ⠿ para reordenar. Haz clic en una pregunta para editarla.
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={pruebas.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {pruebas.map((prueba) => (
              <PruebaRow
                key={prueba.id}
                prueba={prueba}
                editando={editandoId === prueba.id}
                onToggleEditar={() =>
                  setEditandoId((prev) => (prev === prueba.id ? null : prueba.id))
                }
                onGuardado={(actualizada) => {
                  setPruebas((prev) =>
                    prev.map((p) => (p.id === actualizada.id ? actualizada : p))
                  );
                  setEditandoId(null);
                }}
                onBorrado={() => {
                  setPruebas((prev) => prev.filter((p) => p.id !== prueba.id));
                  setEditandoId(null);
                }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function PruebaRow({
  prueba,
  editando,
  onToggleEditar,
  onGuardado,
  onBorrado,
}: {
  prueba: Prueba;
  editando: boolean;
  onToggleEditar: () => void;
  onGuardado: (p: Prueba) => void;
  onBorrado: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: prueba.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const equipo = TEAMS.find((t) => t.id === prueba.equipo_referido);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-white ${editando ? "border-zinc-900" : "border-zinc-200"}`}
    >
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab touch-none px-1 text-lg text-zinc-400"
          aria-label="Arrastrar para reordenar"
        >
          ⠿
        </button>
        <button type="button" onClick={onToggleEditar} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-medium text-zinc-900">
            #{prueba.orden} · {prueba.tipo} · {prueba.dificultad}
            {equipo ? ` · ${equipo.icon} ${equipo.name}` : ""}
          </p>
          <p className="truncate text-xs text-zinc-500">{prueba.enunciado}</p>
        </button>
      </div>
      {editando && <PruebaForm prueba={prueba} onGuardado={onGuardado} onBorrado={onBorrado} />}
    </div>
  );
}

function configPorDefecto(tipo: PruebaTipo): Record<string, unknown> {
  if (tipo === "quiz" || tipo === "votacion") return { opciones: ["", ""] };
  if (tipo === "slider") return { min: 0, max: 100 };
  return {};
}

function solucionPorDefecto(tipo: PruebaTipo): Record<string, unknown> {
  if (tipo === "quiz" || tipo === "votacion") return { indice_correcto: 0 };
  if (tipo === "true_false") return { correcto: true };
  if (tipo === "slider") return { objetivo: 50 };
  return {};
}

function PruebaForm({
  prueba,
  onGuardado,
  onBorrado,
}: {
  prueba: Prueba;
  onGuardado: (p: Prueba) => void;
  onBorrado: () => void;
}) {
  const [campos, setCampos] = useState<PruebaCampos>({
    tipo: prueba.tipo,
    equipo_referido: prueba.equipo_referido,
    dificultad: prueba.dificultad,
    mecanica: prueba.mecanica,
    enunciado: prueba.enunciado,
    config: prueba.config,
    solucion: prueba.solucion,
    puntos_base: prueba.puntos_base,
    duracion_segundos: prueba.duracion_segundos,
  });
  const [pending, startTransition] = useTransition();
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);

  function cambiarTipo(tipo: PruebaTipo) {
    setCampos((c) => ({
      ...c,
      tipo,
      config: configPorDefecto(tipo),
      solucion: solucionPorDefecto(tipo),
    }));
  }

  function guardar() {
    startTransition(async () => {
      await actualizarPrueba(prueba.id, campos);
      onGuardado({ ...prueba, ...campos });
    });
  }

  return (
    <div className="flex flex-col gap-3 border-t border-zinc-200 p-3">
      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
        Enunciado
        <textarea
          value={campos.enunciado}
          onChange={(e) => setCampos((c) => ({ ...c, enunciado: e.target.value }))}
          rows={2}
          className="rounded-lg border border-zinc-300 p-2 text-sm text-zinc-900"
        />
      </label>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          Tipo
          <select
            value={campos.tipo}
            onChange={(e) => cambiarTipo(e.target.value as PruebaTipo)}
            className="rounded-lg border border-zinc-300 p-2 text-sm text-zinc-900"
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          Dificultad
          <select
            value={campos.dificultad}
            onChange={(e) =>
              setCampos((c) => ({ ...c, dificultad: e.target.value as Dificultad }))
            }
            className="rounded-lg border border-zinc-300 p-2 text-sm text-zinc-900"
          >
            {DIFICULTADES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          Equipo
          <select
            value={campos.equipo_referido ?? ""}
            onChange={(e) =>
              setCampos((c) => ({
                ...c,
                equipo_referido: (e.target.value || null) as TeamId | null,
              }))
            }
            className="rounded-lg border border-zinc-300 p-2 text-sm text-zinc-900"
          >
            <option value="">General</option>
            {TEAMS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          Mecánica
          <select
            value={campos.mecanica ?? ""}
            onChange={(e) =>
              setCampos((c) => ({
                ...c,
                mecanica: (e.target.value || null) as Mecanica | null,
              }))
            }
            className="rounded-lg border border-zinc-300 p-2 text-sm text-zinc-900"
          >
            <option value="">Ninguna</option>
            <option value="portavoz_secreto">Portavoz secreto</option>
            <option value="doble_aleatorio">Doble aleatorio</option>
            <option value="apuesta_ciega">Doble o nada</option>
          </select>
        </label>
      </div>

      <TipoEspecifico campos={campos} setCampos={setCampos} />

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          {campos.tipo === "subasta" ? "Premio" : "Puntos base"}
          <input
            type="number"
            value={campos.puntos_base}
            onChange={(e) =>
              setCampos((c) => ({ ...c, puntos_base: Number(e.target.value) }))
            }
            className="rounded-lg border border-zinc-300 p-2 text-sm text-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          Duración (segundos)
          <input
            type="number"
            value={campos.duracion_segundos}
            onChange={(e) =>
              setCampos((c) => ({ ...c, duracion_segundos: Number(e.target.value) }))
            }
            className="rounded-lg border border-zinc-300 p-2 text-sm text-zinc-900"
          />
        </label>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirmandoBorrado) {
              setConfirmandoBorrado(true);
              setTimeout(() => setConfirmandoBorrado(false), 4000);
              return;
            }
            startTransition(async () => {
              await borrarPrueba(prueba.id);
              onBorrado();
            });
          }}
          className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-30"
        >
          {confirmandoBorrado ? "¿Seguro? Pulsa otra vez" : "Borrar pregunta"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={guardar}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-30"
        >
          {pending ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}

function TipoEspecifico({
  campos,
  setCampos,
}: {
  campos: PruebaCampos;
  setCampos: React.Dispatch<React.SetStateAction<PruebaCampos>>;
}) {
  if (campos.tipo === "quiz" || campos.tipo === "votacion") {
    const opciones = (campos.config.opciones as string[] | undefined) ?? [];
    const indiceCorrecto = (campos.solucion.indice_correcto as number | undefined) ?? 0;
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-zinc-600">Opciones (marca la correcta)</p>
        {opciones.map((op, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              checked={indiceCorrecto === i}
              onChange={() =>
                setCampos((c) => ({ ...c, solucion: { indice_correcto: i } }))
              }
            />
            <input
              type="text"
              value={op}
              onChange={(e) => {
                const nuevas = [...opciones];
                nuevas[i] = e.target.value;
                setCampos((c) => ({ ...c, config: { ...c.config, opciones: nuevas } }));
              }}
              className="flex-1 rounded-lg border border-zinc-300 p-2 text-sm text-zinc-900"
            />
            <button
              type="button"
              onClick={() => {
                const nuevas = opciones.filter((_, idx) => idx !== i);
                const nuevoIndice =
                  indiceCorrecto >= nuevas.length
                    ? 0
                    : indiceCorrecto > i
                      ? indiceCorrecto - 1
                      : indiceCorrecto;
                setCampos((c) => ({
                  ...c,
                  config: { ...c.config, opciones: nuevas },
                  solucion: { indice_correcto: nuevoIndice },
                }));
              }}
              className="text-xs text-red-600"
            >
              Quitar
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setCampos((c) => ({
              ...c,
              config: { ...c.config, opciones: [...opciones, ""] },
            }))
          }
          className="self-start text-xs font-medium text-zinc-600 underline"
        >
          + Añadir opción
        </button>
      </div>
    );
  }

  if (campos.tipo === "true_false") {
    const correcto = campos.solucion.correcto as boolean | undefined;
    return (
      <div className="flex gap-4">
        <label className="flex items-center gap-1.5 text-sm text-zinc-800">
          <input
            type="radio"
            checked={correcto === true}
            onChange={() => setCampos((c) => ({ ...c, solucion: { correcto: true } }))}
          />
          Verdadero
        </label>
        <label className="flex items-center gap-1.5 text-sm text-zinc-800">
          <input
            type="radio"
            checked={correcto === false}
            onChange={() => setCampos((c) => ({ ...c, solucion: { correcto: false } }))}
          />
          Falso
        </label>
      </div>
    );
  }

  if (campos.tipo === "slider") {
    const min = Number(campos.config.min ?? 0);
    const max = Number(campos.config.max ?? 100);
    const objetivo = Number(campos.solucion.objetivo ?? 0);
    return (
      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          Mínimo
          <input
            type="number"
            value={min}
            onChange={(e) =>
              setCampos((c) => ({
                ...c,
                config: { ...c.config, min: Number(e.target.value) },
              }))
            }
            className="rounded-lg border border-zinc-300 p-2 text-sm text-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          Máximo
          <input
            type="number"
            value={max}
            onChange={(e) =>
              setCampos((c) => ({
                ...c,
                config: { ...c.config, max: Number(e.target.value) },
              }))
            }
            className="rounded-lg border border-zinc-300 p-2 text-sm text-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          Respuesta correcta
          <input
            type="number"
            value={objetivo}
            onChange={(e) =>
              setCampos((c) => ({ ...c, solucion: { objetivo: Number(e.target.value) } }))
            }
            className="rounded-lg border border-zinc-300 p-2 text-sm text-zinc-900"
          />
        </label>
      </div>
    );
  }

  return (
    <p className="text-xs text-zinc-500">
      Este tipo no necesita opciones ni respuesta correcta.
    </p>
  );
}
