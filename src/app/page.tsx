import { redirect } from "next/navigation";
import { getAuthenticatedPlayer } from "@/lib/session";
import { LoginForm } from "@/components/login-form";

export default async function Home() {
  const player = await getAuthenticatedPlayer();
  if (player) {
    redirect("/juego");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-zinc-50 px-6 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          Únete al juego
        </h1>
        <p className="mt-2 text-zinc-500">
          Elige tu nombre y tu equipo para empezar
        </p>
      </div>

      <LoginForm />
    </div>
  );
}
