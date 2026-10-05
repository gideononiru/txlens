import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { Networks } from "@stellar/stellar-sdk";
import { explain, formatExplanation, riskLevel } from "./explain.js";

const HELP = `txlens — explain a Stellar transaction before you sign it

Usage:
  txlens <base64-xdr> [--testnet | --network "<passphrase>"] [--json]
  txlens --file tx.xdr [--testnet]     read the envelope from a file ("-" = stdin)
  echo <base64-xdr> | txlens [--testnet]

Exit codes: 0 ok, 1 invalid input, 2 contains a "danger" finding.`;

export async function run(
  argv: string[],
  out: (line: string) => void = console.log,
  readStdin: () => Promise<string> = readAllStdin,
): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      testnet: { type: "boolean", default: false },
      network: { type: "string" },
      json: { type: "boolean", default: false },
      file: { type: "string", short: "f" },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
  });
  if (values.help) {
    out(HELP);
    return 0;
  }

  let input: string;
  try {
    input =
      values.file === "-"
        ? (await readStdin()).trim()
        : values.file
          ? readFileSync(values.file, "utf8").trim()
          : (positionals[0] ?? (await readStdin())).trim();
  } catch (err) {
    out(`error: can't read ${values.file}: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
  if (!input) {
    out(HELP);
    return 1;
  }
  const networkPassphrase = values.network ?? (values.testnet ? Networks.TESTNET : Networks.PUBLIC);

  try {
    const explanation = explain(input, { networkPassphrase });
    out(values.json ? JSON.stringify(explanation, null, 2) : formatExplanation(explanation));
    return riskLevel(explanation) === "danger" ? 2 : 0;
  } catch (err) {
    out(`error: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}

async function readAllStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}
