import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { adsenseClient, adUnits } from '../ads/ads';

/**
 * An AdSense display unit at a fixed banner size (320×50 on phones, 728×90 on wide
 * screens), in a slot that keeps that height whether or not an ad fills it, so the page
 * never moves. Renders nothing until AdSense is configured.
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
    <View style={[styles.slot, { height: h }]}>
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
