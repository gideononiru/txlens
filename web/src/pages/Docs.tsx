import { Link, useTitle } from "../lib/router";

const SECTIONS = [
  ["start", "Getting started"],
  ["concepts", "Concepts"],
  ["reference", "Library & CLI"],
  ["faq", "FAQ"],
] as const;

export function Docs() {
  useTitle("Docs · txlens");
  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-5 py-14 lg:grid-cols-[210px_1fr]">
      <aside className="hidden lg:block">
        <nav className="sticky top-24 space-y-1 text-sm">
          <p className="mb-3 px-3 font-mono text-xs uppercase tracking-[0.2em] text-phos">On this page</p>
          {SECTIONS.map(([id, label]) => (
            <a
              key={id}
              href="#/docs"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
              }}
              className="block rounded-lg px-3 py-2 text-phos-dim hover:text-phos"
            >
              {label}
            </a>
          ))}
        </nav>
      </aside>

      <article className="min-w-0 space-y-16">
        <header>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-phos">Documentation</p>
          <h1 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight text-chalk">Using txlens</h1>
          <p className="mt-4 max-w-2xl text-lg text-phos-dim">A library, CLI and web app that decode Stellar transaction envelopes into plain English, with risk findings.</p>
        </header>

        <section id="start" className="scroll-mt-24 space-y-5">
          <h2 className="text-3xl font-bold tracking-tight text-chalk">Getting started</h2>
          <ol className="space-y-3">
            {START.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold bg-phos text-term">{i + 1}</span>
                <p className="pt-0.5 text-chalk/90">{step}</p>
              </li>
            ))}
          </ol>
          <Link to="/app" className="run inline-block inline-block">Explain a transaction →</Link>
        </section>

        <section id="concepts" className="scroll-mt-24 space-y-5">
          <h2 className="text-3xl font-bold tracking-tight text-chalk">Concepts</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {CONCEPTS.map(([term, body]) => (
              <div key={term} className="pane p-5">
                <h3 className="text-lg font-bold tracking-tight text-chalk">{term}</h3>
                <p className="mt-1.5 text-sm text-phos-dim">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="reference" className="scroll-mt-24 space-y-5">
          <h2 className="text-3xl font-bold tracking-tight text-chalk">Library & CLI</h2>
          <p className="text-phos-dim">Use the CLI in scripts and CI, or the library in your own app:</p>
          <pre className="overflow-x-auto p-5 font-mono text-xs leading-relaxed pane text-phos">{`npx txlens <base64-xdr>                    # mainnet passphrase by default
npx txlens <base64-xdr> --testnet
npx txlens <base64-xdr> --network "My Network ; 2026"
echo <base64-xdr> | npx txlens --json      # machine-readable

# exit codes: 0 ok · 1 invalid input · 2 contains a danger finding`}</pre>
          <div className="pane overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-rim text-xs uppercase tracking-wider text-phos-dim">
                <tr>
                  <th className="p-3.5">Export</th>
                  <th className="p-3.5">Returns</th>
                  <th className="p-3.5">What it does</th>
                </tr>
              </thead>
              <tbody>
                {REFERENCE.map(([fn, who, what]) => (
                  <tr key={fn} className="border-t border-rim">
                    <td className="p-3.5 font-mono text-xs text-chalk">{fn}</td>
                    <td className="p-3.5 text-phos-dim">{who}</td>
                    <td className="p-3.5 text-phos-dim">{what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 space-y-3">
          <h2 className="text-3xl font-bold tracking-tight text-chalk">FAQ</h2>
          {FAQ.map(([q, a]) => (
            <details key={q} className="pane group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-chalk">
                {q}
                <span className="transition group-open:rotate-45 text-phos">+</span>
              </summary>
              <p className="mt-3 text-sm text-phos-dim">{a}</p>
            </details>
          ))}
        </section>
      </article>
    </div>
  );
}

const START: string[] = [
  "Open the app. A sample transaction is already loaded so you can see a report straight away.",
  "Paste a base64 transaction envelope, or paste a transaction hash and fetch it from Horizon.",
  "Pick the network the transaction is meant for; the passphrase changes what gets signed.",
  "Read the report: operations in order, then findings. Anything marked danger deserves a second look."
];

const CONCEPTS: [string, string][] = [
  [
    "Envelope XDR",
    "The base64 encoding of a transaction and its signatures: what wallets and dApps pass around."
  ],
  [
    "Findings",
    "Notes about the transaction or one operation, graded info, warning or danger."
  ],
  [
    "Fee bump",
    "A wrapper that lets another account pay the fee. txlens shows the inner transaction and the fee source."
  ],
  [
    "Time bounds",
    "When the transaction is valid. Missing or far-off bounds are flagged because it could be submitted much later."
  ]
];

const REFERENCE: [string, string, string][] = [
  [
    "explain(envelope, { networkPassphrase, now })",
    "Explanation",
    "Source, fee, memo, validity, signatures, operations and findings"
  ],
  [
    "riskLevel(explanation)",
    "none · info · warning · danger",
    "The highest finding severity"
  ],
  [
    "formatExplanation(explanation)",
    "string",
    "The human-readable report the CLI prints"
  ],
  [
    "stroopsToXlm(stroops)",
    "string",
    "Formats a stroop amount as XLM"
  ]
];

const FAQ: [string, string][] = [
  [
    "Does txlens send my transaction anywhere?",
    "No. Decoding happens in your browser. Only “fetch by hash” calls Horizon."
  ],
  [
    "Can it tell me a transaction is safe?",
    "It tells you what it does and flags known risky patterns. Whether it’s safe depends on whether you meant it."
  ],
  [
    "Why does the network matter?",
    "The network passphrase is part of what gets signed, so the same XDR means different things on testnet and mainnet."
  ],
  [
    "Can I use it in CI?",
    "Yes. The CLI exits with code 2 whenever a finding is graded danger."
  ],
  [
    "What counts as dangerous?",
    "Operations that hand over control or empty an account: adding signers, changing thresholds, merging and similar."
  ],
  [
    "Is it open source?",
    "Yes, MIT licensed. The rules live in src/explain.ts."
  ]
];
