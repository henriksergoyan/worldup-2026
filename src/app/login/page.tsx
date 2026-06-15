import { LoginForm } from "@/components/login-form";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pitch-lines pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-pitch-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-72 w-72 rounded-full bg-emerald-600/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-pitch-300">
            <span className="text-base">⚽</span> Էքսպերտների լիգա
          </div>
          <h1 className="font-display text-4xl font-black tracking-tight text-white">
            World Cup <span className="text-pitch-400">2026</span>
          </h1>
          <p className="mt-2 text-sm text-navy-300">
            Մուտք գործեք՝ կանխատեսումները լրացնելու և աղյուսակում բարձրանալու համար։
          </p>
        </div>

        <Card className="p-7">
          <LoginForm />
        </Card>
      </div>
    </main>
  );
}
