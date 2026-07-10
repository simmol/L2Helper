export interface DropItem {
  item: string;
  min_drop: number;
  max_drop: number;
  chance: number;
}

export interface NpcData {
  id: string;
  type: string;
  name: string;
  spoil: DropItem[];
  additional_make_list: DropItem[];
  additional_make_multi_list: DropItem[];
}