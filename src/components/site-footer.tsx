import Image from "next/image";
import Link from "next/link";

const COPA_URL = "https://copa.global/";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-navy-950/60 py-3 pb-safe">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2.5 gap-y-1 px-4 text-center text-xs leading-snug text-navy-300">
        <Link
          href={COPA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 opacity-90 transition hover:opacity-100"
          aria-label="COPA — copa.global"
        >
          <Image
            src="/copa-logo.png"
            alt="COPA"
            width={56}
            height={20}
            className="h-5 w-auto"
          />
        </Link>
        <span>
          Կայքը պատրաստվել է{" "}
          <Link
            href={COPA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-white underline decoration-white/30 underline-offset-2 transition hover:text-pitch-300 hover:decoration-pitch-400/50"
          >
            COPA
          </Link>{" "}
          ընկերության կողմից։
        </span>
        <span className="hidden text-navy-600 sm:inline" aria-hidden>
          ·
        </span>
        <span className="text-[11px] tracking-wide text-navy-500">օլ ռայթս ռեզերվըդ 2026</span>
      </div>
    </footer>
  );
}
