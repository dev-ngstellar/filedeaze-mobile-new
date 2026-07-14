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

module.exports = config;
