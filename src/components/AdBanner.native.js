import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { adUnits, useAdsReady } from '../ads/ads';

/** An anchored adaptive banner; takes no space until an ad has loaded. */
export function AdBanner() {
  const ready = useAdsReady();
  const [failed, setFailed] = useState(false);
  if (!ready || !adUnits.banner || failed) return null;
  return (
    <View style={styles.slot}>
      <BannerAd
        unitId={adUnits.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({ slot: { alignItems: 'center', width: '100%' } });
