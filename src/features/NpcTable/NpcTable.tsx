import type { TypeColumns } from '@geovi/the-datagrid';
import { ReactDataGrid } from '@geovi/the-datagrid';
import {
  Badge,
  Center,
  Group,
  HoverCard,
  Loader,
  NumberInput,
  Paper,
  Select,
  Text,
  TextInput,
  Title
} from '@mantine/core';
import { useDebouncedCallback } from "@mantine/hooks"; // 👈 Changed to Callback
import { useMemo, useState } from 'react';
import { DropCell } from "./DropCell.tsx"
import { NPC_COLUMNS } from "./schema.ts";
import { useNpcData } from './useNpcData';

import "@geovi/the-datagrid/style.css";

const StatField = ({ label, value }: { label: string, value: string | number | undefined }) => (
  <div style={{ background: '#f8f9fa', padding: '6px', borderRadius: '4px' }}>
    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>{label}</Text>
    <Text size="sm" fw={500}>{value ?? '-'}</Text>
  </div>
);

const NpcHoverCell = ({ value, data }: { value: any, data: any }) => {
  return (
    <HoverCard
      width={300}
      position="bottom-start"
      withArrow
      shadow="md"
      openDelay={200}
      closeDelay={200}
    >
      <HoverCard.Target >
        <Text fw={600} c="blue.6">
          {value}
        </Text>
      </HoverCard.Target>

      <HoverCard.Dropdown>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <Text fw={700} size="md">{data.name}</Text>
          <Badge color={data.isAggressive ? "red" : "green"}>
            {data.isAggressive ? "Aggressive" : "Passive"}
          </Badge>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <StatField label="HP" value={data.hp}/>
          <StatField label="MP" value={data.mp}/>
          <StatField label="P.Atk" value={data.pAtk}/>
          <StatField label="M.Atk" value={data.mAtk}/>
          <StatField label="P.Def" value={data.pDef}/>
          <StatField label="M.Def" value={data.mDef}/>
        </div>

        <div style={{ marginTop: '12px', borderTop: '1px solid #eee', paddingTop: '8px' }}>
          <Text size="xs" c="dimmed">
            Level: {data.lvl ?? '-'} | Type: {data.type ?? '-'}
          </Text>
        </div>
      </HoverCard.Dropdown>
    </HoverCard>
  );
};


export function NpcTable() {
  const { data, loading } = useNpcData();

  // 1. Only track the FINAL search strings. No more real-time typing state!
  const [searchName, setSearchName] = useState('');
  const [searchItem, setSearchItem] = useState('');

  // Non-typing filters can remain controlled as they don't cause stroke-by-stroke lag
  const [typeFilter, setTypeFilter] = useState<string | null>('warrior');
  const [minLvl, setMinLvl] = useState<number | string>('');
  const [maxLvl, setMaxLvl] = useState<number | string>('');

  // 2. Create the debounced callbacks that update the state after you stop typing
  const handleNameChange = useDebouncedCallback((val: string) => setSearchName(val), 500);
  const handleItemChange = useDebouncedCallback((val: string) => setSearchItem(val), 500);

  // Derive unique types for the dropdown filter
  const types = useMemo(() => Array.from(new Set(data.map(d => d.type))).filter(Boolean).sort(), [data]);

  // Apply filters using the debounced final states
  const filteredData = useMemo(() => {
    let result = data.filter(item => {
      if (searchName && !item.name.toLowerCase().includes(searchName.toLowerCase())) return false;
      if (typeFilter && item.type !== typeFilter) return false;
      if (minLvl !== '' && item.lvl < Number(minLvl)) return false;
      if (maxLvl !== '' && item.lvl > Number(maxLvl)) return false;

      if (searchItem) {
        const query = searchItem.toLowerCase();
        const hasItem = (drops?: any[]) =>
          drops?.some(drop => drop.item.toLowerCase().includes(query));
        if (!hasItem(item.spoil) && !hasItem(item.drop)) return false;
      }
      return true;
    });

    if (searchItem) {
      const query = searchItem.toLowerCase();
      const getMaxChance = (item: any) => {
        const allDrops = [...(item.spoil || []), ...(item.additional_make_list || []), ...(item.drop || [])];
        const matches = allDrops.filter(d => d.item.toLowerCase().includes(query));
        return matches.length > 0 ? Math.max(...matches.map(m => m.chance)) : 0;
      };
      result.sort((a, b) => getMaxChance(b) - getMaxChance(a));
    } else {
      result.sort((a, b) => a.lvl - b.lvl);
    }

    return result;
  }, [data, searchName, typeFilter, searchItem, minLvl, maxLvl]);


  const columns: TypeColumns = useMemo(() => {
    return NPC_COLUMNS.map(col => ({
      name: col.key,
      header: col.label,
      minWidth: 100,
      flex: col.key === 'name' ? 1 : undefined,
      cellStyle: col.key === 'name' ? { padding: 0 } : undefined,
      render: ({ value, data }: any) => {

        // 1. THE POPOVER FOR STATS (Name Column)
        if (col.key === 'name') {
          return <NpcHoverCell data={data} value={value}/>
        }

        // 2. YOUR ORIGINAL DROP/SPOIL LOGIC
        if (col.key === 'spoil' || col.key === 'drop') {
          return <DropCell drops={value} query={searchItem}/>;
        }

        // 3. STANDARD RENDER
        if (col.key === 'type') return <Badge size="sm" variant="dot">{value}</Badge>;
        return <Text size="sm">{value}</Text>;
      },
    }));
  }, [searchItem]);


  const gridViewport = useMemo(() => {
    if (loading) {
      return (
        <Center h="100%">
          <Loader/>
        </Center>
      );
    }
    return (
      <ReactDataGrid
        idProperty="id"
        columns={columns}
        dataSource={filteredData}
        virtualized={true}
        theme="default"
        // rowHeight={80}
        // defaultLimit={10}
        allowMobileTransform
        enableColumnAutosize
      />
    );
  }, [loading, columns, filteredData]);

  return (
    <Paper p="md" shadow="sm" radius="md" withBorder>
      <Title order={3} mb="md">NPC Drops & Spoils</Title>

      <Group mb="md" align="flex-end">
        <TextInput
          label="Search Item"
          placeholder="e.g. animal_bone"
          // 3. Removed 'value' binding so it is completely uncontrolled.
          defaultValue=""
          onChange={(e) => handleItemChange(e.currentTarget.value)}
          flex={2}
        />
        <TextInput
          label="Search by NPC"
          placeholder="e.g. pet_wolf"
          // 4. Removed 'value' binding
          defaultValue=""
          onChange={(e) => handleNameChange(e.currentTarget.value)}
          flex={2}
        />
        <NumberInput
          label="Min Lvl"
          placeholder="0"
          value={minLvl}
          onChange={setMinLvl}
          min={0}
          max={150}
          flex={1}
        />
        <NumberInput
          label="Max Lvl"
          placeholder="100"
          value={maxLvl}
          onChange={setMaxLvl}
          min={0}
          max={150}
          flex={1}
        />
        <Select
          label="Filter by Type"
          placeholder="All types"
          data={types}
          value={typeFilter}
          onChange={setTypeFilter}
          clearable
          searchable
          flex={2}
        />
      </Group>
      <Group mb="md" align="flex-end">
        <Text size="sm" c="dimmed" fw={500} mb={5}>
          Showing <b
          style={{ color: 'var(--mantine-color-blue-filled)' }}>{filteredData.length}</b> / {data.length} monsters
        </Text>
      </Group>

      <div style={{ height: '1000px', width: '100%', overflow: 'hidden' }}>
        {gridViewport}
      </div>
    </Paper>
  );
}