/** Shared surface for the paper mesh and the HTML strips riding on it. */
export function pageTurnPoint(x: number, progress: number, direction: 1 | -1) {
  const t = Math.max(0, Math.min(1, progress));
  const eased = t * t * (3 - 2 * t);
  const angle = -Math.PI * (direction === 1 ? eased : 1 - eased);
  const amplitude = Math.sin(t * Math.PI) * 0.3;
  const curl = amplitude * Math.sin(x / 2.76 * Math.PI);
  const slope = amplitude * Math.PI / 2.76 * Math.cos(x / 2.76 * Math.PI);
  return {
    x: x * Math.cos(angle) + curl * Math.sin(angle),
    z: -x * Math.sin(angle) + curl * Math.cos(angle),
    tangent: angle - Math.atan(slope),
    stretch: Math.sqrt(1 + slope * slope),
  };
}
