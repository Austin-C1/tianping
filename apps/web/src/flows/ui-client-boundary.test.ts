import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("UI client boundary", () => {
  it("keeps React UI files behind actions or flows instead of low-level clients", () => {
    const srcDir = join(dirname(fileURLToPath(import.meta.url)), "..");
    const uiFiles = [...collectTsxFiles(join(srcDir, "app")), ...collectTsxFiles(join(srcDir, "features"))];
    const violations = uiFiles
      .filter((file) => !file.endsWith(".test.tsx"))
      .filter((file) => /from\s+["'][^"']*-client["']/.test(readFileSync(file, "utf8")))
      .map((file) => relative(srcDir, file));

    expect(violations).toEqual([]);
  });

  it("keeps feature clients behind the generated API client", () => {
    const srcDir = join(dirname(fileURLToPath(import.meta.url)), "..");
    const clientFiles = collectTsFiles(join(srcDir, "features")).filter((file) =>
      file.endsWith("-client.ts")
    );
    const directHttpViolations = clientFiles
      .filter((file) =>
        /\bfetch\s*\(|NEXT_PUBLIC_API_BASE_URL|["']\/(admin|auth|markets|orders|wallets)\b/.test(
          readFileSync(file, "utf8")
        )
      )
      .map((file) => relative(srcDir, file));
    const generatedClientViolations = clientFiles
      .filter((file) => !readFileSync(file, "utf8").includes("@pmx/api-client"))
      .map((file) => relative(srcDir, file));

    expect(directHttpViolations).toEqual([]);
    expect(generatedClientViolations).toEqual([]);
  });
});

function collectTsxFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      return collectTsxFiles(fullPath);
    }

    return fullPath.endsWith(".tsx") ? [fullPath] : [];
  });
}

function collectTsFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      return collectTsFiles(fullPath);
    }

    return fullPath.endsWith(".ts") ? [fullPath] : [];
  });
}
