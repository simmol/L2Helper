import { useEffect, useState } from 'react';
import type { NpcData } from './types';

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
        const response = await fetch('/npcdata_parsed.json');
        if (!response.ok) {
          throw new Error(`Failed to load NPC data: ${response.statusText}`);
        }
        const rawData = await response.json();

        // Map and clean only the required columns to keep the size well under the 5MB LocalStorage limit
        const stripped: NpcData[] = rawData.map((npc: any) => ({
          id: npc.id || crypto.randomUUID(),
          type: npc.type || '',
          name: npc.name ? npc.name.replace(/^\[|\]$/g, '') : '', // Strip []
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
}