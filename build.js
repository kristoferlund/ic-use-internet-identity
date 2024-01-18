import esbuild from "esbuild";

esbuild.build({
  entryPoints: ["./src/index.tsx"],
  bundle: true,
  splitting: true,
  outdir: "dist",
  format: "esm",
  external: ["react", "react-dom"],
  plugins: [],
});
