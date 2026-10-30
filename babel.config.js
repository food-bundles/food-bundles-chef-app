/** @type {import('@babel/core').TransformOptions} */
module.exports = function (api) {
  api.cache(true);
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
      'nativewind/babel',
      'react-native-reanimated/plugin',
      // react-native-reanimated/plugin must always be last
    ],
  };
};
