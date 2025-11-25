import { defineConfig } from "tsup"

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    outDir: "dist",
    dts: {
        entry: "src/index.ts"
    },
    sourcemap: false,
    clean: true,
    splitting: false,
    minify: false,
    target: "es2020",
    shims: false
})