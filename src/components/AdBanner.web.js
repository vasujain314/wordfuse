import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { adsenseClient, adUnits } from '../ads/ads';

/**
 * An AdSense display unit at a fixed banner size (320×50 on phones, 728×90 on wide
 * screens), so an ad can never push the page around. Renders nothing until AdSense is
 * configured; an unfilled slot is hidden by a rule in public/index.html.
 */
export function AdBanner() {
  const slot = adUnits.banner;
  const { width } = useWindowDimensions();
  const [w, h] = width >= 760 ? [728, 90] : [320, 50];
  useEffect(() => {
    if (!slot) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Blocked by an ad blocker or not yet loaded: leave the slot empty.
    }
  }, [slot, w]);
  if (!slot) return null;
  return (
    <View style={styles.slot}>
      <ins
        // A new element when the size changes, since AdSense fills each one only once.
        key={w}
        className="adsbygoogle"
        style={{ display: 'inline-block', width: w, height: h }}
        data-ad-client={adsenseClient}
        data-ad-slot={slot}
        {...(__DEV__ ? { 'data-adtest': 'on' } : null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({ slot: { alignItems: 'center', width: '100%' } });
