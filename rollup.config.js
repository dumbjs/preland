import { dirname, join } from "node:path";
import { nodeExternals } from "rollup-plugin-node-externals";
import fs from "node:fs/promises";

/**
 * @return {import("rollup").RollupOptions[]}
 */
function main() {
  const common = {
    plugins: [nodeExternals(), inlinePlugin(), createPackages()],
  };
  return [
    {
      ...common,

      input: "./src/index.js",
      output: {
        dir: "./dist/esm",
        format: "esm",
      },
    },
    {
      ...common,
      input: "./src/index.js",
      output: {
        dir: "./dist/cjs",
        format: "cjs",
      },
    },
  ];
}

function inlinePlugin() {
  return {
    name: "inline-plugin",
    async transform(code, path) {
      if (/(__inline_(\w+)[ ]?\=)/g.test(code)) {
        // DO NOT REMOVE THESE, as they are used by `eval`
        // to execute the inline path action
        const fs = await import("node:fs");
        const __dirname = dirname(path);
        const { join } = await import("node:path");

        return code.replace(
          /(__inline_(\w+)\s?\=\s?(.+)[;]?[\n]?)/g,
          (...matchers) => {
            return `__inline_${matchers[2]} = \`${escapeJS(
              eval(matchers[3])
            )}\``;
          }
        );
      }
    },
  };
}

export default main;

function escapeJS(code) {
  return escapeTemplateLiterals(escapeBackticks(code));
}

function escapeBackticks(code) {
  return code.replace(/`/g, "\\`");
}

function escapeTemplateLiterals(code) {
  return code.replace(/\$\{/g, "\\${");
}

/**
 *
 * @returns {import("rollup").Plugin}
 */
function createPackages() {
  let meta;
  return {
    name: "create-final-packages",
    async renderStart(info) {
      const pkg = {};
      if (info.format == "cjs") {
        pkg.type = "commonjs";
      }
      if (["esm", "es"].includes(info.format)) {
        pkg.type = "module";
      }
      await fs.writeFile(
        join(info.dir, "package.json"),
        JSON.stringify(pkg, null, 2),
        "utf-8"
      );
    },
  };
}
