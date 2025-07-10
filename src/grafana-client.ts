import axios, { AxiosInstance } from 'axios';
import { 
  GrafanaDashboard, 
  GrafanaDashboardDetails, 
  GrafanaSnapshot,
  GrafanaDatasource,
  PrometheusQueryResult 
} from './types.js';

export class GrafanaClient {
  private client: AxiosInstance;
  private prometheusClient: AxiosInstance | null = null;

  constructor(baseURL: string, apiKey: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 segundos
    });
  }

  async testConnection(): Promise<void> {
    try {
      await this.client.get('/api/org');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('API Key inválida');
        } else if (error.code === 'ECONNREFUSED') {
          throw new Error('No se puede conectar a Grafana. Verifica la URL');
        }
      }
      throw error;
    }
  }

  async getDashboards(): Promise<GrafanaDashboard[]> {
    try {
      const response = await this.client.get('/api/search', {
        params: {
          type: 'dash-db',
          limit: 5000,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Error obteniendo dashboards: ${this.formatError(error)}`);
    }
  }

  async getDashboardDetails(uid: string): Promise<GrafanaDashboardDetails> {
    try {
      const response = await this.client.get(`/api/dashboards/uid/${uid}`);
      return response.data;
    } catch (error) {
      throw new Error(`Error obteniendo dashboard ${uid}: ${this.formatError(error)}`);
    }
  }

  async getPanelData(dashboardUid: string, panelId: number, from: string, to: string): Promise<any> {
    try {
      // Primero obtener el dashboard para conseguir la info del panel
      const dashboardResponse = await this.getDashboardDetails(dashboardUid);
      const panel = dashboardResponse.dashboard.panels.find(p => p.id === panelId);
      
      if (!panel) {
        throw new Error(`Panel ${panelId} no encontrado en dashboard ${dashboardUid}`);
      }

      // Si el panel tiene queries, ejecutarlas
      if (panel.targets && panel.targets.length > 0) {
        const results = [];
        
        for (const target of panel.targets) {
          if (target.expr) { // Es una query de Prometheus
            const result = await this.queryPrometheus(target.expr, undefined, from, to);
            results.push({
              refId: target.refId,
              query: target.expr,
              data: result,
            });
          }
        }
        
        return {
          panel: {
            id: panel.id,
            title: panel.title,
            type: panel.type,
          },
          timeRange: { from, to },
          results,
        };
      }

      return {
        panel: {
          id: panel.id,
          title: panel.title,
          type: panel.type,
          description: panel.description,
        },
        message: 'Panel sin queries configuradas',
      };
    } catch (error) {
      throw new Error(`Error obteniendo datos del panel: ${this.formatError(error)}`);
    }
  }

  async getDatasources(): Promise<GrafanaDatasource[]> {
    try {
      const response = await this.client.get('/api/datasources');
      return response.data;
    } catch (error) {
      throw new Error(`Error obteniendo datasources: ${this.formatError(error)}`);
    }
  }

  async queryPrometheus(
    query: string, 
    time?: string,
    start?: string, 
    end?: string, 
    step?: string
  ): Promise<PrometheusQueryResult> {
    try {
      // Buscar datasource de Prometheus si no lo tenemos
      if (!this.prometheusClient) {
        const datasources = await this.getDatasources();
        const prometheusDatasource = datasources.find(
          ds => ds.type === 'prometheus' && ds.isDefault
        ) || datasources.find(ds => ds.type === 'prometheus');

        if (!prometheusDatasource) {
          throw new Error('No se encontró un datasource de Prometheus configurado');
        }

        // Usar el proxy de Grafana para consultar Prometheus
        this.prometheusClient = axios.create({
          baseURL: `${this.client.defaults.baseURL}/api/datasources/proxy/${prometheusDatasource.id}`,
          headers: this.client.defaults.headers,
          timeout: 30000,
        });
      }

      // Decidir si es query instantánea o de rango
      if (start && end) {
        // Query de rango
        const response = await this.prometheusClient.get('/api/v1/query_range', {
          params: {
            query,
            start,
            end,
            step: step || '60s',
          },
        });
        return response.data;
      } else {
        // Query instantánea
        const response = await this.prometheusClient.get('/api/v1/query', {
          params: {
            query,
            time,
          },
        });
        return response.data;
      }
    } catch (error) {
      throw new Error(`Error ejecutando query Prometheus: ${this.formatError(error)}`);
    }
  }

  async createSnapshot(dashboardUid: string, expires: number = 3600): Promise<GrafanaSnapshot> {
    try {
      // Primero obtener el dashboard completo
      const dashResponse = await this.getDashboardDetails(dashboardUid);
      
      // Preparar el snapshot
      const snapshotData = {
        dashboard: dashResponse.dashboard,
        name: `Snapshot de ${dashResponse.dashboard.title}`,
        expires: expires,
      };
      
      const response = await this.client.post('/api/snapshots', snapshotData);
      return response.data;
    } catch (error) {
      throw new Error(`Error creando snapshot: ${this.formatError(error)}`);
    }
  }

  private formatError(error: any): string {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        return `${error.response.status}: ${error.response.data?.message || error.response.statusText}`;
      } else if (error.request) {
        return 'No se recibió respuesta del servidor';
      }
    }
    return error.message || 'Error desconocido';
  }
}