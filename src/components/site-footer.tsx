import Image from "next/image";
import Link from "next/link";

const COPA_URL = "https://copa.global/";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-navy-950/60 py-6 pb-safe">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-center">
        <Link
          href={COPA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-90 transition hover:opacity-100"
          aria-label="COPA — copa.global"
        >
          <Image
            src="/copa-logo.png"
            alt="COPA"
            width={72}
            height={28}
            className="h-7 w-auto"
          />
        </Link>
        <p className="max-w-md text-xs leading-relaxed text-navy-300">
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
        </p>
        <p className="text-[11px] tracking-wide text-navy-500">օլ ռայթս ռեզերվըդ 2026</p>
      </div>
    </footer>
  );
}
