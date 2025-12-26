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
    "@icp-sdk/auth",
    "@icp-sdk/core",
  ],
  plugins: [],
});
