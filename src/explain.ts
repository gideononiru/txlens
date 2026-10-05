import {
  Address,
  Asset,
  FeeBumpTransaction,
  LiquidityPoolAsset,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";

export type Severity = "info" | "warning" | "danger";

export interface Finding {
  severity: Severity;
  /** Index of the operation this is about, or null for transaction-level findings. */
  operation: number | null;
  message: string;
  /** For fee bumps: whether this is about the outer fee bump or the inner transaction. */
  envelope?: "fee-bump" | "inner";
}

export interface Explanation {
  network: string;
  source: string;
  /** Total max fee in XLM. */
  feeXlm: string;
  sequence: string;
  memo: string | null;
  validity: string;
  signatures: number;
  feeBump: { feeSource: string; feeXlm: string } | null;
  operations: string[];
  findings: Finding[];
}

export interface ExplainOptions {
  /** Network passphrase; defaults to public network. */
  networkPassphrase?: string;
  /** Unix seconds treated as "now" when describing time bounds. */
  now?: number;
  /** Max fee (XLM) above which a warning is raised. Default 1 XLM. */
  feeWarningXlm?: number;
}

const STROOPS = 10_000_000n;

export function stroopsToXlm(stroops: string | number | bigint): string {
  const value = BigInt(stroops);
  const whole = value / STROOPS;
  const frac = (value % STROOPS).toString().padStart(7, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

export function short(address: string | undefined): string {
  if (!address) return "(none)";
  return address.length > 12 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address;
}

export function assetName(asset: Asset | LiquidityPoolAsset | undefined): string {
  if (!asset) return "?";
  if (asset instanceof LiquidityPoolAsset) return "liquidity pool shares";
  if (asset.isNative()) return "XLM";
  return `${asset.getCode()} (issuer ${short(asset.getIssuer())})`;
}

/** Decode a base64 envelope and describe it in plain English. */
export function explain(envelope: string, options: ExplainOptions = {}): Explanation {
  const networkPassphrase = options.networkPassphrase ?? Networks.PUBLIC;
  let parsed: Transaction | FeeBumpTransaction;
  try {
    parsed = TransactionBuilder.fromXDR(envelope.trim(), networkPassphrase);
  } catch {
    throw new Error("Not a valid base64 transaction envelope");
  }

  const findings: Finding[] = [];
  let feeBump: Explanation["feeBump"] = null;
  let tx: Transaction;
  if (parsed instanceof FeeBumpTransaction) {
    feeBump = { feeSource: parsed.feeSource, feeXlm: stroopsToXlm(parsed.fee) };
    tx = parsed.innerTransaction;
    findings.push({
      severity: "info",
      operation: null,
      message: `Fees are paid by ${short(parsed.feeSource)} (fee bump), not the transaction source.`,
    });
  } else {
    tx = parsed;
  }

  const feeXlm = stroopsToXlm(feeBump ? parsed.fee : tx.fee);
  if (Number(feeXlm) > (options.feeWarningXlm ?? 1)) {
    findings.push({
      severity: "warning",
      operation: null,
      message: `Unusually high max fee: ${feeXlm} XLM.`,
    });
  }

  // Everything found so far is about the fee-bump wrapper; the rest is about the inner tx.
  const outerCount = findings.length;

  const now = options.now ?? Math.floor(Date.now() / 1000);
  const validity = describeTimeBounds(tx, now, findings);

  const operations = tx.operations.map((op, i) => {
    const opSource = op.source && op.source !== tx.source ? op.source : undefined;
    if (opSource) {
      findings.push({
        severity: "warning",
        operation: i,
        message: `Operation ${i + 1} acts on behalf of a different account (${short(opSource)}).`,
      });
    }
    const actor = short(opSource ?? tx.source);
    return describe(op, actor, i, findings);
  });

  if (feeBump) findings.forEach((f, i) => (f.envelope = i < outerCount ? "fee-bump" : "inner"));

  return {
    network: networkName(networkPassphrase),
    source: tx.source,
    feeXlm,
    sequence: tx.sequence,
    memo: describeMemo(tx),
    validity,
    signatures: parsed.signatures.length,
    feeBump,
    operations,
    findings,
  };
}

function networkName(passphrase: string): string {
  if (passphrase === Networks.PUBLIC) return "Stellar public network (mainnet)";
  if (passphrase === Networks.TESTNET) return "Stellar testnet";
  if (passphrase === Networks.FUTURENET) return "Stellar futurenet";
  return `custom network (${passphrase})`;
}

function describeMemo(tx: Transaction): string | null {
  const memo = tx.memo;
  switch (memo.type) {
    case "none":
      return null;
    case "text":
      return `text "${Buffer.isBuffer(memo.value) ? memo.value.toString("utf8") : String(memo.value)}"`;
    case "id":
      return `id ${String(memo.value)}`;
    default:
      return `${memo.type} ${Buffer.from(memo.value as Buffer).toString("hex")}`;
  }
}

function describeTimeBounds(tx: Transaction, now: number, findings: Finding[]): string {
  const bounds = tx.timeBounds;
  const max = bounds ? Number(bounds.maxTime) : 0;
  const min = bounds ? Number(bounds.minTime) : 0;
  if (!bounds || max === 0) {
    findings.push({
      severity: "warning",
      operation: null,
      message: "No expiry: this transaction stays valid forever once signed.",
    });
    return min > 0 ? `valid from ${iso(min)}, never expires` : "never expires";
  }
  if (max < now) {
    findings.push({ severity: "info", operation: null, message: `Already expired at ${iso(max)}.` });
  }
  return min > 0 ? `valid ${iso(min)} → ${iso(max)}` : `valid until ${iso(max)}`;
}

function iso(seconds: number): string {
  return new Date(seconds * 1000).toISOString().replace(".000Z", "Z");
}

function flagNames(flags: number | undefined): string {
  if (!flags) return "";
  const names: string[] = [];
  if (flags & 1) names.push("AUTH_REQUIRED");
  if (flags & 2) names.push("AUTH_REVOCABLE");
  if (flags & 4) names.push("AUTH_IMMUTABLE");
  if (flags & 8) names.push("AUTH_CLAWBACK_ENABLED");
  return names.join(", ");
}

function describe(op: Operation, actor: string, i: number, findings: Finding[]): string {
  const flag = (severity: Severity, message: string) =>
    findings.push({ severity, operation: i, message });

  switch (op.type) {
    case "payment":
      return `${actor} pays ${op.amount} ${assetName(op.asset)} to ${short(op.destination)}`;
    case "createAccount":
      return `${actor} creates account ${short(op.destination)} with ${op.startingBalance} XLM`;
    case "pathPaymentStrictSend":
      return `${actor} sends exactly ${op.sendAmount} ${assetName(op.sendAsset)} to ${short(op.destination)}, who receives at least ${op.destMin} ${assetName(op.destAsset)}`;
    case "pathPaymentStrictReceive":
      return `${actor} spends up to ${op.sendMax} ${assetName(op.sendAsset)} so ${short(op.destination)} receives exactly ${op.destAmount} ${assetName(op.destAsset)}`;
    case "changeTrust":
      if (op.limit === "0" || op.limit === "0.0000000") {
        return `${actor} removes its trustline to ${assetName(op.line)}`;
      }
      return `${actor} trusts ${assetName(op.line)}${op.limit === "922337203685.4775807" ? "" : ` up to ${op.limit}`}`;
    case "manageSellOffer":
    case "manageBuyOffer":
    case "createPassiveSellOffer": {
      const amount = "amount" in op ? op.amount : op.buyAmount;
      const offerId = "offerId" in op ? op.offerId : "0";
      if (amount === "0" || amount === "0.0000000") return `${actor} cancels DEX offer #${offerId}`;
      const verb = op.type === "manageBuyOffer" ? "buy" : "sell";
      const base = op.type === "manageBuyOffer" ? op.buying : op.selling;
      const quote = op.type === "manageBuyOffer" ? op.selling : op.buying;
      return `${actor} places a DEX offer to ${verb} ${amount} ${assetName(base)} for ${assetName(quote)} at price ${op.price}`;
    }
    case "setOptions": {
      const parts: string[] = [];
      if (op.masterWeight !== undefined) {
        parts.push(`master key weight → ${op.masterWeight}`);
        if (op.masterWeight === 0) {
          flag("danger", "Sets the master key weight to 0: the account's own key can no longer sign.");
        }
      }
      if (op.signer) {
        const signer = op.signer as { ed25519PublicKey?: string; weight?: number };
        const key = signer.ed25519PublicKey ?? "a non-ed25519 signer";
        if (signer.weight === 0) {
          parts.push(`removes signer ${short(key)}`);
          flag("warning", `Removes signer ${short(key)}.`);
        } else {
          parts.push(`adds signer ${short(key)} (weight ${signer.weight})`);
          flag("danger", `Adds ${short(key)} as a signer: they gain control over this account.`);
        }
      }
      if (op.lowThreshold !== undefined || op.medThreshold !== undefined || op.highThreshold !== undefined) {
        parts.push(`thresholds → low ${op.lowThreshold ?? "-"}, med ${op.medThreshold ?? "-"}, high ${op.highThreshold ?? "-"}`);
        flag("warning", "Changes signing thresholds.");
      }
      if (op.homeDomain !== undefined) parts.push(`home domain → "${op.homeDomain}"`);
      if (op.setFlags) parts.push(`sets flags ${flagNames(op.setFlags)}`);
      if (op.clearFlags) parts.push(`clears flags ${flagNames(op.clearFlags)}`);
      if (op.inflationDest) parts.push(`inflation destination → ${short(op.inflationDest)}`);
      return `${actor} changes account settings: ${parts.join("; ") || "no changes"}`;
    }
    case "accountMerge":
      flag("danger", `Merges the account into ${short(op.destination)}: ALL its XLM moves there and the account is deleted.`);
      return `${actor} merges its account into ${short(op.destination)} (deletes it, sends all XLM)`;
    case "manageData":
      return op.value === undefined || op.value === null
        ? `${actor} deletes data entry "${op.name}"`
        : `${actor} sets data entry "${op.name}"`;
    case "bumpSequence":
      return `${actor} bumps its sequence number to ${op.bumpTo}`;
    case "allowTrust":
    case "setTrustLineFlags":
      return `${actor} changes authorization of ${short(op.trustor)}'s trustline`;
    case "clawback":
      flag("warning", `Claws back ${op.amount} ${assetName(op.asset)} from ${short(op.from)}.`);
      return `${actor} claws back ${op.amount} ${assetName(op.asset)} from ${short(op.from)}`;
    case "createClaimableBalance":
      return `${actor} locks ${op.amount} ${assetName(op.asset)} in a claimable balance for ${op.claimants.length} claimant(s)`;
    case "claimClaimableBalance":
      return `${actor} claims claimable balance ${short(op.balanceId)}`;
    case "beginSponsoringFutureReserves":
      return `${actor} starts paying reserves for ${short(op.sponsoredId)}`;
    case "endSponsoringFutureReserves":
      return `${actor} stops a reserve sponsorship`;
    case "revokeSponsorship":
      return `${actor} revokes a sponsorship`;
    case "liquidityPoolDeposit":
      return `${actor} deposits up to ${op.maxAmountA} / ${op.maxAmountB} into liquidity pool ${short(op.liquidityPoolId)}`;
    case "liquidityPoolWithdraw":
      return `${actor} withdraws ${op.amount} pool shares from ${short(op.liquidityPoolId)}`;
    case "invokeHostFunction":
      return describeHostFunction(op.func, actor, flag);
    case "extendFootprintTtl":
      return `${actor} extends the lifetime of contract data by ${op.extendTo} ledgers`;
    case "restoreFootprint":
      return `${actor} restores archived contract data`;
    default:
      flag("warning", `Unrecognised operation type "${op.type}".`);
      return `${actor} performs ${op.type}`;
  }
}

function describeHostFunction(
  func: xdr.HostFunction,
  actor: string,
  flag: (s: Severity, m: string) => void,
): string {
  switch (func.switch()) {
    case xdr.HostFunctionType.hostFunctionTypeInvokeContract(): {
      const call = func.invokeContract();
      const contract = Address.fromScAddress(call.contractAddress()).toString();
      const fn = call.functionName().toString();
      const args = call.args().map(decodeArg);
      flag(
        "info",
        `Calls contract ${short(contract)}: its effects depend on that contract's code. Only sign for contracts you trust.`,
      );
      return describeTokenCall(fn, args, contract, actor, flag) ?? `${actor} calls ${fn}(${args.map(showArg).join(", ")}) on contract ${short(contract)}`;
    }
    case xdr.HostFunctionType.hostFunctionTypeUploadContractWasm():
      return `${actor} uploads contract code (${func.wasm().length} bytes)`;
    default:
      return `${actor} deploys a new contract`;
  }
}

// Allowances at or above this many base units are treated as unlimited.
const UNLIMITED = 2n ** 63n - 1n;

function decodeArg(v: xdr.ScVal): unknown {
  try {
    return scValToNative(v);
  } catch {
    return `<${v.switch().name}>`;
  }
}

/** Compact, human-readable rendering of a decoded contract argument. */
export function showArg(v: unknown): string {
  if (typeof v === "bigint" || typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "string") return /^[GCM][A-Z2-7]{55}$/.test(v) ? short(v) : JSON.stringify(v);
  if (v === null || v === undefined) return "none";
  if (v instanceof Uint8Array) {
    const hex = Array.from(v, (b) => b.toString(16).padStart(2, "0")).join("");
    return `0x${hex.length > 16 ? `${hex.slice(0, 8)}…${hex.slice(-8)}` : hex}`;
  }
  if (Array.isArray(v)) return `[${v.map(showArg).join(", ")}]`;
  if (typeof v === "object") {
    return `{${Object.entries(v as Record<string, unknown>)
      .map(([k, x]) => `${k}: ${showArg(x)}`)
      .join(", ")}}`;
  }
  return String(v);
}

/** Plain-English descriptions for the SEP-41 token functions people sign most. */
function describeTokenCall(
  fn: string,
  args: unknown[],
  contract: string,
  actor: string,
  flag: (s: Severity, m: string) => void,
): string | null {
  const amount = (v: unknown) => (typeof v === "bigint" ? v : null);
  const token = `token ${short(contract)}`;
  if (fn === "transfer" && args.length === 3 && amount(args[2]) !== null) {
    return `${actor} transfers ${args[2]} base units of ${token} from ${showArg(args[0])} to ${showArg(args[1])}`;
  }
  if (fn === "approve" && args.length === 4 && amount(args[2]) !== null) {
    const value = amount(args[2])!;
    if (value >= UNLIMITED) {
      flag(
        "warning",
        `Gives ${showArg(args[1])} an effectively unlimited allowance on ${token}. It can move all of ${showArg(args[0])}'s balance of this token until ledger ${args[3]}.`,
      );
    }
    return `${actor} lets ${showArg(args[1])} spend up to ${value} base units of ${showArg(args[0])}'s ${token} until ledger ${args[3]}`;
  }
  if (fn === "burn" && args.length === 2 && amount(args[1]) !== null) {
    return `${actor} burns ${args[1]} base units of ${token} from ${showArg(args[0])}`;
  }
  return null;
}

/** Render an explanation as human-readable text. */
export function formatExplanation(e: Explanation): string {
  const icon: Record<Severity, string> = { info: "ℹ", warning: "⚠", danger: "⛔" };
  const lines = [
    `Network:    ${e.network}`,
    `Source:     ${e.source}`,
    `Max fee:    ${e.feeXlm} XLM${e.feeBump ? ` (fee bump paid by ${e.feeBump.feeSource})` : ""}`,
    `Sequence:   ${e.sequence}`,
    `Memo:       ${e.memo ?? "(none)"}`,
    `Validity:   ${e.validity}`,
    `Signatures: ${e.signatures}`,
    "",
    "Operations:",
    ...e.operations.map((o, i) => `  ${i + 1}. ${o}`),
  ];
  if (e.findings.length) {
    lines.push("", "Review:");
    const where = (f: Finding) => (f.envelope === "fee-bump" ? "[fee bump] " : f.envelope === "inner" ? "[inner tx] " : "");
    for (const f of e.findings) lines.push(`  ${icon[f.severity]} ${where(f)}${f.message}`);
  }
  return lines.join("\n");
}

/** Highest severity among findings, for exit codes and badges. */
export function riskLevel(e: Explanation): Severity | "none" {
  if (e.findings.some((f) => f.severity === "danger")) return "danger";
  if (e.findings.some((f) => f.severity === "warning")) return "warning";
  if (e.findings.length) return "info";
  return "none";
}
