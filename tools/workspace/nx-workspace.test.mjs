import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../..", import.meta.url));

test("Nx package-based workspace is configured", () => {
  const rootPackage = readJson("package.json");

  assert.ok(rootPackage.devDependencies?.nx, "root package.json should depend on nx");
  assert.deepEqual(rootPackage.workspaces, ["apps/*", "libs/*", "packages/*"]);
  assert.ok(existsSync(join(rootDir, "nx.json")), "nx.json should exist");
});

test("Nx project names, tags, and targets are declared", () => {
  const projects = [
    {
      path: "apps/web/package.json",
      name: "web",
      tags: ["type:app", "scope:web"],
      targets: ["serve", "build", "test", "lint"]
    },
    {
      path: "apps/admin/package.json",
      name: "admin",
      tags: ["type:app", "scope:admin"],
      targets: ["serve", "build", "test"]
    },
    {
      path: "apps/api/package.json",
      name: "api",
      tags: ["type:app", "scope:api"],
      targets: ["serve", "build", "test", "openapi"]
    },
    {
      path: "libs/api-client/package.json",
      name: "api-client",
      tags: ["type:lib", "scope:shared", "layer:client"],
      targets: ["build", "test", "generate", "typecheck"]
    },
    {
      path: "packages/shared/package.json",
      name: "shared",
      tags: ["type:lib", "scope:shared"],
      targets: ["build", "test"]
    }
  ];

  for (const project of projects) {
    const packageJson = readJson(project.path);
    const nxConfig = packageJson.nx;
    const targets = {
      ...packageJson.scripts,
      ...nxConfig?.targets
    };

    assert.equal(nxConfig?.name, project.name, `${project.path} should set nx.name`);
    assert.deepEqual(nxConfig?.tags, project.tags, `${project.name} should set Nx tags`);

    for (const target of project.targets) {
      assert.ok(targets[target], `${project.name} should expose ${target} target`);
    }
  }
});

function readJson(path) {
  return JSON.parse(readFileSync(join(rootDir, path), "utf8"));
}
