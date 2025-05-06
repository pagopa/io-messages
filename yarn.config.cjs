/** @type {import('@yarnpkg/types')} */
const { defineConfig } = require("@yarnpkg/types");

// We don't want to apply the same configuration to all workspaces.
// These workspaces use a different toolchain that will be migrated in the future.
const LEGACY_WORKSPACES = ["citizen-func", "pushnotif-func"];

/** @param {import('@yarnpkg/types').Yarn.Constraints.Workspace} w */
function setWorkspaceScripts(w) {
  w.set("scripts.format", "prettier --write .");
  w.set("scripts.format:check", "prettier --check .");
  w.set("scripts.lint", "eslint --fix src");
  w.set("scripts.lint:check", "eslint src");
  w.set("scripts.typecheck", "tsc --noEmit");
  w.set("scripts.test", "vitest run");
  w.set("scripts.test:coverage", "vitest run --coverage");
}

/** @param {import('@yarnpkg/types').Yarn.Constraints.Workspace} w */
function setDefaultWorkspaceType(w) {
  if (w.manifest.type === undefined) {
    w.set("type", "module");
  }
}

module.exports = defineConfig({
  async constraints({ Yarn }) {
    Yarn.workspaces()
      .filter(
        // Exclude the current workspace and the legacy workspaces.
        (w) => w.cwd !== "." && !LEGACY_WORKSPACES.includes(w.ident),
      )
      .forEach((w) => {
        setWorkspaceScripts(w);
        setDefaultWorkspaceType(w);
      });
  },
});
