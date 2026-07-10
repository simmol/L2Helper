// noinspection ExceptionCaughtLocallyJS

import { notifications } from '@mantine/notifications';
import { useEffect, useState } from 'react';
import { NPC_COLUMNS } from './schema';

import type { NpcData } from './types';

const DB_NAME = 'NpcDatabase';
const STORE_NAME = 'NpcStore';
const DATA_VERSION = '1.1.2';
const CACHE_KEY = `npc-data-${NPC_COLUMNS.map(c => c.key).join('-')}-${DATA_VERSION}`;

// Initialize IndexedDB
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

// Helper: Get cached data
const getCachedData = async (): Promise<NpcData[] | null> => {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(CACHE_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Failed to read from IndexedDB', err);
    return null;
  }
};

// Helper: Save cached data
const setCachedData = async (data: NpcData[]): Promise<void> => {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear(); // Ensure only the current schema is stored
    store.put(data, CACHE_KEY);
  } catch (err) {
    console.warn('Failed to save to IndexedDB', err);
  }
};

// Transformation logic using Schema
const transformNpc = (rawNpc: any): NpcData => {
  const transformed: any = { id: rawNpc.id || crypto.randomUUID() };
  NPC_COLUMNS.forEach(col => {
    transformed[col.key as keyof NpcData] = col.transform(rawNpc[col.key], rawNpc);
  });
  return transformed as NpcData;
};

export function useNpcData() {
  const [data, setData] = useState<NpcData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Try to load from IndexedDB
        const cached = await getCachedData();
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }

        // 2. Fetch fresh JSON from public folder
        const response = await fetch('/npcdata_parsed.json');
        if (!response.ok) {
          throw new Error(`Failed to load NPC data: ${response.statusText}`);
        }
        const rawData = await response.json();

        // 👇 NEW: Filter down to allowed types before transforming and caching
        const allowedTypes = ['warrior', 'boss', 'treasure'];
        const filteredData = rawData.filter((npc: any) => {
          const typeStr = (npc.type || '').toLowerCase();
          return allowedTypes.some(allowed => typeStr.includes(allowed));
        });

        // 3. Map/Transform using the schema (now using the smaller, filtered array)
        const stripped: NpcData[] = filteredData.map(transformNpc);

        // 4. Cache result in IndexedDB
        await setCachedData(stripped);

        setData(stripped);
        notifications.show({
          title: 'Data loaded successfully!',
          message: 'Data loaded successfully!',
          color: 'green',
          position: 'top-center',
        });

      } catch (error) {
        console.error("Failed to load NPC data:", error);
        notifications.show({
          title: 'Error loading data',
          message: error instanceof Error ? error.message : 'An unknown error occurred',
          color: 'red',
          position: 'top-center',
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return { data, loading };
}