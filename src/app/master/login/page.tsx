export default function MasterLoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6">
      <h1 className="text-2xl font-bold text-zinc-900">Panel del master</h1>

      <form className="flex w-full max-w-xs flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          PIN
          <input
            type="password"
            inputMode="numeric"
            placeholder="••••"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-center text-lg tracking-[0.5em] outline-none focus:border-zinc-900"
          />
        </label>
        <button
          type="submit"
          disabled
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          Entrar (pendiente de conectar)
        </button>
      </form>
    </div>
  );
}
