import { Account, Asset, Contract, Keypair, Memo, Networks, Operation, Transaction, TransactionBuilder, nativeToScVal } from "@stellar/stellar-sdk";

const victim = Keypair.random().publicKey();
const attacker = Keypair.random().publicKey();
const shop = Keypair.random().publicKey();
const usdcIssuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

function tx(ops: ReturnType<typeof Operation.payment>[], opts: { memo?: Memo; forever?: boolean } = {}) {
  const b = new TransactionBuilder(new Account(victim, "1932"), {
    fee: "100",
    networkPassphrase: Networks.TESTNET,
    memo: opts.memo,
    ...(opts.forever ? { timebounds: { minTime: 0, maxTime: 0 } } : {}),
  });
  ops.forEach((o) => b.addOperation(o));
  if (!opts.forever) b.setTimeout(300);
  return b.build().toXDR();
}

export const SAMPLES: { name: string; xdr: string }[] = [
  {
    name: "🚨 'Claim your airdrop' scam",
    xdr: tx(
      [
        Operation.setOptions({ signer: { ed25519PublicKey: attacker, weight: 10 } }),
        Operation.accountMerge({ destination: attacker }) as ReturnType<typeof Operation.payment>,
      ],
      { memo: Memo.text("airdrop claim"), forever: true },
    ),
  },
  {
    name: "✅ Pay an invoice in USDC",
    xdr: tx([Operation.payment({ destination: shop, asset: new Asset("USDC", usdcIssuer), amount: "49.99" })], { memo: Memo.text("INV-2041") }),
  },
  {
    name: "🧩 Soroban contract call",
    xdr: tx([
      new Contract("CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC").call(
        "transfer",
        nativeToScVal(victim, { type: "address" }),
        nativeToScVal(shop, { type: "address" }),
        nativeToScVal(10_000_000n, { type: "i128" }),
      ) as unknown as ReturnType<typeof Operation.payment>,
    ]),
  },
  {
    name: "💸 Fee-bumped payment",
    xdr: TransactionBuilder.buildFeeBumpTransaction(
      Keypair.random().publicKey(),
      "200",
      TransactionBuilder.fromXDR(
        tx([Operation.payment({ destination: shop, asset: Asset.native(), amount: "12" })]),
        Networks.TESTNET,
      ) as Transaction,
      Networks.TESTNET,
    ).toXDR(),
  },
  {
    name: "🪝 Issuer claws back USDC",
    xdr: tx([
      Operation.clawback({ asset: new Asset("USDC", usdcIssuer), from: victim, amount: "250", source: usdcIssuer }) as ReturnType<typeof Operation.payment>,
    ]),
  },
  {
    name: "⚠️ Trustline + DEX offer",
    xdr: tx([
      Operation.changeTrust({ asset: new Asset("USDC", usdcIssuer) }) as ReturnType<typeof Operation.payment>,
      Operation.manageSellOffer({ selling: Asset.native(), buying: new Asset("USDC", usdcIssuer), amount: "500", price: "0.11" }) as ReturnType<typeof Operation.payment>,
    ]),
  },
];
