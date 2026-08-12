"use client";

import { useActionState, useState } from "react";
import { registerPlayer, type RegisterState } from "@/app/actions";
import { TEAMS } from "@/lib/teams";

const initialState: RegisterState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    registerPlayer,
    initialState
  );
  const [teamId, setTeamId] = useState<string | null>(null);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-5">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        Tu nombre
        <input
          name="name"
          type="text"
          placeholder="p.ej. Pixel"
          maxLength={20}
          required
          className="rounded-lg border border-zinc-300 px-3 py-2 text-base outline-none focus:border-zinc-900"
        />
      </label>

      <div className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        Tu equipo
        <input type="hidden" name="team_id" value={teamId ?? ""} />
        <div className="grid grid-cols-2 gap-2">
          {TEAMS.map((team) => (
            <button
              key={team.id}
              type="button"
              onClick={() => setTeamId(team.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium text-zinc-800 ${
                teamId === team.id
                  ? "border-zinc-900 ring-1 ring-zinc-900"
                  : "border-zinc-300 hover:border-zinc-900"
              }`}
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-base"
                style={{ backgroundColor: `${team.color}22` }}
              >
                {team.icon}
              </span>
              {team.name}
            </button>
          ))}
        </div>
      </div>

      {state.error && (
        <p className="text-sm font-medium text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending || !teamId}
        className="mt-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
