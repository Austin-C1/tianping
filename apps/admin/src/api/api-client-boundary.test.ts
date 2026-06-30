import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("admin API client boundary", () => {
  it("keeps admin API modules behind the generated API client", () => {
    const apiDir = dirname(fileURLToPath(import.meta.url));
    const apiFiles = ["admin.ts", "auth.ts", "http.ts"].map((file) =>
      join(apiDir, file)
    );
    const directHttpViolations = apiFiles
      .filter((file) =>
        /from ['"]axios['"]|['"]\/(admin|auth|markets|orders|wallets)\b/.test(
          readFileSync(file, "utf8")
        )
      )
      .map((file) => relative(apiDir, file));
    const generatedClientViolations = apiFiles
      .filter((file) => !readFileSync(file, "utf8").includes("@pmx/api-client"))
      .map((file) => relative(apiDir, file));

    expect(directHttpViolations).toEqual([]);
    expect(generatedClientViolations).toEqual([]);
  });
});
