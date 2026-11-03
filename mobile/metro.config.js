const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Exclude nested node_modules from resolution to reduce the file graph
// Metro needs to traverse. On Windows without Watchman this also reduces
// the number of fs.watch handles opened during the initial scan.
config.resolver = {
  ...config.resolver,
  blockList: [
    new RegExp(
      `${path.resolve(__dirname, 'node_modules').replace(/\\/g, '\\\\')}[\\\\].*[\\\\]node_modules`,
    ),
  ],
};

module.exports = withNativeWind(config, { input: './src/global.css' });
