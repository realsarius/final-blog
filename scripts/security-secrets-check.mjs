import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);

const ROOT = process.cwd();
const ALLOWLIST_PATH = path.join(ROOT, "security", "secret-scan-allowlist.json");

const MAX_FINDINGS = 30;
const PLACEHOLDER_PATTERNS = [
  /change[-_ ]?me/i,
  /replace[-_ ]?me/i,
  /example/i,
  /dummy/i,
  /sample/i,
  /localhost/i,
  /^test/i,
  /^your[_-]/i,
];

const FILE_EXTENSION_ALLOWLIST = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".yml",
  ".yaml",
  ".toml",
  ".env",
  ".sh",
  ".md",
]);

const SECRET_REGEX_RULES = [
  {
    id: "private-key-block",
    description: "Private key block",
    regex: /-----BEGIN (?:RSA|EC|OPENSSH|PRIVATE) KEY-----/g,
  },
  {
    id: "aws-access-key",
    description: "AWS access key",
    regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
  },
  {
    id: "resend-key",
    description: "Resend API key",
    regex: /\bre_[A-Za-z0-9_]{20,}\b/g,
  },
  {
    id: "slack-token",
    description: "Slack token",
    regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  },
  {
    id: "hardcoded-secret-assignment",
    description: "Hardcoded secret/token/password assignment",
    regex: /\b(?:api[_-]?key|secret|token|password)\b\s*[:=]\s*["'`][^"'`\n]{8,}["'`]/gi,
  },
  {
    id: "connection-string-inline",
    description: "Inline connection string with embedded credentials",
    regex: /\b(?:postgres(?:ql)?|mongodb(?:\+srv)?|mysql|redis):\/\/[^/\s:@]+:[^@\s]+@[^/\s]+/gi,
  },
];

function isLikelyTextFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (FILE_EXTENSION_ALLOWLIST.has(extension)) {
    return true;
  }
  const baseName = path.basename(filePath).toLowerCase();
  return baseName === ".env" || baseName.endsWith(".env");
}

function includesPlaceholder(value) {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

function compressWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function extractQuotedValue(value) {
  const match = value.match(/["'`]([^"'`\n]{1,})["'`]\s*$/);
  return match?.[1]?.trim() ?? "";
}

function shouldIgnoreFinding(finding, allowlist) {
  const ignoredFiles = new Set(allowlist.ignoredFiles ?? []);
  if (ignoredFiles.has(finding.file)) {
    return true;
  }

  const ignoredRules = new Set(allowlist.ignoredRules ?? []);
  if (ignoredRules.has(finding.ruleId)) {
    return true;
  }

  const ignoredSnippets = allowlist.ignoredSnippets ?? [];
  return ignoredSnippets.some((snippet) => finding.match.includes(snippet));
}

async function readAllowlist() {
  try {
    const raw = await readFile(ALLOWLIST_PATH, "utf8");
    const data = JSON.parse(raw);
    return {
      ignoredFiles: Array.isArray(data.ignoredFiles) ? data.ignoredFiles : [],
      ignoredRules: Array.isArray(data.ignoredRules) ? data.ignoredRules : [],
      ignoredSnippets: Array.isArray(data.ignoredSnippets) ? data.ignoredSnippets : [],
    };
  } catch {
    return { ignoredFiles: [], ignoredRules: [], ignoredSnippets: [] };
  }
}

async function getTrackedFiles() {
  const { stdout } = await execFileAsync("git", ["ls-files", "-z"], { cwd: ROOT });
  return stdout
    .split("\0")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((filePath) => isLikelyTextFile(filePath));
}

async function readFileSafe(filePath) {
  try {
    return await readFile(path.join(ROOT, filePath), "utf8");
  } catch {
    return null;
  }
}

function inspectFile(filePath, content) {
  if (content.includes("\u0000")) {
    return [];
  }

  const findings = [];
  for (const rule of SECRET_REGEX_RULES) {
    const matches = content.matchAll(rule.regex);
    for (const match of matches) {
      const matchedValue = compressWhitespace(match[0] ?? "");
      if (!matchedValue) {
        continue;
      }
      if (rule.id === "connection-string-inline" && matchedValue.includes("${")) {
        continue;
      }
      if (rule.id === "hardcoded-secret-assignment") {
        const assignedValue = extractQuotedValue(matchedValue);
        if (assignedValue && includesPlaceholder(assignedValue)) {
          continue;
        }
        if (/^(?:password|token|secret|api[-_ ]?key)$/i.test(assignedValue)) {
          continue;
        }
      }
      if (includesPlaceholder(matchedValue)) {
        continue;
      }
      findings.push({
        file: filePath,
        ruleId: rule.id,
        rule: rule.description,
        match: matchedValue.slice(0, 180),
      });
      if (findings.length >= MAX_FINDINGS) {
        return findings;
      }
    }
  }

  return findings;
}

async function main() {
  const allowlist = await readAllowlist();
  const trackedFiles = await getTrackedFiles();
  const allFindings = [];

  for (const filePath of trackedFiles) {
    const content = await readFileSafe(filePath);
    if (!content) {
      continue;
    }
    const findings = inspectFile(filePath, content);
    for (const finding of findings) {
      if (!shouldIgnoreFinding(finding, allowlist)) {
        allFindings.push(finding);
      }
      if (allFindings.length >= MAX_FINDINGS) {
        break;
      }
    }
    if (allFindings.length >= MAX_FINDINGS) {
      break;
    }
  }

  if (allFindings.length === 0) {
    console.log("secret scan passed: no hardcoded sensitive values in tracked files");
    return;
  }

  console.error("secret scan failed: potential hardcoded sensitive values detected");
  for (const finding of allFindings) {
    console.error(`- ${finding.file} [${finding.rule}]: ${finding.match}`);
  }
  process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
