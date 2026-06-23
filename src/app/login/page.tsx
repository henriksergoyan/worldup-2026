import { LoginForm } from "@/components/login-form";
import { LoginHumorGallery } from "@/components/login-humor-gallery";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
      <style>{`
        @keyframes wiseMarquee {
          0% { transform: translate3d(100%, 0, 0); }
          100% { transform: translate3d(-100%, 0, 0); }
        }
        .animate-wise-marquee {
          display: inline-block;
          animation: wiseMarquee 15s linear infinite;
        }
      `}</style>

      <div className="pitch-lines pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-pitch-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-72 w-72 rounded-full bg-emerald-600/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-4xl animate-fade-in px-4">
        <div className="grid gap-8 md:grid-cols-2 md:items-start">
          <div className="space-y-6">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-pitch-300">
                <span className="text-base">⚽</span> Էքսպերտների լիգա
              </div>
              <h1 className="font-display text-4xl font-black tracking-tight text-white md:text-5xl">
                World Cup <span className="text-pitch-400">2026</span>
              </h1>
              <p className="mt-2 text-sm text-navy-300">
                Մուտք գործեք՝ կանխատեսումները լրացնելու և մրցաշարային աղյուսակը գլխավորելու համար:
              </p>
            </div>

            <LoginHumorGallery />
          </div>

          <div className="mx-auto w-full max-w-md md:ml-auto md:mr-0 md:sticky md:top-8">
            <Card className="p-7">
              <LoginForm />
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
