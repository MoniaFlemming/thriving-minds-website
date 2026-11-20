import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';
import { SITE_ORIGIN, robotsTxt, sitemapXml } from './scripts/seo-routes.mjs';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    'PORT environment variable is required but was not provided.',
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    'BASE_PATH environment variable is required but was not provided.',
  );
}

function crawlFilesPlugin(): Plugin {
  return {
    name: 'thriving-minds-crawl-files',
    transformIndexHtml(html, context) {
      const robots = context.server ? 'noindex, follow' : 'index, follow';
      let transformed = html
        .replace(/<meta name="robots" content="[^"]*"\s*\/>/, `<meta name="robots" content="${robots}" />`)
        .replace(/https:\/\/thrivingmindsconsulting\.com/g, SITE_ORIGIN);
      const verification = process.env.VITE_GOOGLE_SITE_VERIFICATION?.trim();
      if (verification) {
        transformed = transformed.replace(
          '</head>',
          `    <meta name="google-site-verification" content="${verification.replace(/"/g, '&quot;')}" />\n  </head>`,
        );
      }
      return transformed;
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = request.url?.split('?')[0];
        if (pathname === '/robots.txt') {
          response.statusCode = 200;
          response.setHeader('Content-Type', 'text/plain; charset=utf-8');
          response.end(robotsTxt());
          return;
        }
        if (pathname === '/sitemap.xml') {
          response.statusCode = 200;
          response.setHeader('Content-Type', 'application/xml; charset=utf-8');
          response.end(sitemapXml());
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(async ({ mode }) => ({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    crawlFilesPlugin(),
    ...(mode === 'development' ? [runtimeErrorOverlay()] : []),
    ...(mode === 'development' && process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
}));
