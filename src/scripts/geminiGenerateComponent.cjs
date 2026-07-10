const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'features', 'NpcTable');

if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

const files = {
    'types.ts': `export interface DropItem {
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
}`,

    'useNpcData.ts': `import { useState, useEffect } from 'react';
import { NpcData } from './types';

export function useNpcData() {
  const [data, setData] = useState<NpcData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const CACHE_KEY = 'npc-data-parsed-minified';
        const cached = localStorage.getItem(CACHE_KEY);
        
        if (cached) {
          setData(JSON.parse(cached));
          setLoading(false);
          return;
        }

        // Dynamically import to prevent Vite from blocking initial page load with a huge JSON
        const rawModule = await import('../../../data/npcdata_parsed.json');
        const rawData = rawModule.default || rawModule;

        // Map and clean only the required columns to keep the size well under the 5MB LocalStorage limit
        const stripped: NpcData[] = rawData.map((npc: any) => ({
          id: npc.id || crypto.randomUUID(),
          type: npc.type || '',
          name: npc.name ? npc.name.replace(/^\\[|\\]$/g, '') : '', // Strip []
          spoil: npc.spoil || [],
          additional_make_list: npc.additional_make_list || [],
          additional_make_multi_list: npc.additional_make_multi_list || []
        }));

        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(stripped));
        } catch (storageError) {
          console.warn('LocalStorage is full or disabled:', storageError);
        }

        setData(stripped);
      } catch (error) {
        console.error("Failed to load NPC data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  return { data, loading };
}`,

    'NpcTable.tsx': `import { useState, useMemo } from 'react';
import { DataTable } from 'mantine-datatable';
import { TextInput, MultiSelect, Select, Stack, Text, Badge, Group, Paper, Title } from '@mantine/core';
import { useNpcData } from './useNpcData';
import { DropItem, NpcData } from './types';

const ALL_COLUMNS = [
  { id: 'name', label: 'Name' },
  { id: 'type', label: 'Type' },
  { id: 'spoil', label: 'Spoils' },
  { id: 'additional_make_list', label: 'Additional Make' },
  { id: 'additional_make_multi_list', label: 'Additional Multi' },
];

export function NpcTable() {
  const { data, loading } = useNpcData();
  
  const [visibleColumns, setVisibleColumns] = useState<string[]>(ALL_COLUMNS.map(c => c.id));
  const [nameFilter, setNameFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  // Derive unique types for the dropdown filter
  const types = useMemo(() => Array.from(new Set(data.map(d => d.type))).filter(Boolean).sort(), [data]);

  // Apply filters
  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (nameFilter && !item.name.toLowerCase().includes(nameFilter.toLowerCase())) return false;
      if (typeFilter && item.type !== typeFilter) return false;
      return true;
    });
  }, [data, nameFilter, typeFilter]);

  // Helper to render lists of items
  const renderDrops = (drops?: DropItem[]) => {
    if (!drops || drops.length === 0) return <Text size="sm" c="dimmed">-</Text>;
    return (
      <Stack gap={4}>
        {drops.map((d, i) => (
          <Group key={i} gap="xs" wrap="nowrap">
            <Badge size="sm" variant="light" w={65}>{d.chance}%</Badge>
            <Text size="sm">{d.item} ({d.min_drop} - {d.max_drop})</Text>
          </Group>
        ))}
      </Stack>
    );
  };

  const columns = [
    {
      accessor: 'name',
      title: 'Name',
      render: (record: NpcData) => <Text fw={500}>{record.name}</Text>,
    },
    {
      accessor: 'type',
      title: 'Type',
      render: (record: NpcData) => <Badge color="blue">{record.type}</Badge>
    },
    {
      accessor: 'spoil',
      title: 'Spoils',
      render: (record: NpcData) => renderDrops(record.spoil),
    },
    {
      accessor: 'additional_make_list',
      title: 'Additional Make',
      render: (record: NpcData) => renderDrops(record.additional_make_list),
    },
    {
      accessor: 'additional_make_multi_list',
      title: 'Additional Multi',
      render: (record: NpcData) => renderDrops(record.additional_make_multi_list),
    }
  ].filter(col => visibleColumns.includes(col.accessor));

  return (
    <Paper p="md" shadow="sm" radius="md" withBorder>
      <Title order={3} mb="md">NPC Drops & Spoils</Title>
      
      <Group mb="md" align="flex-end">
        <TextInput
          label="Search by Name"
          placeholder="e.g. pet_wolf"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.currentTarget.value)}
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
          flex={1}
        />
        <MultiSelect
          label="Visible Columns"
          data={ALL_COLUMNS.map(c => ({ value: c.id, label: c.label }))}
          value={visibleColumns}
          onChange={setVisibleColumns}
          clearable={false}
          flex={1}
        />
      </Group>

      <DataTable
        withTableBorder
        withColumnBorders
        striped
        highlightOnHover
        minHeight={400}
        fetching={loading}
        records={filteredData}
        columns={columns}
        idAccessor="id"
      />
    </Paper>
  );
}`,

    'index.ts': `export { NpcTable } from './NpcTable';`
};

for (const [filename, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, filename), content);
}

console.log('✅ Successfully created module at src/features/NpcTable');