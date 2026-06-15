import { LoginForm } from "@/components/login-form";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
      {/* Custom Keyframes for the Wisest Marquee */}
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

      <div className="relative z-10 w-full max-w-4xl px-4 animate-fade-in">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          
          {/* Left Column: Biza photo, Title, and Running Slogan */}
          <div className="space-y-6">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-pitch-300">
                <span className="text-base">⚽</span> Էքսպերտների լիգա
              </div>
              <h1 className="font-display text-4xl font-black tracking-tight text-white md:text-5xl">
                World Cup <span className="text-pitch-400">2026</span>
              </h1>
              <p className="mt-2 text-sm text-navy-300">
                Մուտք գործեք՝ կանխատեսումները լրացնելու և աղյուսակում բարձրանալու համար։
              </p>
            </div>

            {/* The Wisest Photo & Slogan Block */}
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-navy-950/40 p-1.5 backdrop-blur-sm shadow-2xl">
              <div className="overflow-hidden rounded-xl border border-white/5">
                <img
                  src="/biza-marjan.png"
                  alt="Մի լսիր բիձուն, լսիր ինքդ քեզ"
                  className="w-full object-cover aspect-[21/10]"
                />
              </div>
              
              {/* Running Wise Line */}
              <div className="relative mt-2.5 overflow-hidden rounded-lg bg-black/40 py-2 border-y border-amber-500/20">
                <div className="whitespace-nowrap flex w-full">
                  <div className="animate-wise-marquee text-xs font-serif font-black tracking-widest uppercase italic bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-100 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]">
                    « Մի լսիր բիձուն, լսիր ինքդ քեզ 🙏 »
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Login Card */}
          <div className="w-full max-w-md mx-auto md:ml-auto md:mr-0">
            <Card className="p-7">
              <LoginForm />
            </Card>
          </div>

        </div>
      </div>
    </main>
  );
}
