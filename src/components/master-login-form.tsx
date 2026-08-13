"use client";

import { useActionState } from "react";
import { masterLogin, type MasterLoginState } from "@/app/master/actions";

const initialState: MasterLoginState = {};

export function MasterLoginForm() {
  const [state, formAction, pending] = useActionState(masterLogin, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-xs flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        PIN
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          placeholder="••••"
          required
          className="rounded-lg border border-zinc-300 px-3 py-2 text-center text-lg tracking-[0.5em] outline-none focus:border-zinc-900"
        />
      </label>

      {state.error && (
        <p className="text-sm font-medium text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
