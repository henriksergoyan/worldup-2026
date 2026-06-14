import { RegisterForm } from "@/components/register-form";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pitch-lines pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-pitch-300">
            <span className="text-base">⚽</span> Միացի՛ր լիգային
          </div>
          <h1 className="font-display text-3xl font-black tracking-tight text-white">
            Ստեղծի՛ր քո <span className="text-pitch-400">ակաունտը</span>
          </h1>
          <p className="mt-2 text-sm text-navy-300">Գուշակի՛ր հաշիվները, բարձրացի՛ր աղյուսակով ու հաղթի՛ր ընկերներիդ (ցույց տուր ով ա շեֆը 😉):</p>
        </div>
        <Card className="p-7">
          <RegisterForm />
        </Card>
        <p className="mt-4 text-center text-xs text-navy-500">
          <Link href="/login" className="text-navy-400 hover:text-navy-200">
            ← Հետ դեպի մուտքի էջ
          </Link>
        </p>
      </div>
    </main>
  );
}
