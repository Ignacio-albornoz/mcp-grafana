import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import axios from 'axios';
import { z } from 'zod';

// Environment configuration
const GRAFANA_URL = process.env.GRAFANA_URL || 'http://localhost:3000';
const GRAFANA_API_KEY = process.env.GRAFANA_API_KEY || '';
const HTTP_PORT = parseInt(process.env.HTTP_PORT || '3001');

// Validation schemas
const QueryPrometheusArgsSchema = z.object({
  query: z.string().describe('PromQL query to execute'),
  start: z.string().optional().describe('Start time for range query (ISO format)'),
  end: z.string().optional().describe('End time for range query (ISO format)'),
  step: z.string().optional().describe('Step for range query (e.g., "1m", "5m")'),
  time: z.string().optional().describe('Timestamp for instant query (ISO format)'),
});

type QueryPrometheusArgs = z.infer<typeof QueryPrometheusArgsSchema>;

// Grafana API client
class GrafanaClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  async queryPrometheus(args: QueryPrometheusArgs) {
    try {
      // Determine if this is a range query or instant query
      const isRangeQuery = args.start && args.end && args.step;
      
      const endpoint = isRangeQuery 
        ? '/api/datasources/proxy/1/api/v1/query_range'
        : '/api/datasources/proxy/1/api/v1/query';

      const params: any = {
        query: args.query,
      };

      if (isRangeQuery) {
        params.start = new Date(args.start!).getTime() / 1000;
        params.end = new Date(args.end!).getTime() / 1000;
        params.step = args.step;
      } else if (args.time) {
        params.time = new Date(args.time).getTime() / 1000;
      }

      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        params,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
        },
      });

      return {
        status: 'success',
        data: response.data,
      };
    } catch (error: any) {
      return {
        status: 'error',
        error: error.response?.data || error.message,
      };
    }
  }
}

// MCP Server implementation
class GrafanaPrometheusServer {
  private server: Server;
  private grafanaClient: GrafanaClient;

  constructor() {
    this.server = new Server(
      {
        name: 'grafana-prometheus-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.grafanaClient = new GrafanaClient(GRAFANA_URL, GRAFANA_API_KEY);
    this.setupHandlers();
  }

  private setupHandlers() {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'query_prometheus',
          description: 'Query Prometheus metrics through Grafana API',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'PromQL query to execute',
              },
              start: {
                type: 'string',
                description: 'Start time for range query (ISO format)',
              },
              end: {
                type: 'string',
                description: 'End time for range query (ISO format)',
              },
              step: {
                type: 'string',
                description: 'Step for range query (e.g., "1m", "5m")',
              },
              time: {
                type: 'string',
                description: 'Timestamp for instant query (ISO format)',
              },
            },
            required: ['query'],
          },
        },
      ];

      return { tools };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === 'query_prometheus') {
        try {
          const args = QueryPrometheusArgsSchema.parse(request.params.arguments);
          const result = await this.grafanaClient.queryPrometheus(args);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      throw new Error(`Unknown tool: ${request.params.name}`);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Grafana Prometheus MCP Server running on stdio');
  }
}

// HTTP API for n8n integration
function setupHttpApi(grafanaClient: GrafanaClient) {
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'grafana-prometheus-mcp' });
  });

  // Query Prometheus endpoint
  app.post('/api/query_prometheus', async (req, res) => {
    try {
      const args = QueryPrometheusArgsSchema.parse(req.body);
      const result = await grafanaClient.queryPrometheus(args);
      res.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          status: 'error',
          error: 'Invalid request parameters',
          details: error.errors,
        });
      } else {
        res.status(500).json({
          status: 'error',
          error: error.message,
        });
      }
    }
  });

  // List available tools (for n8n discovery)
  app.get('/api/tools', (req, res) => {
    res.json({
      tools: [
        {
          name: 'query_prometheus',
          description: 'Query Prometheus metrics through Grafana API',
          parameters: {
            query: {
              type: 'string',
              required: true,
              description: 'PromQL query to execute',
            },
            start: {
              type: 'string',
              required: false,
              description: 'Start time for range query (ISO format)',
            },
            end: {
              type: 'string',
              required: false,
              description: 'End time for range query (ISO format)',
            },
            step: {
              type: 'string',
              required: false,
              description: 'Step for range query (e.g., "1m", "5m")',
            },
            time: {
              type: 'string',
              required: false,
              description: 'Timestamp for instant query (ISO format)',
            },
          },
        },
      ],
    });
  });

  app.listen(HTTP_PORT, () => {
    console.error(`HTTP API running on port ${HTTP_PORT}`);
  });
}

// Main entry point
async function main() {
  const mode = process.env.MODE || 'mcp';
  const grafanaClient = new GrafanaClient(GRAFANA_URL, GRAFANA_API_KEY);

  if (mode === 'http') {
    // Run only HTTP API for n8n
    setupHttpApi(grafanaClient);
  } else if (mode === 'both') {
    // Run both MCP and HTTP API
    setupHttpApi(grafanaClient);
    const server = new GrafanaPrometheusServer();
    await server.run();
  } else {
    // Run only MCP server (default)
    const server = new GrafanaPrometheusServer();
    await server.run();
  }
}

// Error handling
process.on('SIGINT', () => {
  console.error('Shutting down...');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});