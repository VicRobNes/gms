/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: false,
    externalDir: true
  },
  webpack: (config) => {
    // Allow `.js` import specifiers in TypeScript files (the ESM convention
    // used by the Hono backend in /src) to resolve to their `.ts` sources.
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.js', '.ts'],
      '.jsx': ['.jsx', '.tsx']
    };
    return config;
  }
};

export default nextConfig;
