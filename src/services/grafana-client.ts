import axios, { AxiosInstance } from 'axios';

export interface GrafanaConfig {
  url: string;
  apiKey: string;
}

export interface PrometheusQueryParams {
  query: string;
  time?: string;
  start?: string;
  end?: string;
  step?: string;
}

export class GrafanaClient {
  private client: AxiosInstance;

  constructor(config: GrafanaConfig) {
    this.client = axios.create({
      baseURL: config.url,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async queryPrometheus(params: PrometheusQueryParams): Promise<any> {
    try {
      const { query, time, start, end, step } = params;
      
      // Determine if it's a range query or instant query
      if (start && end) {
        // Range query
        const response = await this.client.get('/api/v1/query_range', {
          params: {
            query,
            start,
            end,
            step: step || '1m'
          }
        });
        return response.data;
      } else {
        // Instant query
        const response = await this.client.get('/api/v1/query', {
          params: {
            query,
            time: time || new Date().toISOString()
          }
        });
        return response.data;
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Prometheus query failed: ${error.response?.data?.error || error.message}`);
      }
      throw error;
    }
  }

  async getDashboard(identifier: string, type: 'id' | 'uid' = 'uid'): Promise<any> {
    try {
      const endpoint = type === 'uid' 
        ? `/api/dashboards/uid/${identifier}`
        : `/api/dashboards/db/${identifier}`;
      
      const response = await this.client.get(endpoint);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Dashboard fetch failed: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  async searchDashboards(options: { query?: string; limit?: number } = {}): Promise<any[]> {
    try {
      const response = await this.client.get('/api/search', {
        params: {
          type: 'dash-db',
          query: options.query || '',
          limit: options.limit || 10
        }
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Dashboard search failed: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }
}