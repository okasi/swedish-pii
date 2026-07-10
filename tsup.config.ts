import { defineConfig } from "tsup";

/**
 * Builds the framework-free core (src/lib) into a publishable package.
 * The JSON datasets (names, professions, municipalities, …) are inlined
 * into the bundle so the published artifact is self-contained.
 */
export default defineConfig({
  entry: { index: "src/lib/index.ts" },
  format: ["esm", "cjs"],
  // The app tsconfig enables "incremental" (required by Next.js), which
  // the declaration-only compile can't use — override it here.
  dts: { compilerOptions: { incremental: false } },
  // No sourcemaps: they'd be ~4 MB each, dominated by the inlined
  // name/location datasets rather than useful code mappings.
  sourcemap: false,
  clean: true,
  target: "es2022",
  outDir: "dist",
});
