export interface DropItem {
  item: string;
  min_drop: number;
  max_drop: number;
  chance: number;
}

export interface NpcData {
  id: string;
  type: string;
  lvl: number;
  name: string;
  spoil: DropItem[];
  drop: DropItem[];
}