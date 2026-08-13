import { redirect } from "next/navigation";
import { isMaster } from "@/lib/master-session";
import { MasterLoginForm } from "@/components/master-login-form";

export default async function MasterLoginPage() {
  if (await isMaster()) {
    redirect("/master");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6">
      <h1 className="text-2xl font-bold text-zinc-900">Panel del master</h1>
      <MasterLoginForm />
    </div>
  );
}
