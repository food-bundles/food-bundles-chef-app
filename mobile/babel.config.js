/** @type {import('@babel/core').TransformOptions} */
module.exports = function (api) {
  api.cache(true);
  const isTest = process.env.NODE_ENV === 'test';
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
          },
        },
      ],
      // nativewind/babel adds null + reanimated plugin which breaks Jest; skip in test
      ...(isTest ? [] : ['nativewind/babel']),
      // Reanimated plugin requires react-native-worklets which is unavailable in Jest
      ...(isTest ? [] : ['react-native-reanimated/plugin']),
    ],
  };
};
