import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { GrafanaClient } from './grafana-client.js';

// Configuración del servidor MCP
const server = new Server(
  {
    name: 'mcp-grafana',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Cliente de Grafana
let grafanaClient: GrafanaClient;

// Definir herramientas disponibles
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_dashboards',
        description: 'Obtener lista de dashboards de Grafana',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_dashboard_details',
        description: 'Obtener detalles de un dashboard específico',
        inputSchema: {
          type: 'object',
          properties: {
            dashboardUid: {
              type: 'string',
              description: 'UID del dashboard',
            },
          },
          required: ['dashboardUid'],
        },
      },
      {
        name: 'get_panel_data',
        description: 'Obtener datos de un panel específico',
        inputSchema: {
          type: 'object',
          properties: {
            dashboardUid: {
              type: 'string',
              description: 'UID del dashboard',
            },
            panelId: {
              type: 'number',
              description: 'ID del panel',
            },
            from: {
              type: 'string',
              description: 'Tiempo inicial (ej: now-1h)',
              default: 'now-1h',
            },
            to: {
              type: 'string',
              description: 'Tiempo final (ej: now)',
              default: 'now',
            },
          },
          required: ['dashboardUid', 'panelId'],
        },
      },
      {
        name: 'get_datasources',
        description: 'Obtener lista de datasources configurados',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'query_prometheus',
        description: 'Ejecutar query directa a Prometheus',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Query PromQL',
            },
            time: {
              type: 'string',
              description: 'Timestamp para query instantánea (opcional)',
            },
            start: {
              type: 'string',
              description: 'Tiempo inicial para query de rango',
            },
            end: {
              type: 'string',
              description: 'Tiempo final para query de rango',
            },
            step: {
              type: 'string',
              description: 'Step para query de rango',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'create_snapshot',
        description: 'Crear snapshot de un dashboard',
        inputSchema: {
          type: 'object',
          properties: {
            dashboardUid: {
              type: 'string',
              description: 'UID del dashboard',
            },
            expires: {
              type: 'number',
              description: 'Segundos hasta que expire (0 = nunca)',
              default: 3600,
            },
          },
          required: ['dashboardUid'],
        },
      },
    ],
  };
});

// Manejar llamadas a herramientas
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  // Type guard para args
  if (!args || typeof args !== 'object') {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Argumentos inválidos',
        },
      ],
    };
  }

  try {
    switch (name) {
      case 'get_dashboards':
        const dashboards = await grafanaClient.getDashboards();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(dashboards, null, 2),
            },
          ],
        };

      case 'get_dashboard_details':
        const dashboard = await grafanaClient.getDashboardDetails(
          args.dashboardUid as string
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(dashboard, null, 2),
            },
          ],
        };

      case 'get_panel_data':
        const panelData = await grafanaClient.getPanelData(
          args.dashboardUid as string,
          args.panelId as number,
          (args.from as string) || 'now-1h',
          (args.to as string) || 'now'
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(panelData, null, 2),
            },
          ],
        };
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(panelData, null, 2),
            },
          ],
        };

      case 'get_datasources':
        const datasources = await grafanaClient.getDatasources();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(datasources, null, 2),
            },
          ],
        };

      case 'query_prometheus':
        const queryResult = await grafanaClient.queryPrometheus(
          args.query as string,
          args.time as string | undefined,
          args.start as string | undefined,
          args.end as string | undefined,
          args.step as string | undefined
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(queryResult, null, 2),
            },
          ],
        };

      case 'create_snapshot':
        const snapshot = await grafanaClient.createSnapshot(
          args.dashboardUid as string,
          (args.expires as number) || 3600
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(snapshot, null, 2),
            },
          ],
        };

      default:
        throw new Error(`Herramienta desconocida: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
});

// Inicializar servidor
async function main() {
  // Obtener configuración de variables de entorno
  const grafanaUrl = process.env.GRAFANA_URL;
  const grafanaApiKey = process.env.GRAFANA_API_KEY;

  if (!grafanaUrl || !grafanaApiKey) {
    console.error('Error: GRAFANA_URL y GRAFANA_API_KEY deben estar configuradas en .env');
    process.exit(1);
  }

  // Inicializar cliente de Grafana
  grafanaClient = new GrafanaClient(grafanaUrl, grafanaApiKey);

  // Verificar conexión
  console.error('Verificando conexión con Grafana...');
  try {
    await grafanaClient.testConnection();
    console.error('✓ Conexión exitosa con Grafana');
  } catch (error) {
    console.error('✗ Error conectando con Grafana:', error);
    process.exit(1);
  }

  // Crear transporte stdio
  const transport = new StdioServerTransport();
  
  // Conectar servidor con transporte
  await server.connect(transport);
  
  console.error('✓ Servidor MCP Grafana iniciado');
}

main().catch((error) => {
  console.error('Error fatal:', error);
  process.exit(1);
});