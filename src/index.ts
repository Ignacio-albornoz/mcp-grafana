#!/usr/bin/env node

/**
 * Grafana MCP Server
 * Provides integration with Grafana for fetching metrics, dashboards, and snapshots
 * Supports both MCP protocol and HTTP REST API
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createGrafanaServer } from "./server.js";
import { createHttpServer } from "./http-server.js";
import { validateConfig, config } from "./utils/config.js";

async function main(): Promise<void> {
  try {
    // Validate configuration
    validateConfig();
    
    // Check if we should run as HTTP server or MCP server
    const mode = process.env.SERVER_MODE || 'mcp';
    
    if (mode === 'http') {
      // HTTP Server mode for n8n integration
      const app = createHttpServer();
      
      app.listen(config.server.port, config.server.host, () => {
        console.error(`Grafana HTTP Server running on http://${config.server.host}:${config.server.port}`);
        console.error('Available endpoints:');
        console.error('  GET  /health - Health check');
        console.error('  GET  /docs - API documentation');  
        console.error('  POST /api/prometheus/query - Execute Prometheus queries');
      });
    } else {
      // MCP Server mode (default)
      const server = createGrafanaServer();
      const transport = new StdioServerTransport();
      
      await server.connect(transport);
      console.error("Grafana MCP Server started successfully");
    }
    
  } catch (error) {
    console.error("Failed to start Grafana Server:", error);
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.error("Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error("Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});