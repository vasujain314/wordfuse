jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Google Mobile Ads is a native module; tests get an inert stand-in.
jest.mock('react-native-google-mobile-ads', () => {
  const ad = () => ({
    addAdEventListener: jest.fn(),
    load: jest.fn(),
    show: jest.fn(async () => {}),
  });
  return {
    __esModule: true,
    default: () => ({
      initialize: jest.fn(async () => []),
      setRequestConfiguration: jest.fn(async () => {}),
    }),
    AdEventType: { LOADED: 'loaded', CLOSED: 'closed', ERROR: 'error' },
    AdsConsent: {
      requestInfoUpdate: jest.fn(async () => ({})),
      loadAndShowConsentFormIfRequired: jest.fn(async () => ({})),
      getConsentInfo: jest.fn(async () => ({ canRequestAds: false })),
      showPrivacyOptionsForm: jest.fn(async () => ({})),
    },
    AdsConsentPrivacyOptionsRequirementStatus: { REQUIRED: 'REQUIRED' },
    BannerAd: () => null,
    BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER' },
    InterstitialAd: { createForAdRequest: jest.fn(ad) },
    MaxAdContentRating: { PG: 'PG' },
    TestIds: { ADAPTIVE_BANNER: 'test-banner', INTERSTITIAL: 'test-interstitial' },
  };
});
