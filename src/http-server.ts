import express from 'express';
import cors from 'cors';
import { GrafanaClient } from './services/grafana-client.js';
import { config } from './utils/config.js';

interface PrometheusQueryRequest {
  query: string;
  time?: string;
  start?: string;
  end?: string;
  step?: string;
  description?: string;
}

interface PrometheusResponse {
  success: boolean;
  query: string;
  result_type: 'instant' | 'range';
  human_readable: string;
  data: any;
  execution_time: string;
  error?: string;
}

export function createHttpServer(): express.Application {
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json());
  
  // Initialize Grafana client
  const grafanaClient = new GrafanaClient({
    url: config.grafana.url,
    apiKey: config.grafana.apiKey,
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      service: 'Grafana MCP Server',
      timestamp: new Date().toISOString()
    });
  });

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      service: 'Grafana MCP HTTP Server',
      version: '1.0.0',
      endpoints: {
        prometheus: '/api/prometheus/query',
        health: '/health',
        docs: '/docs'
      }
    });
  });

  // Main Prometheus query endpoint
  app.post('/api/prometheus/query', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { query, time, start, end, step, description }: PrometheusQueryRequest = req.body;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Query parameter is required',
          example: {
            query: 'up',
            description: 'Check service status'
          }
        });
      }

      // Determine if it's a range query or instant query
      const isRangeQuery = start && end;
      
      let prometheusResult;
      if (isRangeQuery) {
        prometheusResult = await grafanaClient.queryPrometheus({
          query,
          start,
          end,
          step: step || '1m'
        });
      } else {
        prometheusResult = await grafanaClient.queryPrometheus({
          query,
          time
        });
      }

      // Format response for AI consumption
      const response: PrometheusResponse = {
        success: true,
        query,
        result_type: isRangeQuery ? 'range' : 'instant',
        human_readable: formatHumanReadable(prometheusResult, description),
        data: prometheusResult,
        execution_time: `${Date.now() - startTime}ms`
      };

      res.json(response);

    } catch (error) {
      const response: PrometheusResponse = {
        success: false,
        query: req.body.query || 'unknown',
        result_type: 'instant',
        human_readable: 'Query failed to execute',
        data: null,
        execution_time: `${Date.now() - startTime}ms`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  });

  // Documentation endpoint
  app.get('/docs', (req, res) => {
    res.json({
      title: 'Grafana MCP API Documentation',
      endpoints: {
        'POST /api/prometheus/query': {
          description: 'Execute Prometheus queries',
          body: {
            query: 'string (required) - PromQL query',
            time: 'string (optional) - Timestamp for instant query',
            start: 'string (optional) - Start time for range query',
            end: 'string (optional) - End time for range query', 
            step: 'string (optional) - Step for range query (default: 1m)',
            description: 'string (optional) - Human description for context'
          },
          examples: [
            {
              name: 'Memory Usage',
              query: '(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100',
              description: 'Current memory usage percentage'
            },
            {
              name: 'CPU Usage', 
              query: '100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)',
              description: 'Current CPU usage percentage'
            },
            {
              name: 'Service Status',
              query: 'up',
              description: 'Check if services are up'
            },
            {
              name: 'Memory Available',
              query: 'node_memory_MemAvailable_bytes',
              description: 'Available memory in bytes'
            }
          ]
        }
      },
      usage_for_n8n: {
        node_type: 'HTTP Request',
        method: 'POST',
        url: 'http://your-server:8080/api/prometheus/query',
        headers: {
          'Content-Type': 'application/json'
        },
        body_example: {
          query: 'up',
          description: 'Check service health'
        }
      }
    });
  });

  return app;
}

// Helper function to format Prometheus results for human consumption
function formatHumanReadable(data: any, description?: string): string {
  if (!data?.data?.result || data.data.result.length === 0) {
    return 'No data found for this query';
  }

  const results = data.data.result;
  
  if (results.length === 1) {
    const result = results[0];
    const value = result.value ? result.value[1] : 'N/A';
    const metric = result.metric || {};
    
    // Try to format common metrics nicely
    if (description?.toLowerCase().includes('memory')) {
      const numValue = parseFloat(value);
      if (numValue > 1000000000) {
        return `${(numValue / 1073741824).toFixed(2)}GB`;
      } else if (numValue > 1000000) {
        return `${(numValue / 1048576).toFixed(2)}MB`;
      } else if (numValue < 100 && numValue > 0) {
        return `${numValue.toFixed(2)}%`;
      }
    }
    
    return `${value} ${description ? `(${description})` : ''}`;
  }
  
  return `Found ${results.length} results: ${results.map((r: any) => r.value?.[1] || 'N/A').join(', ')}`;
}