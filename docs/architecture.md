# Architecture

```text
explain(xdr, { networkPassphrase, now, feeWarningXlm })
  ├─ decode envelope (unwrap FeeBumpTransaction)
  ├─ transaction-level findings: fee bump, high fee, no/expired time bounds
  ├─ per-operation describe(): English sentence + findings
  └─ Explanation { network, source, feeXlm, sequence, memo, validity, signatures,
                   feeBump, operations[], findings[] }
formatExplanation(e)  → text report
riskLevel(e)          → none | info | warning | danger
```

## Severity policy

- **danger**: can hand over or destroy the account (account merge, adding
  a signer, master key weight 0).
- **warning**: unusual or worth double-checking (foreign op source,
  threshold changes, signer removal, no expiry, high fee, clawback).
- **info**: context (fee bump, contract call, already expired).

## Why the network matters

Signatures and hashes are network-specific, and decoding a transaction
needs the passphrase. txlens defaults to mainnet. Pass `--testnet` or a
custom passphrase otherwise.

## Extending

Add a `case` to `describe()` in `src/explain.ts` with a sentence and any
findings, then a test in `src/explain.test.ts` built from a real
transaction.
