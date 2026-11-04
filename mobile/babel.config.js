/** @type {import('@babel/core').TransformOptions} */
module.exports = function (api) {
  api.cache(true);
  const isTest = process.env.NODE_ENV === 'test';
  return {
    presets: [
      'babel-preset-expo',
      // nativewind/babel returns a preset object {plugins:[...]}, not a plugin function
      ...(isTest ? [] : ['nativewind/babel']),
    ],
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
      // Reanimated plugin requires react-native-worklets which is unavailable in Jest
      ...(isTest ? [] : ['react-native-reanimated/plugin']),
    ],
  };
};
