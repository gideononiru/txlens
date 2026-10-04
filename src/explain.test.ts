import {
  Account,
  Asset,
  Keypair,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
  nativeToScVal,
  Contract,
} from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { explain, formatExplanation, riskLevel, stroopsToXlm } from "./explain.js";

const me = Keypair.random();
const other = Keypair.random().publicKey();
const issuer = Keypair.random().publicKey();
const USDC = new Asset("USDC", issuer);
const NOW = 1_800_000_000;

function build(
  ops: ReturnType<typeof Operation.payment>[],
  opts: { fee?: string; timeout?: number; memo?: Memo } = {},
) {
  const builder = new TransactionBuilder(new Account(me.publicKey(), "41"), {
    fee: opts.fee ?? "100",
    networkPassphrase: Networks.TESTNET,
    timebounds: opts.timeout === 0 ? { minTime: 0, maxTime: 0 } : { minTime: 0, maxTime: NOW + 300 },
    memo: opts.memo,
  });
  ops.forEach((op) => builder.addOperation(op));
  const tx = builder.build();
  tx.sign(me);
  return tx.toXDR();
}

const run = (envelope: string) => explain(envelope, { networkPassphrase: Networks.TESTNET, now: NOW });

describe("explain", () => {
  it("describes a simple payment with all the transaction details", () => {
    const e = run(build([Operation.payment({ destination: other, asset: USDC, amount: "25" })], { memo: Memo.text("invoice 42") }));
    expect(e.network).toBe("Stellar testnet");
    expect(e.source).toBe(me.publicKey());
    expect(e.sequence).toBe("42");
    expect(e.feeXlm).toBe("0.00001");
    expect(e.memo).toBe('text "invoice 42"');
    expect(e.signatures).toBe(1);
    expect(e.operations).toEqual([`${me.publicKey().slice(0, 4)}…${me.publicKey().slice(-4)} pays 25.0000000 USDC (issuer ${issuer.slice(0, 4)}…${issuer.slice(-4)}) to ${other.slice(0, 4)}…${other.slice(-4)}`]);
    expect(riskLevel(e)).toBe("none");
  });

  it("flags an account merge as danger", () => {
    const e = run(build([Operation.accountMerge({ destination: other })]));
    expect(e.operations[0]).toMatch(/merges its account/);
    expect(riskLevel(e)).toBe("danger");
  });

  it("flags adding a signer and disabling the master key", () => {
    const e = run(
      build([
        Operation.setOptions({ signer: { ed25519PublicKey: other, weight: 1 } }),
        Operation.setOptions({ masterWeight: 0 }),
      ]),
    );
    const dangers = e.findings.filter((f) => f.severity === "danger");
    expect(dangers.map((f) => f.operation)).toEqual([0, 1]);
    expect(dangers[1].message).toMatch(/master key/);
  });

  it("warns when an operation acts on another account", () => {
    const e = run(build([Operation.payment({ source: other, destination: me.publicKey(), asset: Asset.native(), amount: "1000" })]));
    expect(e.findings).toContainEqual(
      expect.objectContaining({ severity: "warning", operation: 0, message: expect.stringMatching(/different account/) }),
    );
  });

  it("warns about transactions that never expire", () => {
    const e = run(build([Operation.bumpSequence({ bumpTo: "100" })], { timeout: 0 }));
    expect(e.validity).toBe("never expires");
    expect(e.findings.some((f) => /valid forever/.test(f.message))).toBe(true);
  });

  it("warns about unusually high fees", () => {
    const e = run(build([Operation.bumpSequence({ bumpTo: "100" })], { fee: "50000000" }));
    expect(e.feeXlm).toBe("5");
    expect(riskLevel(e)).toBe("warning");
  });

  it("explains trustlines, offers, cancellations and claimable balances", () => {
    const e = run(
      build([
        Operation.changeTrust({ asset: USDC }),
        Operation.changeTrust({ asset: USDC, limit: "0" }),
        Operation.manageSellOffer({ selling: Asset.native(), buying: USDC, amount: "100", price: "0.1" }),
        Operation.manageSellOffer({ selling: Asset.native(), buying: USDC, amount: "0", price: "1", offerId: "77" }),
      ]),
    );
    expect(e.operations[0]).toMatch(/trusts USDC/);
    expect(e.operations[1]).toMatch(/removes its trustline to USDC/);
    expect(e.operations[2]).toMatch(/DEX offer to sell 100.0000000 XLM for USDC \(issuer .+\) at price 0.1/);
    expect(e.operations[3]).toMatch(/cancels DEX offer #77/);
  });

  it("explains a contract call and notes it can't be verified", () => {
    const contract = new Contract("CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE");
    const e = run(build([contract.call("transfer", nativeToScVal(1), nativeToScVal(2)) as never]));
    expect(e.operations[0]).toMatch(/calls transfer\(\) on contract CA3D…GAXE with 2 argument/);
    expect(e.findings.some((f) => f.severity === "info" && /trust/.test(f.message))).toBe(true);
  });

  it("unwraps fee-bump transactions", () => {
    const inner = TransactionBuilder.fromXDR(
      build([Operation.payment({ destination: other, asset: Asset.native(), amount: "1" })]),
      Networks.TESTNET,
    );
    const sponsor = Keypair.random();
    const bump = TransactionBuilder.buildFeeBumpTransaction(sponsor, "200", inner as never, Networks.TESTNET);
    const e = run(bump.toXDR());
    expect(e.feeBump?.feeSource).toBe(sponsor.publicKey());
    expect(e.operations).toHaveLength(1);
    expect(e.findings.some((f) => /fee bump/.test(f.message))).toBe(true);
  });

  it("rejects garbage", () => {
    expect(() => run("not xdr")).toThrow(/valid base64 transaction envelope/);
  });

  it("formats a readable report", () => {
    const text = formatExplanation(run(build([Operation.accountMerge({ destination: other })])));
    expect(text).toContain("Operations:\n  1. ");
    expect(text).toContain("⛔ Merges the account");
  });
});

describe("stroopsToXlm", () => {
  it.each([
    ["100", "0.00001"],
    ["10000000", "1"],
    ["12345678901", "1234.5678901"],
  ])("%s stroops = %s XLM", (stroops, xlm) => {
    expect(stroopsToXlm(stroops)).toBe(xlm);
  });
});
