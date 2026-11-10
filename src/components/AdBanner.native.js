import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { adUnits, useAdsReady } from '../ads/ads';

// Standard 320×50 banner in a slot of exactly that height. The slot is there from the first
// frame and keeps its size whether the ad loads, fails or is still waiting for consent, so
// nothing on the screen ever moves (an adaptive banner's height isn't known in advance).
const SLOT_HEIGHT = 50;

/** A banner ad in a fixed slot; renders nothing when no banner unit is configured. */
export function AdBanner() {
  const ready = useAdsReady();
  const [failed, setFailed] = useState(false);
  if (!adUnits.banner) return null;
  return (
    <View style={styles.slot}>
      {ready && !failed ? (
        <BannerAd
          unitId={adUnits.banner}
          size={BannerAdSize.BANNER}
          onAdFailedToLoad={() => setFailed(true)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { height: SLOT_HEIGHT, width: '100%', alignItems: 'center', justifyContent: 'center' },
});
