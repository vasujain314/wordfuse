// Adds the Google Mobile Ads plugin on top of app.json. The AdMob *app* ids are build-time
// settings (they go into AndroidManifest.xml / Info.plist), so they come from environment
// variables: ADMOB_ANDROID_APP_ID and ADMOB_IOS_APP_ID (set them in EAS env vars).
// Without them, Google's sample app ids are used — the SDK needs an id to start, and the
// release build then shows no ads because no ad units are configured.
const SAMPLE_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const SAMPLE_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: process.env.ADMOB_ANDROID_APP_ID || SAMPLE_ANDROID_APP_ID,
        iosAppId: process.env.ADMOB_IOS_APP_ID || SAMPLE_IOS_APP_ID,
        // Don't start Google's measurement before the consent form has run.
        delayAppMeasurementInit: true,
        // Shown only if the IDFA explainer is turned on in AdMob's Privacy & messaging.
        userTrackingUsageDescription:
          'This lets Google show you ads that are more relevant to you. Word Fuse never sees this identifier.',
        // Google's own SKAdNetwork id (add partner ids here if you enable mediation).
        skAdNetworkItems: ['cstr6suwn9.skadnetwork'],
      },
    ],
  ],
});
