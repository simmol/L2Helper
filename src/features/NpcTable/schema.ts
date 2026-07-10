// schema.ts
export const NPC_COLUMNS = [
  {
    key: 'name', label: 'Name',
    transform: (val: any) => val?.replace(/^\[|]$/g, '') || ''
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
    transform: (val: any) => val || []
  },
  {
    key: 'additional_make_list', label: 'Additional Make',
    transform: (val: any) => val || []
  },
  {
    key: 'additional_make_multi_list', label: 'Additional Multi',
    transform: (val: any) => val || []
  }
];