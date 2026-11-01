module.exports = ({ config }) => {
  const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  return {
    ...config,
    plugins: (config.plugins ?? []).map((plugin) => {
      if (plugin !== 'react-native-maps' || !mapsKey) return plugin;
      return ['react-native-maps', {
        androidGoogleMapsApiKey: mapsKey,
        iosGoogleMapsApiKey: mapsKey,
      }];
    }),
  };
};
