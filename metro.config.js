const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The Claude SDK's ES module build has circular imports that crash Metro's
// dev runtime (white screen: "Cannot access ... before initialization").
// Load its CommonJS build instead, which handles the cycle.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@anthropic-ai/sdk' || moduleName.startsWith('@anthropic-ai/sdk/')) {
    return context.resolveRequest(
      { ...context, unstable_conditionNames: ['require', 'react-native'] },
      moduleName,
      platform,
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
