import { useMemo, useState } from "react";
import { Networks } from "@stellar/stellar-sdk";
import { explain, riskLevel, type Explanation, type Severity } from "../../src/explain";
import { SAMPLES } from "./samples";

const NETWORKS = {
  testnet: { label: "Testnet", passphrase: Networks.TESTNET, horizon: "https://horizon-testnet.stellar.org" },
  public: { label: "Mainnet", passphrase: Networks.PUBLIC, horizon: "https://horizon.stellar.org" },
} as const;
type Net = keyof typeof NETWORKS;

const SEV: Record<Severity, { icon: string; cls: string }> = {
  danger: { icon: "⛔", cls: "border-blood/50 bg-blood/10 text-blood" },
  warning: { icon: "⚠", cls: "border-amber/50 bg-amber/10 text-amber" },
  info: { icon: "ℹ", cls: "border-sky/40 bg-sky/10 text-sky" },
};

export default function App() {
  const [net, setNet] = useState<Net>("testnet");
  const [input, setInput] = useState(SAMPLES[0].xdr);
  const [hash, setHash] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [view, setView] = useState<"report" | "json">("report");

  const result = useMemo((): { e?: Explanation; error?: string } => {
    if (!input.trim()) return {};
    try {
      return { e: explain(input.trim(), { networkPassphrase: NETWORKS[net].passphrase }) };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }, [input, net]);

  async function fetchByHash() {
    setFetching(true);
    setFetchErr(null);
    try {
      const res = await fetch(`${NETWORKS[net].horizon}/transactions/${hash.trim()}`);
      if (!res.ok) throw new Error(res.status === 404 ? `Not found on ${NETWORKS[net].label}.` : `Horizon returned ${res.status}.`);
      setInput(((await res.json()) as { envelope_xdr: string }).envelope_xdr);
    } catch (e) {
      setFetchErr(e instanceof Error ? e.message : String(e));
    } finally {
      setFetching(false);
    }
  }

  const risk = result.e ? riskLevel(result.e) : null;

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} className="h-8 w-8" alt="" />
          <span className="font-mono text-lg font-bold text-phos">txlens</span>
        </div>
        <div className="flex rounded-lg border border-rim p-1 font-mono text-xs">
          {(Object.keys(NETWORKS) as Net[]).map((n) => (
            <button key={n} onClick={() => setNet(n)} className={`rounded-md px-3 py-1.5 ${net === n ? "bg-phos text-term" : "text-phos-dim"}`}>
              {NETWORKS[n].label}
            </button>
          ))}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-6 pt-4">
        <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
          Read the transaction <span className="text-phos">before</span> you sign it.
        </h1>
        <p className="mt-3 max-w-2xl text-phos-dim">
          Paste a base64 XDR or a transaction hash. txlens explains every operation in plain English and flags the
          ones that drain wallets. Everything runs in your browser.
        </p>
      </section>

      <main className="mx-auto grid max-w-6xl gap-5 px-5 pb-16 lg:grid-cols-[1fr_1.1fr]">
        <section className="space-y-4">
          <div className="pane p-4">
            <p className="mb-2 font-mono text-xs text-phos-dim">$ paste envelope XDR</p>
            <textarea className="prompt h-48 break-all" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
            <div className="mt-3 flex flex-wrap gap-2">
              {SAMPLES.map((s) => (
                <button key={s.name} className="chipb" onClick={() => setInput(s.xdr)}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          <div className="pane p-4">
            <p className="mb-2 font-mono text-xs text-phos-dim">$ or fetch a submitted transaction</p>
            <div className="flex gap-2">
              <input className="prompt" placeholder="transaction hash (64 hex chars)" value={hash} onChange={(e) => setHash(e.target.value)} />
              <button className="run shrink-0" disabled={fetching || !/^[0-9a-f]{64}$/i.test(hash.trim())} onClick={fetchByHash}>
                {fetching ? "…" : "fetch"}
              </button>
            </div>
            {fetchErr && <p className="mt-2 font-mono text-xs text-blood">{fetchErr}</p>}
          </div>
        </section>

        <section className="pane overflow-hidden">
          <div className="flex items-center justify-between border-b border-rim px-4 py-3">
            <div className="flex gap-3 font-mono text-xs">
              {(["report", "json"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={view === v ? "text-phos" : "text-phos-dim"}>
                  {v}
                </button>
              ))}
            </div>
            {risk && (
              <span
                className={`rounded-full px-3 py-1 font-mono text-xs font-bold uppercase ${
                  risk === "danger" ? "bg-blood text-term" : risk === "warning" ? "bg-amber text-term" : "bg-phos/20 text-phos"
                }`}
              >
                {risk === "none" ? "no issues found" : `${risk}`}
              </span>
            )}
          </div>
          <div className="p-5">
            {result.error && <p className="font-mono text-sm text-blood">✗ {result.error}</p>}
            {!result.e && !result.error && <p className="font-mono text-sm text-phos-dim">waiting for input…</p>}
            {result.e && view === "json" && <pre className="overflow-auto font-mono text-xs text-phos-dim">{JSON.stringify(result.e, null, 2)}</pre>}
            {result.e && view === "report" && <Report e={result.e} />}
          </div>
        </section>
      </main>
      <footer className="pb-10 text-center font-mono text-xs text-phos-dim">
        Also a library + CLI (<code>txlens &lt;xdr&gt;</code> exits 2 on danger) ·{" "}
        <a className="underline" href="https://github.com/gideononiru/txlens" target="_blank" rel="noreferrer">
          github.com/gideononiru/txlens
        </a>
      </footer>
    </div>
  );
}

function Report({ e }: { e: Explanation }) {
  return (
    <div className="space-y-5">
      {e.findings.length > 0 && (
        <div className="space-y-2">
          {e.findings
            .slice()
            .sort((a, b) => ["danger", "warning", "info"].indexOf(a.severity) - ["danger", "warning", "info"].indexOf(b.severity))
            .map((f, i) => (
              <p key={i} className={`rounded-lg border px-3 py-2 text-sm ${SEV[f.severity].cls}`}>
                <span className="mr-2">{SEV[f.severity].icon}</span>
                {f.operation !== null && <span className="mr-1 font-mono text-xs opacity-70">op {f.operation + 1}:</span>}
                {f.message}
              </p>
            ))}
        </div>
      )}
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-phos-dim">operations</p>
        <ol className="mt-2 space-y-2">
          {e.operations.map((o, i) => (
            <li key={i} className="flex gap-3 rounded-lg bg-term px-3 py-2.5 text-sm">
              <span className="font-mono text-phos">{i + 1}</span>
              <span>{o}</span>
            </li>
          ))}
        </ol>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-xs">
        {[
          ["network", e.network],
          ["source", e.source],
          ["max fee", `${e.feeXlm} XLM${e.feeBump ? ` (bump by ${e.feeBump.feeSource.slice(0, 6)}…)` : ""}`],
          ["sequence", e.sequence],
          ["memo", e.memo ?? "(none)"],
          ["validity", e.validity],
          ["signatures", String(e.signatures)],
        ].map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-phos-dim">{k}</dt>
            <dd className="break-all text-chalk">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
