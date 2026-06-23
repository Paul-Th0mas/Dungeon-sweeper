import { AxialCoord } from '../types';

export const DIRECTIONS: AxialCoord[] = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
];

export function getNeighbors(coord: AxialCoord): AxialCoord[] {
  return DIRECTIONS.map(d => ({
    q: coord.q + d.q,
    r: coord.r + d.r
  }));
}

export function coordToString(coord: AxialCoord): string {
  return `${coord.q},${coord.r}`;
}

export function stringToCoord(s: string): AxialCoord {
  const [q, r] = s.split(',').map(Number);
  return { q, r };
}

export function getDistance(a: AxialCoord, b: AxialCoord): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

// For rendering: Pointy-top hexes
// x = size * (sqrt(3) * q + sqrt(3)/2 * r)
// y = size * (3/2 * r)
export function axialToPixel(coord: AxialCoord, size: number): { x: number, y: number } {
  const x = size * (Math.sqrt(3) * coord.q + (Math.sqrt(3) / 2) * coord.r);
  const y = size * (1.5 * coord.r);
  return { x, y };
}
