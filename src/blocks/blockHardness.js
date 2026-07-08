/**
 * Minecraft Java hand-mining times (seconds, bare hand).
 * @see https://minecraft.wiki/w/Breaking#Blocks_by_hardness
 */

export const BLOCK_BREAK_SECONDS = {
  lift: 1.2,
  wood: 3.0,
  stone: 7.5,
  engine: 7.5,
  armor: 7.5,
  cannon: 15.0,
  dispenser: 7.5,
  redstone: 1.2,
  control: Infinity
};

export function getBlockBreakSeconds(type, block = null) {
  if (block?.isExtraControl) {
    return 2.0;
  }
  const key = type?.toLowerCase?.() ?? '';
  const seconds = BLOCK_BREAK_SECONDS[key];
  return seconds ?? 3.0;
}

export function isUnbreakableBlock(type, block = null) {
  if (block?.isExtraControl) {
    return false;
  }
  return !Number.isFinite(getBlockBreakSeconds(type, block));
}

/** Crack overlay stage 0–9 (Minecraft destroy stages). */
export function breakProgressToStage(progress) {
  return Math.min(9, Math.floor(progress * 10));
}
