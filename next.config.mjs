/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Playwright ships native binaries that must not be bundled by webpack.
    serverComponentsExternalPackages: ["playwright", "playwright-core"],
  },
};

export default nextConfig;
