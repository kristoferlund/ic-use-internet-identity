import esbuild from "esbuild";

void esbuild.build({
  entryPoints: ["./src/index.tsx"],
  bundle: true,
  splitting: true,
  outdir: "dist",
  format: "esm",
  external: [
    "react",
    "react-dom",
    "@dfinity/agent",
    "@dfinity/auth-client",
    "@dfinity/identity",
  ],
  plugins: [],
});
