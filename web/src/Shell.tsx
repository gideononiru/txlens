import { useState, type ReactNode } from "react";

import { Link, useTitle } from "./lib/router";

const NAV = [
  ["/", "Home"],
  ["/app", "App"],
  ["/docs", "Docs"],
] as const;

const REPO = "https://github.com/gideononiru/txlens";

function HeaderAction() {
  return (
    <a className="run inline-block" href={REPO} target="_blank" rel="noreferrer">
      GitHub ↗
    </a>
  );
}

export function Shell({ route, children }: { route: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-rim bg-term/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-8 w-8" />
            <span className="font-mono text-lg font-bold text-phos">txlens</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(([to, label]) => (
              <Link key={to} to={to} className={`rounded-md px-3 py-1.5 font-mono text-sm ${route === to ? "bg-phos text-term" : "text-phos-dim hover:text-phos"}`}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="hidden md:block">
            <HeaderAction />
          </div>
          <button className="rounded-md border border-rim px-3 py-1.5 text-phos md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu" aria-expanded={open}>
            {open ? "✕" : "☰"}
          </button>
        </div>
        {open && (
          <div className="space-y-1 border-t border-rim px-5 py-4 md:hidden" onClick={() => setOpen(false)}>
            {NAV.map(([to, label]) => (
              <Link key={to} to={to} className={`block rounded-md px-3 py-1.5 font-mono text-sm ${route === to ? "bg-phos text-term" : "text-phos-dim hover:text-phos"}`}>
                {label}
              </Link>
            ))}
            <div className="pt-2">
              <HeaderAction />
            </div>
          </div>
        )}
        
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-20 border-t border-rim bg-pane">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="font-mono text-lg font-bold text-phos">txlens</p>
            <p className="mt-2 max-w-xs text-sm text-phos-dim">Plain-English Stellar transactions, with the dangerous parts flagged.</p>
          </div>
          <div className="text-sm">
            <p className="font-semibold text-chalk">Product</p>
            <ul className="mt-3 space-y-2 text-phos-dim">
              <li><Link to="/app" className="hover:underline">App</Link></li>
              <li><Link to="/docs" className="hover:underline">Documentation</Link></li>
              <li><a href="#/docs" onClick={() => setTimeout(() => document.getElementById("faq")?.scrollIntoView(), 60)} className="hover:underline">FAQ</a></li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="font-semibold text-chalk">Open source</p>
            <ul className="mt-3 space-y-2 text-phos-dim">
              <li><a href={REPO} target="_blank" rel="noreferrer" className="hover:underline">GitHub</a></li>
              
              <li><a href={`${REPO}/blob/main/LICENSE`} target="_blank" rel="noreferrer" className="hover:underline">MIT license</a></li>
            </ul>
          </div>
        </div>
        <p className="pb-8 text-center text-xs text-phos-dim opacity-80">txlens explains transactions; it can’t promise they’re safe. When in doubt, don’t sign.</p>
      </footer>
    </div>
  );
}

export function NotFound() {
  useTitle("Not found · txlens");
  return (
    <section className="mx-auto max-w-xl px-5 py-28 text-center">
      <p className="text-8xl font-bold tracking-tight text-phos">404</p>
      <p className="mt-4 text-lg text-phos-dim">There’s nothing at this address.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link to="/" className="run inline-block">Back home</Link>
        <Link to="/docs" className="chipb inline-block px-4 py-2 text-sm">Read the docs</Link>
      </div>
    </section>
  );
}
