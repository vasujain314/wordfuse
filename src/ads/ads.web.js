/**
 * Web ads: Google AdSense. Set EXPO_PUBLIC_ADSENSE_CLIENT (ca-pub-…) and
 * EXPO_PUBLIC_ADSENSE_BANNER_SLOT to turn them on. Consent in the EEA/UK is handled by
 * AdSense's own "Privacy & messaging" banner, enabled in the AdSense console.
 */
export const adsenseClient = process.env.EXPO_PUBLIC_ADSENSE_CLIENT || null;

export const adUnits = {
  banner: (adsenseClient && process.env.EXPO_PUBLIC_ADSENSE_BANNER_SLOT) || null,
  interstitial: null,
};

let started = null;

/** Loads the AdSense script once (also enables Auto ads if they're on in the console). */
export function initAds() {
  if (started) return started;
  started = Promise.resolve();
  if (!adsenseClient || typeof document === 'undefined') return started;
  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsenseClient)}`;
  document.head.appendChild(script);
  return started;
}

export const useAdsReady = () => Boolean(adsenseClient);

// No programmatic interstitials on the web.
export function noteGameFinished() {}
export const showInterstitialIfDue = () => Promise.resolve(false);
export const adPrivacyOptionsRequired = () => Promise.resolve(false);
export const openAdPrivacyOptions = () => Promise.resolve();
