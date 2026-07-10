import { useState, useMemo } from 'react';
import { DataTable } from 'mantine-datatable';
import { TextInput, MultiSelect, Select, Stack, Text, Badge, Group, Paper, Title } from '@mantine/core';
import type { DropItem, NpcData } from "./types.ts"
import { useNpcData } from './useNpcData';

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
}