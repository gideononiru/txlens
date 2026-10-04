# Wallet integration

Show txlens output on your signing screen:

```ts
const e = explain(xdr, { networkPassphrase });
render(e.operations);                       // one line per operation
for (const f of e.findings) banner(f.severity, f.message);
if (riskLevel(e) === "danger") requireTypedConfirmation();
```

## CI and scripts

`txlens <xdr>` exits **2** when a danger finding is present, so you can gate
automated signing:

```bash
txlens "$XDR" --testnet || { echo "refusing to sign"; exit 1; }
```
