/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emits .next/standalone with a self-contained server.js and only the
  // node_modules it actually traced, which is what the production Docker
  // image runs. Without this the image would need the full dependency tree.
  output: 'standalone',

  // The SPA talks to a relative /api/v1 and the Next server proxies it to the
  // backend. That keeps everything same-origin -- no CORS preflight in the
  // browser -- and means production needs no separate nginx in front.
  //
  // IMPORTANT: with output: 'standalone', rewrites are resolved during
  // `next build` and frozen into the server bundle -- setting BACKEND_ORIGIN on
  // the running container does nothing. The Docker build therefore passes it as
  // a build arg (see frontend/Dockerfile). The default below is for
  // `npm run dev`, where next.config.js is evaluated at startup.
  async rewrites() {
    const backend = process.env.BACKEND_ORIGIN || 'http://localhost:4000';
    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }];
  },
};

export default nextConfig;
