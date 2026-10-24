import {
  DashboardResponse,
  DecisionTimeForecastResponse,
  ForecastEvolutionResponse,
  AccuracyResponse,
  DataStatusResponse
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(url, options);
  if (!resp.ok) {
    const errorBody = await resp.text();
    let message = `API request failed with status ${resp.status}`;
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed.detail) message = parsed.detail;
    } catch {
      if (errorBody) message = errorBody;
    }
    throw new Error(message);
  }
  return resp.json();
}

export const api = {
  getHealth: async (): Promise<{ status: string; database_connected: boolean; database_records: any }> => {
    return fetchJson(`${API_BASE}/health`);
  },

  getDashboard: async (params: {
    startDate: string;
    endDate: string;
    cutoffTime?: string;
    cutoffType?: string;
    customCutoff?: string;
  }): Promise<DashboardResponse> => {
    const q = new URLSearchParams({
      start_date: params.startDate,
      end_date: params.endDate,
      cutoff_time: params.cutoffTime || '12:00',
      cutoff_type: params.cutoffType || 'day_ahead',
    });
    if (params.customCutoff) {
      q.set('custom_cutoff', params.customCutoff);
    }
    return fetchJson(`${API_BASE}/dashboard?${q.toString()}`);
  },

  getDecisionTimeForecast: async (params: {
    deliveryDate: string;
    settlementPeriod: number;
    cutoffTime?: string;
    cutoffType?: string;
    customCutoff?: string;
  }): Promise<DecisionTimeForecastResponse> => {
    const q = new URLSearchParams({
      delivery_date: params.deliveryDate,
      settlement_period: params.settlementPeriod.toString(),
      cutoff_time: params.cutoffTime || '12:00',
      cutoff_type: params.cutoffType || 'day_ahead',
    });
    if (params.customCutoff) {
      q.set('custom_cutoff', params.customCutoff);
    }
    return fetchJson(`${API_BASE}/forecast-at-cutoff?${q.toString()}`);
  },

  getForecastEvolution: async (startTime: string): Promise<ForecastEvolutionResponse> => {
    const q = new URLSearchParams({ start_time: startTime });
    return fetchJson(`${API_BASE}/forecast-evolution?${q.toString()}`);
  },

  getAccuracy: async (params: {
    startDate: string;
    endDate: string;
    cutoffTime?: string;
    cutoffType?: string;
    binWidth?: number;
  }): Promise<AccuracyResponse> => {
    const q = new URLSearchParams({
      start_date: params.startDate,
      end_date: params.endDate,
      cutoff_time: params.cutoffTime || '12:00',
      cutoff_type: params.cutoffType || 'day_ahead',
      bin_width: (params.binWidth || 500).toString(),
    });
    return fetchJson(`${API_BASE}/accuracy?${q.toString()}`);
  },

  getDataStatus: async (): Promise<DataStatusResponse> => {
    return fetchJson(`${API_BASE}/data-status`);
  },

  triggerSync: async (syncNow = false): Promise<{ status: string; message: string }> => {
    return fetchJson(`${API_BASE}/data/sync?sync_now=${syncNow}`, {
      method: 'POST'
    });
  }
};
