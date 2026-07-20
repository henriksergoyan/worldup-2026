import { RegisterForm } from "@/components/register-form";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="relative flex flex-1 flex-col justify-center overflow-hidden px-4 py-10 sm:py-14">
      <div className="pitch-lines pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute -left-24 top-1/3 h-64 w-64 rounded-full bg-pitch-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-1/4 h-64 w-64 rounded-full bg-emerald-600/10 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-pitch-300">
            <span className="text-base">⚽</span> Էքսպերտների լիգա
          </div>
          <h1 className="font-display text-3xl font-black tracking-tight text-white md:text-4xl">
            Ստեղծել <span className="text-pitch-400">հաշիվ</span>
          </h1>
          <p className="mt-3 text-sm text-navy-300">
            Կատարեք ճշգրիտ կանխատեսումներ, բարձրացեք մրցաշարային աղյուսակով և հաղթեք ձեր ընկերներին:
          </p>
        </div>
        <Card className="p-6 sm:p-8">
          <RegisterForm />
        </Card>
        <p className="mt-5 text-center text-xs text-navy-500">
          <Link href="/login" className="text-navy-400 transition hover:text-navy-200">
            ← Մուտքի էջ
          </Link>
        </p>
      </div>
    </main>
  );
}
