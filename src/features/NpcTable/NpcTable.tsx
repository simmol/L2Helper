import type { TypeColumns } from '@geovi/the-datagrid';
import { ReactDataGrid } from '@geovi/the-datagrid';
import {
  Badge,
  Box,
  Center,
  Group,
  Loader,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title
} from '@mantine/core';
import { useMemo, useState } from 'react';
import { NPC_COLUMNS } from "./schema.ts"
import type { DropItem } from './types';
import { useNpcData } from './useNpcData';

import "@geovi/the-datagrid/style.css";

export function NpcTable() {
  const { data, loading } = useNpcData();

  const [nameFilter, setNameFilter] = useState('');
  const [itemFilter, setItemFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>('warrior');
  const [minLvl, setMinLvl] = useState<number | string>('');
  const [maxLvl, setMaxLvl] = useState<number | string>('');

  // Derive unique types for the dropdown filter
  const types = useMemo(() => Array.from(new Set(data.map(d => d.type))).filter(Boolean).sort(), [data]);

  // Apply filters
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // 1. Name Filter
      if (nameFilter && !item.name.toLowerCase().includes(nameFilter.toLowerCase())) return false;

      // 2. Type Filter
      if (typeFilter && item.type !== typeFilter) return false;

      // 3. Level Filters
      if (minLvl !== '' && item.lvl < Number(minLvl)) return false;
      if (maxLvl !== '' && item.lvl > Number(maxLvl)) return false;

      // 4. Item Filter
      if (itemFilter) {
        const query = itemFilter.toLowerCase();
        const hasItem = (drops?: DropItem[]) =>
          drops?.some(drop => drop.item.toLowerCase().includes(query));

        if (!hasItem(item.spoil) && !hasItem(item.additional_make_list) && !hasItem(item.additional_make_multi_list)) {
          return false;
        }
      }

      return true;
    });
  }, [data, nameFilter, typeFilter, itemFilter, minLvl, maxLvl]);

  const renderDrops = (drops?: DropItem[], query?: string) => {
    if (!drops || drops.length === 0) return <Text size="sm" c="dimmed">-</Text>;

    const isMatch = (itemName: string) =>
      query && itemName.toLowerCase().includes(query.toLowerCase());

    // Helper to format chance:
    // parseFloat ensures we don't show trailing zeros (e.g., 5.0000 -> 5)
    // .toFixed(4) forces up to 4 digits if decimals exist
    const formatChance = (chance: number) => parseFloat(chance.toFixed(4));

    const formatDropSize = (min: number, max: number) => (min == max) ? <>{min}</> : <>{min} - {max}</>
    return (
      <Stack gap={4} py="xs">
        {drops.map((d, i) => (
          <Group key={i} gap="xs" wrap="nowrap">
            <Badge
              size="sm"
              // Highlight if matches the query
              variant={isMatch(d.item) ? "filled" : "light"}
              color={isMatch(d.item) ? "yellow" : "blue"}
              w={70}
            >
              {formatChance(d.chance)}%
            </Badge>
            <Text
              size="sm"
              fw={isMatch(d.item) ? 700 : 400}
              c={isMatch(d.item) ? "yellow.7" : "inherit"}
            >
              {d.item} | {formatDropSize(d.min_drop, d.max_drop)}
            </Text>
          </Group>
        ))}
      </Stack>
    );
  };

  const columns: TypeColumns = NPC_COLUMNS.map(col => ({
    name: col.key,
    header: col.label,
    render: ({ value }: any) => {
      // Centralized rendering logic
      if (col.key === 'spoil' || col.key === 'drop' || col.key.includes('make')) return renderDrops(value, itemFilter);
      if (col.key === 'name') return <Text fw={500}>{value}</Text>;
      if (col.key === 'type') return <Badge>{value}</Badge>;
      return <Text>{value}</Text>;
    },
    // Set flex based on content type
    flex: col.key.includes('list') ? 1 : undefined
  }));

  return (
    <Paper p="md" shadow="sm" radius="md" withBorder>
      <Title order={3} mb="md">NPC Drops & Spoils</Title>

      <Group mb="md" align="flex-end">
        <TextInput
          label="Search Item"
          placeholder="e.g. animal_bone"
          value={itemFilter}
          onChange={(e) => setItemFilter(e.currentTarget.value)}
          flex={2}
        />
        <TextInput
          label="Search by NPC"
          placeholder="e.g. pet_wolf"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.currentTarget.value)}
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

      <Box h={700}>
        {loading ? (
          <Center h="100%">
            <Loader/>
          </Center>
        ) : (
          <ReactDataGrid
            idProperty="id"
            columns={columns}
            dataSource={filteredData}
            virtualized={true}
            theme="default"
            enableColumnAutosize
          />
        )}
      </Box>
    </Paper>
  );
}