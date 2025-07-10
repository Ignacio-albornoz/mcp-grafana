import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GrafanaClient } from "./services/grafana-client.js";
import { config } from "./utils/config.js";

/**
 * Creates and configures the Grafana MCP Server
 */
export function createGrafanaServer(): McpServer {
  const server = new McpServer({
    name: "grafana-mcp-server",
    version: "1.0.0",
  });

  // Initialize Grafana client
  const grafanaClient = new GrafanaClient({
    url: config.grafana.url,
    apiKey: config.grafana.apiKey,
  });

  // Tool: Query Prometheus directly
  server.tool(
    "query_prometheus",
    {
      query: z.string().describe("PromQL query to execute"),
      time: z.string().optional().describe("Timestamp for instant query (ISO format)"),
      start: z.string().optional().describe("Start time for range query (ISO format)"),
      end: z.string().optional().describe("End time for range query (ISO format)"),
      step: z.string().optional().describe("Step for range query (e.g., '1m', '5m')"),
    },
    async ({ query, time, start, end, step }) => {
      try {
        const result = await grafanaClient.queryPrometheus({
          query,
          time,
          start,
          end,
          step
        });

        return {
          content: [{
            type: "text",
            text: `Prometheus Query Result:\n` +
                  `Query: ${query}\n` +
                  `Status: ${result.status}\n` +
                  `Result Type: ${result.data?.resultType || 'unknown'}\n` +
                  `Data: ${JSON.stringify(result.data, null, 2)}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error executing Prometheus query: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Tool: Get dashboard by ID or UID
  server.tool(
    "get_dashboard",
    {
      identifier: z.string().describe("Dashboard ID or UID"),
      type: z.enum(["id", "uid"]).default("uid").describe("Whether identifier is an ID or UID"),
    },
    async ({ identifier, type }) => {
      try {
        const dashboard = await grafanaClient.getDashboard(identifier, type);
        return {
          content: [{
            type: "text",
            text: `Dashboard: ${dashboard.dashboard.title}\n` +
                  `UID: ${dashboard.dashboard.uid}\n` +
                  `Description: ${dashboard.dashboard.description || 'No description'}\n` +
                  `Tags: ${dashboard.dashboard.tags?.join(', ') || 'None'}\n` +
                  `Panels: ${dashboard.dashboard.panels?.length || 0}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error fetching dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Tool: List dashboards
  server.tool(
    "list_dashboards",
    {
      query: z.string().optional().describe("Search query for dashboard names"),
      limit: z.number().min(1).max(100).default(10).describe("Maximum number of dashboards to return"),
    },
    async ({ query, limit }) => {
      try {
        const dashboards = await grafanaClient.searchDashboards({ query, limit });
        const dashboardList = dashboards.map(d => 
          `• ${d.title} (UID: ${d.uid})`
        ).join('\n');

        return {
          content: [{
            type: "text",
            text: `Found ${dashboards.length} dashboards:\n${dashboardList}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error listing dashboards: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Tool: Get datasources
  server.tool(
    "get_datasources",
    {},
    async () => {
      try {
        // This would need to be implemented in GrafanaClient
        return {
          content: [{
            type: "text",
            text: "Datasources functionality not yet implemented",
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error fetching datasources: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  return server;
}