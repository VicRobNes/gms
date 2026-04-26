/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // The Hono backend in `server/` uses TypeScript ESM `.js` import
    // specifiers — webpack needs to resolve those to their `.ts` sources.
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.js', '.ts'],
      '.jsx': ['.jsx', '.tsx']
    };
    return config;
  }
};

export default nextConfig;
