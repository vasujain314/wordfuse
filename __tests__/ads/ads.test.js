import { AdsConsent, InterstitialAd } from 'react-native-google-mobile-ads';

/** Loads a fresh copy of the ads module (it keeps module-level state). */
function loadAds() {
  let ads;
  jest.isolateModules(() => {
    ads = require('../../src/ads/ads');
  });
  return ads;
}

/** Starts ads with consent granted and returns the interstitial's event emitter. */
async function startWithLoadedInterstitial(ads) {
  const handlers = {};
  const ad = {
    addAdEventListener: jest.fn((type, fn) => {
      handlers[type] = fn;
    }),
    load: jest.fn(),
    show: jest.fn(async () => {}),
  };
  InterstitialAd.createForAdRequest.mockReturnValueOnce(ad);
  AdsConsent.getConsentInfo.mockResolvedValueOnce({ canRequestAds: true });
  await ads.initAds();
  handlers.loaded();
  return { ad, handlers };
}

describe('interstitial pacing', () => {
  it('no ads at all without consent', async () => {
    const ads = loadAds();
    await ads.initAds();
    for (let i = 0; i < 5; i += 1) ads.noteGameFinished();
    await expect(ads.showInterstitialIfDue()).resolves.toBe(false);
  });

  it('shows after every 3rd game and resolves only when closed', async () => {
    const ads = loadAds();
    const { ad, handlers } = await startWithLoadedInterstitial(ads);
    ads.noteGameFinished();
    ads.noteGameFinished();
    await expect(ads.showInterstitialIfDue()).resolves.toBe(false);
    ads.noteGameFinished();
    let closed = false;
    const shown = ads.showInterstitialIfDue().then((v) => {
      closed = true;
      return v;
    });
    await Promise.resolve();
    expect(ad.show).toHaveBeenCalledTimes(1);
    expect(closed).toBe(false); // the next game waits behind the ad
    handlers.closed();
    await expect(shown).resolves.toBe(true);
    expect(ad.load).toHaveBeenCalledTimes(2); // preloads the next one
  });

  it('at most one ad every 2 minutes', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const ads = loadAds();
    const { handlers } = await startWithLoadedInterstitial(ads);
    for (let i = 0; i < 3; i += 1) ads.noteGameFinished();
    const first = ads.showInterstitialIfDue();
    handlers.closed();
    await first;
    handlers.loaded();
    for (let i = 0; i < 3; i += 1) ads.noteGameFinished();
    now.mockReturnValue(1_000_000 + 60_000);
    await expect(ads.showInterstitialIfDue()).resolves.toBe(false);
    now.mockReturnValue(1_000_000 + 121_000);
    const second = ads.showInterstitialIfDue();
    handlers.closed();
    await expect(second).resolves.toBe(true);
    now.mockRestore();
  });
});
