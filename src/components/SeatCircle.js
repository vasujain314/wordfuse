import { StyleSheet, View } from 'react-native';

import { seatPositions } from '../multiplayer/seatLayout';
import { PlayerSeat, SEAT_SIZE } from './PlayerSeat';
import { TurnPointer } from './TurnPointer';

const COMPACT_BELOW = 300; // use smaller chips when the area is this small
const GAP = 12;

/** Chip size and ring diameter for a seat area of `width` × `height`. */
export function seatGeometry(width, height) {
  const compact = Math.min(width, height) < COMPACT_BELOW;
  const chip = compact ? SEAT_SIZE.compact : SEAT_SIZE.regular;
  const ring = Math.max(64, Math.min(width - chip.width * 2 - GAP, height - chip.height * 2 - GAP));
  return { compact, chip, ring };
}

/**
 * Players seated clockwise around the board, with this device's player at the bottom.
 * Seats sit on an ellipse that fills the area, so 8 players fit on small phones too.
 * `children` (the countdown ring) go in the middle.
 */
export function SeatCircle({
  width,
  height,
  room,
  myPid,
  presence,
  flash,
  ringSize,
  danger,
  reduceMotion,
  children,
}) {
  const { compact, chip } = seatGeometry(width, height);
  const players = [...room.players].sort((a, b) => a.seat - b.seat);
  const mySeat = players.find((p) => p.pid === myPid)?.seat ?? 0;
  const rx = width / 2 - chip.width / 2 - 2;
  const ry = height / 2 - chip.height / 2 - 2;
  const positions = seatPositions(players.length, rx, width / 2, height / 2, mySeat, ry);
  const activePid = room.phase === 'turn' || room.phase === 'resolving' ? room.turn?.pid : null;
  const activeIndex = players.findIndex((p) => p.pid === activePid);
  const pointerAngle =
    activeIndex < 0
      ? null
      : (Math.atan2(positions[activeIndex].y - height / 2, positions[activeIndex].x - width / 2) *
          180) /
        Math.PI;
  return (
    <View style={{ width, height }}>
      {/* Pointer and ring are placed with explicit offsets (not flex centring), so they sit
          exactly in the middle on every platform. */}
      <TurnPointer
        size={ringSize}
        centerX={width / 2}
        centerY={height / 2}
        angle={pointerAngle}
        danger={danger}
        reduceMotion={reduceMotion}
      />
      <View
        pointerEvents="box-none"
        style={[
          styles.center,
          {
            left: (width - ringSize) / 2,
            top: (height - ringSize) / 2,
            width: ringSize,
            height: ringSize,
          },
        ]}
      >
        {children}
      </View>
      {players.map((player, i) => (
        <PlayerSeat
          key={player.pid}
          player={player}
          x={positions[i].x}
          y={positions[i].y}
          compact={compact}
          active={player.pid === activePid}
          isMe={player.pid === myPid}
          isHost={player.pid === room.hostPid}
          away={!presence.includes(player.pid)}
          flashKey={flash?.pid === player.pid ? flash.key : 0}
          flashTone={flash?.tone}
          maxLives={room.settings.lives}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute' },
});
