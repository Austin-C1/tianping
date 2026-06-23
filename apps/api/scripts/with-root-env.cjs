const { spawnSync } = require("node:child_process");
const { existsSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const envPath = resolve(__dirname, "../../../.env");

function parseEnv(content) {
  return content.split(/\r?\n/).reduce((env, line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return env;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      return env;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
    return env;
  }, {});
}

if (existsSync(envPath)) {
  const rootEnv = parseEnv(readFileSync(envPath, "utf8"));
  for (const [key, value] of Object.entries(rootEnv)) {
    process.env[key] ??= value;
  }
}

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("Usage: node scripts/with-root-env.cjs <command> [...args]");
  process.exit(1);
}

const result = spawnSync(command, args, {
  env: process.env,
  shell: process.platform === "win32",
  stdio: "inherit"
});

process.exit(result.status ?? 1);
