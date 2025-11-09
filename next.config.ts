import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },

  // Performance optimizations (Next.js Performance Features)
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },

  // Compiler options for better performance
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.watchOptions = {
        ignored: ['**/*'], 
      };
    }

    // Production optimizations (Bundle Splitting)
    if (!dev && !isServer) {
      // Optimize chunks for better loading performance
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: 25,
          minSize: 20000,
          cacheGroups: {
            // Vendor chunks
            default: false,
            vendors: false,
            
            // React and Next.js core
            framework: {
              name: 'framework',
              test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
              priority: 40,
              enforce: true,
            },
            
            // UI libraries
            lib: {
              test: /[\\/]node_modules[\\/]/,
              name(module) {
                const packageName = module.context.match(
                  /[\\/]node_modules[\\/](.*?)([\\/]|$)/
                )?.[1];
                return `lib.${packageName?.replace('@', '')}`;
              },
              priority: 30,
            },
            
            // Chart components
            charts: {
              test: /[\\/]components[\\/]charts[\\/]/,
              name: 'charts',
              priority: 20,
              reuseExistingChunk: true,
            },
            
            // UI components
            ui: {
              test: /[\\/]components[\\/]ui[\\/]/,
              name: 'ui-components',
              priority: 15,
              reuseExistingChunk: true,
            },
            
            // Utilities and hooks
            common: {
              name: 'common',
              minChunks: 2,
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
        minimize: true,
      };
    }

    return config;
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  // Image optimization (Next.js Performance Feature)
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Compression (Next.js Performance Feature)
  compress: true,

  // Security headers for performance and reliability
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

// Bundle analyzer - Install with: npm install --save-dev @next/bundle-analyzer
// Run with: ANALYZE=true npm run build to analyze bundle
//export default require('@next/bundle-analyzer')({ enabled: process.env.ANALYZE === 'true' })(nextConfig);

export default nextConfig;
