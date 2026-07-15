import { describe, expect, it } from 'vitest';
import { NPC_COLUMNS } from './schema';

const getColumn = (key: string) => NPC_COLUMNS.find((c) => c.key === key)!;

describe('NPC_COLUMNS', () => {
  it('cleans underscores and brackets from names', () => {
    expect(getColumn('name').transform('[Fallen_Orc_Archer]', {})).toBe('Fallen Orc Archer');
  });

  it('falls back to raw.level when lvl is missing', () => {
    expect(getColumn('lvl').transform(undefined, { level: '42' })).toBe(42);
  });

  it('cleans item names inside drop/spoil lists', () => {
    const raw = [{ item: '[Animal_Bone]', min_drop: 1, max_drop: 1, chance: 50 }];
    expect(getColumn('drop').transform(raw, {})).toEqual([
      { item: 'Animal Bone', min_drop: 1, max_drop: 1, chance: 50 },
    ]);
  });

  it('returns an empty array for non-array drop values', () => {
    expect(getColumn('spoil').transform(null, {})).toEqual([]);
  });
});
