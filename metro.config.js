const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Redirect 'three' to 'three/build/three.module.js' to bypass 'build/three.cjs'
// which calls process.emitWarning(...) at module load (fatal in Hermes / React Native
// where process.emitWarning is undefined).
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/three/build/three.module.js'),
      type: 'sourceFile',
    };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
