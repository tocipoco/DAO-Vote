import type { NextConfig } from "next";

// Get basePath from environment variable, default to empty string
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig: NextConfig = {
  // Support for GitHub Pages deployment
  basePath: basePath || undefined, // undefined means no basePath (for username.github.io)
  output: process.env.NEXT_EXPORT === 'true' ? 'export' : undefined,
  trailingSlash: true,
  
  // Headers configuration (only used in non-static export mode)
  ...(process.env.NEXT_EXPORT !== 'true' && {
    headers() {
      // Required by FHEVM 
      return Promise.resolve([
        {
          source: '/',
          headers: [
            {
              key: 'Cross-Origin-Opener-Policy',
              value: 'same-origin',
            },
            {
              key: 'Cross-Origin-Embedder-Policy',
              value: 'require-corp',
            },
          ],
        },
      ]);
    }
  }),
  
  // Asset prefix for static assets
  assetPrefix: basePath || undefined,
};

export default nextConfig;

