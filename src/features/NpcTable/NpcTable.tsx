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
  Title,
  Tooltip
} from '@mantine/core';
import { useDebouncedCallback } from "@mantine/hooks"; // 👈 Changed to Callback
import { useMemo, useState } from 'react';
import { NPC_COLUMNS } from "./schema.ts";
import type { DropItem } from './types';
import { useNpcData } from './useNpcData';

import "@geovi/the-datagrid/style.css";

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

  const renderDrops = (drops?: DropItem[], query?: string) => {
    if (!drops || drops.length === 0) return <Text size="sm" c="dimmed">-</Text>;

    const isMatch = (itemName: string) =>
      query && itemName.toLowerCase().includes(query.toLowerCase());

    const formatChance = (chance: number) => parseFloat(chance.toFixed(4));

    return (
      <Stack gap={4} py="xs">
        {drops.map((d, i) => {
          const isGroupItem = d.group_id !== undefined;
          const isNewGroup = isGroupItem && (i === 0 || d.group_id !== drops[i - 1].group_id);

          const hasRange = d.max_drop - d.min_drop >= 1;
          const hasStaticMultiple = d.max_drop === d.min_drop && d.min_drop > 1;

          return (
            <div key={i}>
              {isNewGroup && (
                <Group gap={6} mt={i > 0 ? "xs" : 0} mb={4}>
                  <Text size="xs" c="dimmed" fw={700} style={{ letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    Group Pool ({formatChance(d.group_chance!)}% rate)
                  </Text>
                  <div style={{ flex: 1, borderTop: '1px dashed var(--mantine-color-dark-4)' }} />
                </Group>
              )}

              <Group gap="xs" wrap="nowrap" pl={isGroupItem ? "sm" : 0}>
                <Tooltip
                  label={isGroupItem
                    ? `Formula: Group (${formatChance(d.group_chance!)}%) × Slot (${formatChance(d.internal_chance!)}%)`
                    : "Flat standalone server roll"
                  }
                  position="right"
                  withArrow
                >
                  <Badge
                    size="sm"
                    variant={isMatch(d.item) ? "filled" : "light"}
                    color={isMatch(d.item) ? "yellow" : isGroupItem ? "indigo" : "blue"}
                    w={75}
                    style={{ cursor: 'help' }}
                  >
                    {formatChance(d.chance)}%
                  </Badge>
                </Tooltip>

                <Text
                  size="sm"
                  fw={isMatch(d.item) ? 700 : 400}
                  c={isMatch(d.item) ? "yellow.7" : "inherit"}
                >
                  {d.item}
                  {hasRange && ` (${d.min_drop} - ${d.max_drop})`}
                  {hasStaticMultiple && ` (${d.min_drop})`}

                  {isGroupItem && (
                    <Text component="span" size="xs" c="dimmed" ml="xs" fw={400}>
                      [{formatChance(d.internal_chance!)}%]
                    </Text>
                  )}
                </Text>
              </Group>
            </div>
          );
        })}
      </Stack>
    );
  };

  const columns: TypeColumns = useMemo(() => {
    return NPC_COLUMNS.map(col => ({
      name: col.key,
      header: col.label,
      render: ({ value }: any) => {
        if (col.key === 'spoil' || col.key === 'drop' || col.key.includes('make')) {
          // Hooking into the committed searchItem state
          return renderDrops(value, searchItem);
        }
        if (col.key === 'name') return <Text fw={500}>{value}</Text>;
        if (col.key === 'type') return <Badge>{value}</Badge>;
        return <Text>{value}</Text>;
      },
      flex: col.key.includes('list') ? 1 : undefined
    }));
  }, [searchItem]); // Update grid renders only when the final item search updates

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
          Showing <b style={{ color: 'var(--mantine-color-blue-filled)' }}>{filteredData.length}</b> / {data.length} monsters
        </Text>
      </Group>

      <Box h={1000}>
        {gridViewport}
      </Box>
    </Paper>
  );
}