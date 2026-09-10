const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// ── Web-platform stubs for native-only packages ───────────────────────────────
// @react-native-firebase uses `import.meta` which Metro's web bundler cannot
// handle. When bundling for web we redirect these imports to no-op stubs so
// the rest of the app can still render.
const firebaseStubs = {
  '@react-native-firebase/app': path.resolve(__dirname, 'src/stubs/firebase-app.web.js'),
  '@react-native-firebase/messaging': path.resolve(__dirname, 'src/stubs/firebase-messaging.web.js'),
};

const zustandStubs = {
  'zustand': path.resolve(__dirname, 'node_modules/zustand/index.js'),
  'zustand/middleware': path.resolve(__dirname, 'node_modules/zustand/middleware.js'),
};

const originalResolver = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    if (firebaseStubs[moduleName]) {
      console.log(`[Metro Resolver] Redirecting Firebase module ${moduleName} to stub`);
      return {
        filePath: firebaseStubs[moduleName],
        type: 'sourceFile',
      };
    }
    if (zustandStubs[moduleName]) {
      console.log(`[Metro Resolver] Redirecting ${moduleName} to CommonJS: ${zustandStubs[moduleName]}`);
      return {
        filePath: zustandStubs[moduleName],
        type: 'sourceFile',
      };
    }
  }
  if (originalResolver) {
    return originalResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};
// ─────────────────────────────────────────────────────────────────────────────

// ── Web Dev API Proxy Middleware ─────────────────────────────────────────────
// When developing the mobile app on web (localhost:8081 / localhost:19006),
// browser CORS blocks requests to api-fieldeaze.ngstellar.com.
// This proxy transparently forwards /api/v1/* requests from the browser to the backend
// using the whitelisted origin (https://fieldeaze-dev.vercel.app), completely avoiding CORS errors.
const https = require('https');

config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware) => {
    return (req, res, next) => {
      if (req.url && req.url.startsWith('/api/v1')) {
        if (req.method === 'OPTIONS') {
          res.writeHead(200, {
            'Access-Control-Allow-Origin': req.headers.origin || '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': req.headers['access-control-request-headers'] || '*',
            'Access-Control-Allow-Credentials': 'true',
          });
          return res.end();
        }

        const clientHeaders = { ...req.headers };
        delete clientHeaders.host;
        clientHeaders.origin = 'https://fieldeaze-dev.vercel.app';
        clientHeaders.referer = 'https://fieldeaze-dev.vercel.app/';

        const proxyReq = https.request(
          {
            hostname: 'api-fieldeaze.ngstellar.com',
            port: 443,
            path: req.url,
            method: req.method,
            headers: clientHeaders,
          },
          (proxyRes) => {
            const resHeaders = { ...proxyRes.headers };
            resHeaders['access-control-allow-origin'] = req.headers.origin || '*';
            resHeaders['access-control-allow-credentials'] = 'true';
            res.writeHead(proxyRes.statusCode, resHeaders);
            proxyRes.pipe(res, { end: true });
          }
        );

        proxyReq.on('error', (err) => {
          console.error('[Metro API Proxy Error]:', err.message);
          if (!res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Proxy Error', message: err.message }));
          }
        });

        req.pipe(proxyReq, { end: true });
        return;
      }

      return metroMiddleware(req, res, next);
    };
  },
};

module.exports = config;
