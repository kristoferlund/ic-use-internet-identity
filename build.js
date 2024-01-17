import esbuild from "esbuild";

esbuild.build({
  entryPoints: ["./src/index.tsx"],
  bundle: true,
  minify: true,
  splitting: true,
  outdir: "dist",
  format: "esm",
  external: ["react", "react-dom"],
  plugins: [],
});
