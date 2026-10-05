import { Account, Keypair, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { run } from "./cli.js";

function merge() {
  const me = Keypair.random();
  const tx = new TransactionBuilder(new Account(me.publicKey(), "1"), { fee: "100", networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.accountMerge({ destination: Keypair.random().publicKey() }))
    .setTimeout(300)
    .build();
  return tx.toXDR();
}

async function cli(args: string[], stdin = "") {
  const lines: string[] = [];
  const code = await run(args, (l) => lines.push(l), async () => stdin);
  return { code, output: lines.join("\n") };
}

describe("cli", () => {
  it("reads the envelope from --file", async () => {
    const { mkdtempSync, writeFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { tmpdir } = await import("node:os");
    const path = join(mkdtempSync(join(tmpdir(), "txlens-")), "tx.xdr");
    writeFileSync(path, merge() + "\n");
    const { code, output } = await cli(["--file", path, "--testnet"]);
    expect(code).toBe(2);
    expect(output).toContain("Merges the account");
    expect((await cli(["--file", path + ".missing"])).code).toBe(1);
  });

  it("exits 2 for dangerous transactions", async () => {
    const { code, output } = await cli([merge(), "--testnet"]);
    expect(code).toBe(2);
    expect(output).toContain("Network:    Stellar testnet");
  });

  it("reads the envelope from stdin and can emit JSON", async () => {
    const { output } = await cli(["--testnet", "--json"], merge() + "\n");
    expect(JSON.parse(output).operations).toHaveLength(1);
  });

  it("exits 1 on invalid input", async () => {
    const { code, output } = await cli(["garbage"]);
    expect(code).toBe(1);
    expect(output).toMatch(/^error:/);
  });

  it("prints help", async () => {
    expect((await cli(["--help"])).output).toContain("Usage:");
  });
});
