/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emits .next/standalone with a self-contained server.js and only the
  // node_modules it actually traced, which is what the production Docker
  // image runs. Without this the image would need the full dependency tree.
  output: 'standalone',

  // These ship native bindings / dynamic requires that Next's bundler can't
  // trace (pdfkit's font engine, fontkit, pulls in @swc/helpers exports that
  // don't exist in the version webpack resolves them to when bundled; sharp
  // is a native addon). `standalone` output already copies whatever's
  // actually `require`d from node_modules, so excluding them from bundling
  // and letting Node resolve them normally at runtime is both correct and
  // simpler than fighting the bundler.
  serverExternalPackages: ['pdfkit', 'sharp'],

  // No rewrites: /api/v1/* and /uploads/* are native Route Handlers now
  // (app/api/v1/**, app/uploads/[...path]), served by this same Next
  // server -- there is no separate backend process to proxy to anymore.
};

export default nextConfig;
