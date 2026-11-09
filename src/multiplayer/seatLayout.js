/**
 * Positions for `count` seats around an ellipse with radii `rx` × `ry` (a circle when they
 * are equal) centred at (cx, cy), clockwise on screen. Seat `bottomSeat` is placed at the
 * bottom (6 o'clock), so each player sees themselves nearest the keyboard.
 * @returns {{ x: number, y: number }[]}
 */
export function seatPositions(count, rx, cx, cy, bottomSeat = 0, ry = rx) {
  return Array.from({ length: count }, (_, seat) => {
    // y grows downwards, so a growing angle runs clockwise on screen.
    const angle = Math.PI / 2 + ((seat - bottomSeat) * 2 * Math.PI) / count;
    return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
  });
}
