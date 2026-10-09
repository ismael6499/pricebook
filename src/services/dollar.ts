import { getSetting, setSetting } from '../db/database';

export interface DollarRate {
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

export async function fetchUsdBlueRate(): Promise<number> {
  try {
    const response = await fetch('https://dolarapi.com/v1/dolares/blue', {
      headers: { 'Accept': 'application/json' },
    });
    if (response.ok) {
      const data: DollarRate = await response.json();
      if (data && data.venta > 0) {
        await setSetting('last_usd_rate', String(data.venta));
        return data.venta;
      }
    }
  } catch (err) {
    console.warn('Could not fetch USD blue online, using cached rate:', err);
  }

  const cached = await getSetting('last_usd_rate', '1350.0');
  return parseFloat(cached) || 1350.0;
}
