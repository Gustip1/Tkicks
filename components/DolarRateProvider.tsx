"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

const DolarRateContext = createContext<number>(1000);

export function useDolarRate() {
  return useContext(DolarRateContext);
}

export function DolarRateProvider({ children }: { children: ReactNode }) {
  const [rate, setRate] = useState<number>(1000);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await fetch('https://dolarapi.com/v1/dolares/oficial');
        const data = await res.json();
        if (data?.venta) {
          setRate(Number(data.venta));
        }
      } catch (error) {
        console.error('Error fetching dolar rate:', error);
      }
    };

    fetchRate();
    const interval = setInterval(fetchRate, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <DolarRateContext.Provider value={rate}>
      {children}
    </DolarRateContext.Provider>
  );
}

