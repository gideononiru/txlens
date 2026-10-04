# txlens

**See what a Stellar transaction really does before you sign it.**

Wallet pop-ups and "sign this XDR" requests show a wall of base64.
`txlens` decodes any Stellar transaction envelope into plain English and
flags the operations that commonly drain accounts: account merges, new
signers, disabled master keys, operations acting on someone else's
account, transactions that never expire and suspicious fees.

```console
$ txlens AAAAAgAAAAD… --testnet
Network:    Stellar testnet
Source:     GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H
Max fee:    0.0002 XLM
Sequence:   1932
Memo:       text "airdrop claim"
Validity:   never expires
Signatures: 0

Operations:
  1. GBRP…OX2H changes account settings: adds signer GDX7…Q4KA (weight 10)
  2. GBRP…OX2H merges its account into GDX7…Q4KA (deletes it, sends all XLM)

Review:
  ⚠ No expiry: this transaction stays valid forever once signed.
  ⛔ Adds GDX7…Q4KA as a signer: they gain control over this account.
  ⛔ Merges the account into GDX7…Q4KA: ALL its XLM moves there and the account is deleted.
```

That example is a classic "claim your airdrop" scam, and it's obvious
once it's in plain English.

## What it understands

Payments, account creation, both path payments, trustlines (add/remove),
DEX offers (create/cancel/passive), `setOptions` (signers, weights,
thresholds, flags, home domain), account merge, data entries, sequence
bumps, trustline authorization, clawback, claimable balances,
sponsorships, liquidity pools, and Soroban contract calls, uploads,
deploys, TTL extensions and restores. Fee-bump envelopes are unwrapped.

| Finding | Severity |
| --- | --- |
| Account merge | ⛔ danger |
| Adds a signer / sets master key weight to 0 | ⛔ danger |
| Removes a signer / changes thresholds | ⚠ warning |
| An operation's source is a different account | ⚠ warning |
| No expiry (valid forever) | ⚠ warning |
| Max fee above 1 XLM (configurable) | ⚠ warning |
| Clawback | ⚠ warning |
| Soroban contract call (effects depend on its code) | ℹ info |
| Fee paid by a fee-bump sponsor | ℹ info |
| Already expired | ℹ info |

## CLI

```bash
npx txlens <base64-xdr>                    # mainnet passphrase by default
npx txlens <base64-xdr> --testnet
npx txlens <base64-xdr> --network "My Network ; 2026"
echo <base64-xdr> | npx txlens --json      # machine-readable
```

Exit codes: `0` ok, `1` invalid input, `2` the transaction contains a
**danger** finding. Use that last one to gate signing in scripts and CI.

## Library

```ts
import { explain, formatExplanation, riskLevel } from "txlens";

const e = explain(xdr, { networkPassphrase: Networks.TESTNET });
e.operations;      // ["GBRP…OX2H pays 25.0000000 USDC (issuer GA5Z…KZVN) to GDX7…Q4KA"]
e.findings;        // [{ severity: "warning", operation: null, message: "No expiry: …" }]
riskLevel(e);      // "none" | "info" | "warning" | "danger"
formatExplanation(e); // the report shown above
```

Wallets and dApps can show `e.operations` and the findings in their own
confirmation screens.

## Development

```bash
npm install
npm test            # 18 tests, built from real transactions
npm run lint && npm run typecheck && npm run build
```

## Glossary (new to Stellar?)

- **XDR**: the binary format Stellar uses for transactions, usually shared
  as base64 text. It's what a wallet actually signs.
- **Envelope**: a transaction plus its signatures.
- **Network passphrase**: the string that makes a signature valid on only
  one network (mainnet, testnet…). The same XDR decodes differently per
  network, so tell txlens which one.
- **Signer / weight / threshold**: an account can have several keys, each
  with a weight. An operation needs the signers' total weight to reach its
  threshold. Adding a signer hands over control.
- **Master key**: the account's original key. Weight 0 means it can no
  longer sign anything.
- **Account merge**: deletes an account and sends all of its XLM to
  another account. It can't be undone.
- **Fee bump**: a wrapper that lets another account pay a transaction's
  fees.
- **Time bounds**: the window in which a transaction is valid. Without an
  upper bound, a signed transaction can be submitted at any time in the
  future.

## License

MIT
