"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import debounce from "@/utils/debounce";
import { EXAMPLES } from "@/app/examples";
import type { MaskResult, PiiEntity } from "@/lib/types";

type Lib = typeof import("@/lib");

const TOTAL_LABELS = 47;

const CATEGORY_STYLES: { match: (label: string) => boolean; chip: string; bar: string; name: string; icon: string }[] = [
  {
    match: (l) => l.startsWith("PER_"),
    chip: "bg-amber-400/15 text-amber-300 ring-amber-400/30",
    bar: "bg-amber-400",
    name: "Names",
    icon: "👤",
  },
  {
    match: (l) =>
      l.includes("IDENTITY") ||
      l.includes("COORDINATION_NUMBER") ||
      l.includes("PASSPORT"),
    chip: "bg-red-400/15 text-red-300 ring-red-400/30",
    bar: "bg-red-400",
    name: "Identity numbers",
    icon: "🆔",
  },
  {
    match: (l) =>
      /CREDIT_CARD|IBAN|BIC|BANK|GIRO|VAT|CRYPTO/.test(l),
    chip: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30",
    bar: "bg-emerald-400",
    name: "Financial",
    icon: "💳",
  },
  {
    match: (l) => /EMAIL|PHONE|SOCIAL/.test(l),
    chip: "bg-sky-400/15 text-sky-300 ring-sky-400/30",
    bar: "bg-sky-400",
    name: "Contact",
    icon: "📞",
  },
  {
    match: (l) =>
      /STREET|POSTAL|MUNICIPALITY|COUNTY|CITY|PROPERTY|COORDINATE/.test(l),
    chip: "bg-violet-400/15 text-violet-300 ring-violet-400/30",
    bar: "bg-violet-400",
    name: "Location",
    icon: "📍",
  },
  {
    match: (l) => /WORK|EDUCATION|ORGANIZATION/.test(l),
    chip: "bg-teal-400/15 text-teal-300 ring-teal-400/30",
    bar: "bg-teal-400",
    name: "Work & education",
    icon: "🏢",
  },
  {
    match: (l) =>
      /MARITAL|GENETIC|DISABILITY|RELIGION|SEXUAL|DEMOGRAPHIC|POLITICAL|LABOR/.test(l),
    chip: "bg-rose-400/15 text-rose-300 ring-rose-400/30",
    bar: "bg-rose-400",
    name: "Sensitive attributes",
    icon: "🔒",
  },
  {
    match: () => true,
    chip: "bg-cyan-400/15 text-cyan-300 ring-cyan-400/30",
    bar: "bg-cyan-400",
    name: "Misc",
    icon: "🧩",
  },
];

const styleFor = (label: string) =>
  CATEGORY_STYLES.find((c) => c.match(label)) ?? CATEGORY_STYLES[7];

function MaskedOutput({
  result,
}: {
  result: MaskResult;
}) {
  const byId = useMemo(() => {
    const map = new Map<string, PiiEntity>();
    for (const entity of result.entities) map.set(entity.id, entity);
    return map;
  }, [result]);

  const parts = result.maskedText.split(/(<[A-Z_]+_\d+>)/g);
  return (
    <div className="whitespace-pre-wrap break-words leading-8 text-slate-300">
      {parts.map((part, i) => {
        const match = /^<([A-Z_]+_\d+)>$/.exec(part);
        if (!match) return <span key={i}>{part}</span>;
        const entity = byId.get(match[1]);
        const style = styleFor(match[1]);
        return (
          <span
            key={i}
            title={
              entity
                ? `${entity.value} — score ${(entity.score * 100).toFixed(0)}%`
                : match[1]
            }
            className={`mx-0.5 inline-block cursor-help rounded-md px-1.5 py-0.5 font-mono text-xs ring-1 ${style.chip}`}
          >
            {match[1]}
          </span>
        );
      })}
    </div>
  );
}

export default function Home() {
  const [lib, setLib] = useState<Lib | null>(null);
  const [inputText, setInputText] = useState(EXAMPLES[0].text);
  const [strict, setStrict] = useState(false);
  const [threshold, setThreshold] = useState(0.4);
  const [result, setResult] = useState<MaskResult | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // The detection engine bundles the SCB name lists (~2.5 MB), so it is
  // loaded lazily to keep the first paint instant.
  useEffect(() => {
    let cancelled = false;
    import("@/lib").then((m) => {
      if (!cancelled) setLib(m);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const runMask = useCallback(
    (text: string, options: { strict: boolean; scoreThreshold: number }) => {
      if (!lib) return;
      const started = performance.now();
      const masked = lib.maskPII(text, options);
      setElapsed(performance.now() - started);
      setResult(masked);
    },
    [lib]
  );

  const debouncedMask = useMemo(() => debounce(runMask, 150), [runMask]);

  useEffect(() => {
    if (!lib) return;
    debouncedMask(inputText, { strict, scoreThreshold: threshold });
  }, [lib, inputText, strict, threshold, debouncedMask]);

  const copyInstall = () => {
    navigator.clipboard?.writeText("npm install swedish-pii").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <main className="min-h-screen bg-[#070b16] text-slate-200 antialiased">
      {/* glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-[480px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(37,99,235,0.25)_0%,rgba(250,204,21,0.06)_55%,transparent_100%)]"
      />

      <div className="relative mx-auto max-w-6xl px-6 pb-24">
        {/* Hero */}
        <header className="pt-20 text-center">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/60 px-4 py-1.5 text-xs text-slate-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            307 tests · zero runtime dependencies · MIT
          </p>
          <h1 className="mx-auto max-w-3xl text-5xl font-bold tracking-tight text-white sm:text-6xl">
            Swedish PII{" "}
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-yellow-300 bg-clip-text text-transparent">
              detection &amp; masking
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Finds names, personnummer, addresses, financial and sensitive data
            in Swedish text — with checksum validation, confidence scores and
            exact offsets. Runs anywhere JavaScript runs.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={copyInstall}
              className="group inline-flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/80 px-5 py-3 font-mono text-sm text-slate-300 transition hover:border-slate-500"
            >
              <span className="text-yellow-300">$</span> npm install swedish-pii
              <span className="text-xs text-slate-500 group-hover:text-slate-300">
                {copied ? "✓ copied" : "⧉"}
              </span>
            </button>
            <a
              href="https://github.com/okasi/swedish-pii"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/40 transition hover:from-blue-400 hover:to-blue-500"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current" aria-hidden>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
              </svg>
              GitHub
            </a>
          </div>

          {/* stats */}
          <dl className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ["47", "PII labels"],
              ["151k+", "registered names"],
              ["22,350", "OSM streets"],
              ["~0.1 ms", "per detection"],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-5 backdrop-blur"
              >
                <dt className="text-2xl font-bold text-white">{value}</dt>
                <dd className="mt-1 text-xs uppercase tracking-wider text-slate-500">
                  {label}
                </dd>
              </div>
            ))}
          </dl>
        </header>

        {/* Playground */}
        <section className="mt-20">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-white">
                Live playground
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                {EXAMPLES.map((example) => (
                  <button
                    key={example.name}
                    onClick={() => setInputText(example.text)}
                    className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-300 transition hover:border-blue-400/60 hover:text-white"
                  >
                    {example.name}
                  </button>
                ))}
              </div>
            </div>

            {/* controls */}
            <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl border border-slate-800/80 bg-slate-950/40 px-5 py-4 text-sm">
              <label className="flex cursor-pointer select-none items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={strict}
                  onChange={(e) => setStrict(e.target.checked)}
                  className="h-4 w-4 accent-yellow-400"
                />
                <span className="text-slate-300">
                  Strict <span className="text-slate-500">(checksums must pass)</span>
                </span>
              </label>
              <label className="flex grow items-center gap-3 sm:max-w-md">
                <span className="whitespace-nowrap text-slate-300">
                  Score threshold{" "}
                  <span className="font-mono text-yellow-300">
                    {threshold.toFixed(2)}
                  </span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full accent-blue-400"
                />
              </label>
              {result && elapsed !== null && (
                <span className="ml-auto flex items-center gap-3 font-mono text-xs text-slate-500">
                  {result.entities.length > 0 && (
                    <span>
                      <span className="text-slate-300">
                        {result.entities.length}
                      </span>{" "}
                      entities ·{" "}
                      <span className="text-yellow-300">
                        {new Set(result.entities.map((e) => e.label)).size}/
                        {TOTAL_LABELS}
                      </span>{" "}
                      label types
                    </span>
                  )}
                  <span>masked in {elapsed < 1 ? "<1" : elapsed.toFixed(0)} ms</span>
                </span>
              )}
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Input
                </div>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  spellCheck={false}
                  className="h-64 w-full resize-none rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-[15px] leading-7 text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20"
                  placeholder="Skriv eller klistra in text…"
                />
              </div>
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Masked output
                </div>
                <div className="h-64 w-full overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-[15px]">
                  {!lib ? (
                    <div className="flex h-full items-center justify-center gap-3 text-sm text-slate-500">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-blue-400" />
                      Loading detection engine…
                    </div>
                  ) : result ? (
                    <MaskedOutput result={result} />
                  ) : null}
                </div>
              </div>
            </div>

            {/* entities */}
            {result && result.entities.length > 0 && (
              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Entity</th>
                      <th className="px-4 py-3 font-medium">Value</th>
                      <th className="px-4 py-3 font-medium">Offsets</th>
                      <th className="w-44 px-4 py-3 font-medium">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {result.entities.map((entity) => {
                      const style = styleFor(entity.label);
                      return (
                        <tr key={entity.id} className="bg-slate-900/30">
                          <td className="px-4 py-2.5">
                            <span
                              className={`inline-block rounded-md px-1.5 py-0.5 font-mono text-xs ring-1 ${style.chip}`}
                            >
                              {entity.id}
                            </span>
                          </td>
                          <td className="max-w-[16rem] truncate px-4 py-2.5 font-mono text-xs text-slate-300">
                            {entity.value}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                            {entity.start}–{entity.end}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-800">
                                <div
                                  className={`h-full rounded-full ${style.bar}`}
                                  style={{ width: `${entity.score * 100}%` }}
                                />
                              </div>
                              <span className="font-mono text-xs text-slate-400">
                                {(entity.score * 100).toFixed(0)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {result && result.entities.length === 0 && lib && (
              <p className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-5 py-4 text-sm text-emerald-300">
                ✓ No PII detected — clean prose passes through byte-for-byte
                untouched.
              </p>
            )}
          </div>
        </section>

        {/* Categories */}
        <section className="mt-20">
          <h2 className="text-center text-2xl font-bold text-white">
            What can be detected?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-slate-400">
            Every detector reports a confidence score — checksum-validated
            matches score 0.95, gazetteer hits 0.9, plain shapes 0.6.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["👤", "Names", "20,524 male + 23,347 female first names and 107,762 surnames from SCB, fuzzy-matched with Jaro–Winkler."],
              ["🆔", "Identity numbers", "Personnummer, samordningsnummer and passport numbers — with Luhn checksums and real calendar-date validation."],
              ["💳", "Financial", "Cards (Luhn), IBAN (mod-97), BIC, bank accounts, Bankgiro & Plusgiro, VAT numbers and crypto wallets."],
              ["📞", "Contact", "Email addresses, Swedish phone formats and social media handles & profile URLs."],
              ["📍", "Location", "22,350 OSM streets, postal codes, 290 municipalities, 21 counties, cities, GPS coordinates and property designations."],
              ["🏢", "Work & education", "Organizations, org numbers (Luhn), 414 professions and SUN education programs."],
              ["🔒", "Sensitive attributes", "Marital status, religion, disability, orientation, demographics, political ideology and union membership."],
              ["🧩", "Misc", "License plates, IPv4 & IPv6, MAC addresses, dates, times, case numbers and age."],
            ].map(([icon, title, body]) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 transition hover:border-slate-600"
              >
                <div className="text-2xl">{icon}</div>
                <h3 className="mt-3 font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Code */}
        <section className="mt-20">
          <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
            <div className="flex items-center gap-1.5 border-b border-slate-800 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-red-500/70" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
              <span className="h-3 w-3 rounded-full bg-green-500/70" />
              <span className="ml-3 font-mono text-xs text-slate-500">
                mask.ts
              </span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-sm leading-7 text-slate-300">
              <code>{`import { maskPII } from "swedish-pii";

const { maskedText, entities } = maskPII(
  "Anna Andersson bor på Storgatan 12."
);

// "<PER_FIRST_1> <PER_LAST_1> bor på <SE_STREET_ADDRESS_1>."
// entities → exact offsets + confidence scores

maskPII(text, { strict: true });          // checksums must pass
maskPII(text, { scoreThreshold: 0.2 });   // recall-first`}</code>
            </pre>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-24 border-t border-slate-800/70 pt-10 text-center text-sm text-slate-500">
          <p>
            MIT licensed ·{" "}
            <a
              href="https://github.com/okasi/swedish-pii"
              className="text-slate-300 underline decoration-slate-600 underline-offset-4 hover:text-white"
            >
              okasi/swedish-pii
            </a>{" "}
            · data from SCB, Skatteverket, Arbetsförmedlingen &amp;
            OpenStreetMap
          </p>
          <p className="mt-3 text-xs text-slate-600">
            Everything runs locally in your browser — the text never leaves
            this page.
          </p>
        </footer>
      </div>
    </main>
  );
}
