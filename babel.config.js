module.exports = function (api) {
  api.cache.using(() => process.env.NODE_ENV);
  const isProd = process.env.NODE_ENV === 'production';
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      '@babel/plugin-transform-class-static-block',
      'react-native-reanimated/plugin',
      ...(isProd
        ? [
            [
              'babel-plugin-transform-remove-console',
              { exclude: ['error', 'warn'] },
            ],
          ]
        : []),
    ],
  };
};
