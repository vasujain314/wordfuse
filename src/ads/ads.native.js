import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import mobileAds, {
  AdEventType,
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  InterstitialAd,
  MaxAdContentRating,
  TestIds,
} from 'react-native-google-mobile-ads';

import {
  ADS_INTERSTITIAL_EVERY_GAMES,
  ADS_INTERSTITIAL_MIN_GAP_MS,
  ADS_RETRY_MS,
} from '../core/constants';

const ios = Platform.OS === 'ios';

/**
 * Ad unit ids. Development builds always use Google's test units (real ads on your own
 * device can get the account banned). Release builds use the EXPO_PUBLIC_ADMOB_* ids and
 * show nothing for a unit that isn't set.
 */
export const adUnits = __DEV__
  ? { banner: TestIds.ADAPTIVE_BANNER, interstitial: TestIds.INTERSTITIAL }
  : {
      banner:
        (ios
          ? process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS
          : process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID) || null,
      interstitial:
        (ios
          ? process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS
          : process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID) || null,
    };

let ready = false;
let started = null;
const listeners = new Set();

/**
 * Asks for consent where the law needs it (Google's UMP form: EEA, UK, some US states),
 * then starts the SDK. Safe to call more than once; failures just mean no ads.
 */
export function initAds() {
  if (started) return started;
  if (!adUnits.banner && !adUnits.interstitial) {
    started = Promise.resolve();
    return started;
  }
  started = (async () => {
    try {
      await AdsConsent.requestInfoUpdate();
      await AdsConsent.loadAndShowConsentFormIfRequired();
    } catch {
      // Offline or form error: fall back to the consent stored from last time.
    }
    const { canRequestAds } = await AdsConsent.getConsentInfo();
    if (!canRequestAds) return;
    await mobileAds().setRequestConfiguration({ maxAdContentRating: MaxAdContentRating.PG });
    await mobileAds().initialize();
    ready = true;
    listeners.forEach((l) => l());
    loadInterstitial();
  })().catch(() => {});
  return started;
}

/** True once ads may be requested (SDK started and consent allows it). */
export function useAdsReady() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => ready,
  );
}

// Interstitial: one preloaded ad, shown between solo games only.
let interstitial = null;
let loaded = false;
let onClosed = null;
let gamesSinceAd = 0;
let lastShownAt = 0;

function loadInterstitial() {
  if (!adUnits.interstitial || interstitial) return;
  const ad = InterstitialAd.createForAdRequest(adUnits.interstitial);
  const finish = () => {
    loaded = false;
    onClosed?.();
    onClosed = null;
  };
  ad.addAdEventListener(AdEventType.LOADED, () => {
    loaded = true;
  });
  ad.addAdEventListener(AdEventType.CLOSED, () => {
    finish();
    ad.load();
  });
  ad.addAdEventListener(AdEventType.ERROR, () => {
    finish();
    setTimeout(() => ad.load(), ADS_RETRY_MS);
  });
  interstitial = ad;
  ad.load();
}

/** Counts a finished solo game towards the next interstitial. */
export function noteGameFinished() {
  gamesSinceAd += 1;
}

/**
 * Shows the interstitial when one is due and loaded. Resolves when it is closed (or at
 * once when nothing is shown), so the next game never starts behind an ad.
 * @returns {Promise<boolean>} whether an ad was shown
 */
export function showInterstitialIfDue() {
  const due =
    ready &&
    loaded &&
    gamesSinceAd >= ADS_INTERSTITIAL_EVERY_GAMES &&
    Date.now() - lastShownAt >= ADS_INTERSTITIAL_MIN_GAP_MS;
  if (!due) return Promise.resolve(false);
  gamesSinceAd = 0;
  lastShownAt = Date.now();
  return new Promise((resolve) => {
    onClosed = () => resolve(true);
    interstitial.show().catch(() => {
      onClosed = null;
      resolve(false);
    });
  });
}

/** True when the user must be offered a way to change their ad consent (GDPR). */
export async function adPrivacyOptionsRequired() {
  try {
    const info = await AdsConsent.getConsentInfo();
    return (
      info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
    );
  } catch {
    return false;
  }
}

/** Reopens Google's consent form so the user can change their choice. */
export function openAdPrivacyOptions() {
  return AdsConsent.showPrivacyOptionsForm().catch(() => {});
}
