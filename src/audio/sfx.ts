/**
 * Sound effect hooks. Sound and music will be added later; for now every call is a no-op,
 * so the rest of the game can already trigger the right sounds at the right moments.
 */
export type SfxName =
  | 'click'
  | 'correct'
  | 'wrong'
  | 'timeout'
  | 'shoot'
  | 'explode'
  | 'freeze'
  | 'enemyDie'
  | 'baseHit'
  | 'build'
  | 'upgrade'
  | 'sell'
  | 'powerShot'
  | 'waveStart'
  | 'waveCleared'
  | 'victory'
  | 'defeat';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const playSfx = (_name: SfxName): void => {};
