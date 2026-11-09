import { Canvas, useClock } from '@shopify/react-native-skia';
import { StyleSheet, View } from 'react-native';

import { FuseTimer } from './FuseTimer';
import { ParticleBurst } from './ParticleBurst';
import { Vignette } from './Vignette';

/**
 * The game's single Skia canvas: vignette, fuse with sparks, and pooled particles.
 * It covers the screen and ignores touches.
 */
export function GameCanvas({ width, height, fuse, progress, effects, reduceMotion }) {
  const clock = useClock();
  if (width <= 0 || height <= 0) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Vignette
          width={width}
          height={height}
          progress={progress}
          clock={clock}
          reduceMotion={reduceMotion}
        />
        {fuse ? (
          <FuseTimer
            x0={fuse.x0}
            x1={fuse.x1}
            y={fuse.y}
            progress={progress}
            clock={clock}
            reduceMotion={reduceMotion}
          />
        ) : null}
        {reduceMotion ? null : (
          <ParticleBurst
            t={effects.burstT}
            origin={effects.burstOrigin}
            mode={effects.burstMode}
            color={effects.burstColor}
            width={width}
            height={height}
          />
        )}
      </Canvas>
    </View>
  );
}
