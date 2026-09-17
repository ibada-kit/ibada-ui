import { useState, useEffect } from 'react';
import { donationsApi } from '../services/api';
import type { WardOption } from '../types';

let cachedWards: WardOption[] | null = null;
let fetchPromise: Promise<WardOption[]> | null = null;

const DEFAULT_MADAVOOR_NAMES: Record<number, string> = {
  1: 'Ankathayi',
  2: 'Eravannur North',
  3: 'Eravannur South',
  4: 'Nariyachal',
  5: 'Pullaloor',
  6: 'Eranhukunnu',
  7: 'Rampoyil',
  8: 'Madavoor',
  9: 'Madavoormukku',
  10: 'Paimbalassery',
  11: 'Kottakkavayal',
  12: 'Arambram'
};

export function useWards(panchayath = 'Madavoor') {
  const [wards, setWards] = useState<WardOption[]>(() => {
    if (cachedWards && cachedWards.length > 0) return cachedWards;
    return Array.from({ length: 12 }, (_, i) => ({
      wardNumber: i + 1,
      wardName: DEFAULT_MADAVOOR_NAMES[i + 1] || `Ward ${i + 1}`,
      panchayath
    }));
  });
  const [loading, setLoading] = useState<boolean>(!cachedWards);

  useEffect(() => {
    let isMounted = true;

    if (cachedWards) {
      setWards(cachedWards);
      setLoading(false);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = donationsApi.getWards(panchayath).then((data) => {
        cachedWards = data;
        return data;
      });
    }

    fetchPromise.then((data) => {
      if (isMounted) {
        setWards(data);
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [panchayath]);

  return { wards, loading };
}
