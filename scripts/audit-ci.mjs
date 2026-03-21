import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function readPolicy() {
  const raw = await readFile(new URL("../security/npm-audit-allowlist.json", import.meta.url), "utf8");
  return JSON.parse(raw);
}

function isExpired(dateISO) {
  const now = new Date();
  const expiry = new Date(`${dateISO}T23:59:59.999Z`);
  return Number.isNaN(expiry.getTime()) || now > expiry;
}

function severityRank(severity) {
  if (severity === "critical") return 4;
  if (severity === "high") return 3;
  if (severity === "moderate") return 2;
  if (severity === "low") return 1;
  return 0;
}

async function runAudit() {
  try {
    const { stdout } = await execFileAsync("npm", ["audit", "--omit=dev", "--json"], {
      maxBuffer: 10 * 1024 * 1024,
    });
    return JSON.parse(stdout);
  } catch (error) {
    if (error?.stdout) {
      return JSON.parse(error.stdout);
    }
    throw error;
  }
}

function collectBlocked(vulnerabilities, allowlist, minimumSeverity) {
  const blocked = [];
  const suppressed = [];
  const minimumRank = severityRank(minimumSeverity);
  const allowedPackages = new Set(allowlist.allowedPackages);

  for (const [name, vuln] of Object.entries(vulnerabilities ?? {})) {
    const sev = vuln?.severity ?? "info";
    if (severityRank(sev) < minimumRank) continue;

    if (allowedPackages.has(name)) {
      suppressed.push({ name, severity: sev });
      continue;
    }

    blocked.push({ name, severity: sev });
  }

  return { blocked, suppressed };
}

async function main() {
  const policy = await readPolicy();

  if (isExpired(policy.expiresOn)) {
    console.error(
      `Audit allowlist expired on ${policy.expiresOn}. Remove/refresh security/npm-audit-allowlist.json before CI can pass.`
    );
    process.exit(1);
  }

  const report = await runAudit();
  const { blocked, suppressed } = collectBlocked(
    report.vulnerabilities,
    policy,
    policy.minimumFailSeverity ?? "high"
  );

  const summary = report?.metadata?.vulnerabilities ?? {};
  console.log(
    `npm audit summary: high=${summary.high ?? 0}, critical=${summary.critical ?? 0}, moderate=${summary.moderate ?? 0}`
  );

  if (suppressed.length > 0) {
    const names = suppressed
      .map((item) => `${item.name}(${item.severity})`)
      .sort()
      .join(", ");
    console.log(`suppressed by policy (${policy.reason}): ${names}`);
  }

  if (blocked.length > 0) {
    console.error("unapproved high/critical vulnerabilities found:");
    for (const item of blocked.sort((a, b) => severityRank(b.severity) - severityRank(a.severity))) {
      console.error(`- ${item.name} (${item.severity})`);
    }
    process.exit(1);
  }

  console.log("audit policy check passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
