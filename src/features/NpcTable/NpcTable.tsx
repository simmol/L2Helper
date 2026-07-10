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
import { useDebouncedValue } from "@mantine/hooks"
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

  const [debouncedName] = useDebouncedValue(nameFilter, 300);
  const [debouncedItem] = useDebouncedValue(itemFilter, 300);

  // Derive unique types for the dropdown filter
  const types = useMemo(() => Array.from(new Set(data.map(d => d.type))).filter(Boolean).sort(), [data]);

  // Apply filters
  const filteredData = useMemo(() => {
    let result = data.filter(item => {
      // Use debouncedName instead of nameFilter
      if (debouncedName && !item.name.toLowerCase().includes(debouncedName.toLowerCase())) return false;
      if (typeFilter && item.type !== typeFilter) return false;
      if (minLvl !== '' && item.lvl < Number(minLvl)) return false;
      if (maxLvl !== '' && item.lvl > Number(maxLvl)) return false;

      // Use debouncedItem instead of itemFilter
      if (debouncedItem) {
        const query = debouncedItem.toLowerCase();
        const hasItem = (drops?: any[]) =>
          drops?.some(drop => drop.item.toLowerCase().includes(query));
        if (!hasItem(item.spoil) && !hasItem(item.drop)) return false;
      }
      return true;
    });

    // Handle sorting using the debouncedItem
    if (debouncedItem) {
      const query = debouncedItem.toLowerCase();
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

    // 4. Update the dependency array to watch the debounced variables
  }, [data, debouncedName, typeFilter, debouncedItem, minLvl, maxLvl]);

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

          // 1. Quantity Display Rules
          // True if there is a difference of at least 1 (e.g., 100 - 200)
          const hasRange = d.max_drop - d.min_drop >= 1;
          // True if it drops a flat amount that is greater than 1 (e.g., always drops exactly 5)
          const hasStaticMultiple = d.max_drop === d.min_drop && d.min_drop > 1;

          return (
            <div key={i}>
              {/* VISUAL GROUP HEADER BLOCK */}
              {isNewGroup && (
                <Group gap={6} mt={i > 0 ? "xs" : 0} mb={4}>
                  <Text size="xs" c="dimmed" fw={700} style={{ letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    Group Pool ({formatChance(d.group_chance!)}% rate)
                  </Text>
                  <div style={{ flex: 1, borderTop: '1px dashed var(--mantine-color-dark-4)' }} />
                </Group>
              )}

              {/* ITEM CONTENT ROW */}
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

                  {/* 2. Conditionally append quantity tags */}
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

  // const renderDrops = (drops?: DropItem[], query?: string) => {
  //   if (!drops || drops.length === 0) return <Text size="sm" c="dimmed">-</Text>;
  //
  //   const isMatch = (itemName: string) =>
  //     query && itemName.toLowerCase().includes(query.toLowerCase());
  //
  //   // Helper to format chance:
  //   // parseFloat ensures we don't show trailing zeros (e.g., 5.0000 -> 5)
  //   // .toFixed(4) forces up to 4 digits if decimals exist
  //   const formatChance = (chance: number) => parseFloat(chance.toFixed(4));
  //
  //   const formatDropSize = (min: number, max: number) => (min == max) ? <>{min}</> : <>{min} - {max}</>
  //   return (
  //     <Stack gap={4} py="xs">
  //       {drops.map((d, i) => (
  //         <Group key={i} gap="xs" wrap="nowrap">
  //           <Badge
  //             size="sm"
  //             // Highlight if matches the query
  //             variant={isMatch(d.item) ? "filled" : "light"}
  //             color={isMatch(d.item) ? "yellow" : "blue"}
  //             w={70}
  //           >
  //             {formatChance(d.chance)}%
  //           </Badge>
  //           <Text
  //             size="sm"
  //             fw={isMatch(d.item) ? 700 : 400}
  //             c={isMatch(d.item) ? "yellow.7" : "inherit"}
  //           >
  //             {d.item} | {formatDropSize(d.min_drop, d.max_drop)} | Group
  //             ID: {d.group_id} {(d.group_chance !== undefined) ? <>Calculated
  //             percentage: {formatChance(d.group_chance * d.chance)}</> : <></>}
  //           </Text>
  //
  //         </Group>
  //       ))}
  //     </Stack>
  //   );
  // };

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
      <Group mb="md" align="flex-end">
        {/* Dynamic Record Counter */}
        <Text size="sm" c="dimmed" fw={500} mb={5}>
          Showing <b style={{ color: 'var(--mantine-color-blue-filled)' }}>{filteredData.length}</b> / {data.length} monsters
        </Text>
      </Group>

      <Box h={1000}>
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