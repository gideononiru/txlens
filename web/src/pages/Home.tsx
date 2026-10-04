import { useMemo } from "react";
import { Networks } from "@stellar/stellar-sdk";
import { explain, riskLevel } from "../../../src/explain";
import { SAMPLES } from "../samples";

const SAMPLE = SAMPLES[0];
import { Link, useTitle } from "../lib/router";

export function Home() {
  useTitle("txlens · explain Stellar transactions before you sign");
  const report = useMemo(() => {
    try {
      const e = explain(SAMPLE.xdr, { networkPassphrase: Networks.TESTNET });
      return { e, risk: riskLevel(e) };
    } catch {
      return null;
    }
  }, []);
  const STATS: [string, string][] = [
    ["Runs in", "browser"],
    ["CLI on danger", "exit 2"],
    ["Uploads", "none"],
  ];
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 md:grid-cols-[1.2fr_1fr] md:pt-20">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-phos">Stellar transaction explainer</p>
          <h1 className="mt-4 text-5xl leading-[1.03] md:text-6xl font-bold tracking-tight text-chalk">Read the transaction <span className="text-phos">before</span> you sign it.</h1>
          <p className="mt-6 max-w-xl text-lg text-phos-dim">Paste a base64 XDR or a transaction hash. txlens spells out every operation in plain English and flags the ones that drain wallets, like signer swaps, account merges and surprise fee bumps.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/app" className="run inline-block">Explain a transaction →</Link>
            <Link to="/docs" className="chipb inline-block px-4 py-2 text-sm">How it works</Link>
          </div>
          <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6">
            {STATS.map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px] uppercase tracking-wider text-phos-dim">{label}</dt>
                <dd className="mt-1 text-2xl font-bold tracking-tight text-chalk">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="pane p-7">
          <p className="font-mono text-xs text-phos-dim">$ txlens sample.xdr  # {SAMPLE.name}</p>
          {report ? (
            <div className="mt-4 space-y-4 font-mono text-xs">
              <p>
                <span className="text-phos-dim">risk: </span>
                <span className={`rounded px-2 py-0.5 font-bold uppercase ${report.risk === "danger" ? "bg-blood text-term" : report.risk === "warning" ? "bg-amber text-term" : "bg-phos/20 text-phos"}`}>
                  {report.risk}
                </span>
              </p>
              <ol className="space-y-1.5 text-chalk">
                {report.e.operations.map((op, i) => (
                  <li key={i}>
                    <span className="text-phos-dim">{i + 1}.</span> {op}
                  </li>
                ))}
              </ol>
              <div className="space-y-1.5">
                {report.e.findings.map((f, i) => (
                  <p key={i} className={f.severity === "danger" ? "text-blood" : f.severity === "warning" ? "text-amber" : "text-sky"}>
                    ▲ {f.message}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-4 font-mono text-xs text-blood">sample failed to decode</p>
          )}
        </div>
      </section>

      <section className="border-y border-rim bg-pane/60">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-phos">How it works</p>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-chalk">Paste. Read. Decide.</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="pane p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold bg-phos text-term">{i + 1}</span>
                <h3 className="mt-4 text-xl font-bold tracking-tight text-chalk">{title}</h3>
                <p className="mt-2 text-sm text-phos-dim">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-phos">Use cases</p>
        <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-chalk">For anyone who signs things</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {USES.map(([icon, title, body]) => (
            <div key={title} className="pane p-6">
              <span className="text-3xl">{icon}</span>
              <h3 className="mt-3 text-lg font-bold tracking-tight text-chalk">{title}</h3>
              <p className="mt-2 text-sm text-phos-dim">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-phos">Guarantees</p>
        <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-chalk">Built to be trusted</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PROMISES.map(([title, body]) => (
            <div key={title} className="rounded-2xl p-7 border border-phos/30 bg-phos/5 text-chalk">
              <h3 className="text-xl font-bold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm text-phos-dim">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pt-20">
        <div className="pane flex flex-col items-start justify-between gap-6 p-10 md:flex-row md:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-chalk">Got an XDR you’re unsure about?</h2>
            <p className="mt-2 text-phos-dim">Paste it and get a plain-English answer in a second.</p>
          </div>
          <Link to="/app" className="run inline-block shrink-0">Explain a transaction →</Link>
        </div>
      </section>
    </>
  );
}

const STEPS: [string, string][] = [
  [
    "Paste XDR or a hash",
    "Copy the envelope from a dApp or a wallet’s advanced view, or fetch any submitted transaction by hash."
  ],
  [
    "Get a plain-English report",
    "Each operation is described with amounts, assets and accounts, plus fee, memo, time bounds and signatures."
  ],
  [
    "See the red flags",
    "Findings are graded info, warning or danger, so a malicious setOptions or merge stands out at once."
  ]
];

const USES: [string, string, string][] = [
  [
    "🛡️",
    "Wallet users",
    "Check what a dApp is really asking for before you approve it."
  ],
  [
    "🧑‍💻",
    "Developers",
    "Debug the envelopes your app builds, in the terminal or the browser."
  ],
  [
    "🏦",
    "Treasury ops",
    "Review multisig transactions before adding your signature."
  ],
  [
    "⚙️",
    "CI pipelines",
    "Fail a build when a generated transaction contains a danger finding."
  ]
];

const PROMISES: [string, string][] = [
  [
    "Local only",
    "XDR is decoded in your browser. Nothing is uploaded, apart from an optional Horizon lookup by hash."
  ],
  [
    "One engine everywhere",
    "The web app, the CLI and the npm library share one explain() implementation."
  ],
  [
    "Opinionated findings",
    "Signer changes, threshold changes, merges and authorization changes are always called out."
  ]
];
