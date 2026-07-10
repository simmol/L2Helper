// schema.ts
// Helper: Cleans names by removing underscores and surrounding brackets
const cleanName = (val: string) => {
  if (typeof val !== 'string') return val;
  return val
    .replace(/_/g, ' ')
    .replace(/^\[|\]$/g, '');
};

// Helper: Specifically for cleaning lists of items
const cleanDropList = (list: any[]) => {
  if (!Array.isArray(list)) return [];
  return list.map(itemObj => ({
    ...itemObj,
    item: cleanName(itemObj.item)
  }));
};

export const NPC_COLUMNS = [
  {
    key: 'name', label: 'Name',
    transform: (val: any) => cleanName(val)
  },
  {
    key: 'lvl', label: 'Lvl',
    transform: (val: any, raw: any) => parseInt(val ?? raw.level ?? '0', 10)
  },
  {
    key: 'type', label: 'Type',
    transform: (val: any) => val || ''
  },
  {
    key: 'spoil', label: 'Spoils',
    transform: (val: any) => cleanDropList(val)
  },
  // {
  //   key: 'additional_make_list', label: 'Additional Make',
  //   transform: (val: any) => val || []
  // },
  {
    key: 'drop', label: 'Drops',
    transform: (val: any) => cleanDropList(val)
  }
];