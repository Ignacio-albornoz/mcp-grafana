Grafana Prometheus MCP Server
Un servidor MCP (Model Context Protocol) que proporciona acceso a métricas de Prometheus a través de la API de Grafana. Incluye un endpoint HTTP para integración con n8n.

Características
🔧 Método query_prometheus para consultar métricas usando PromQL
🌐 API HTTP para integración con n8n y otras herramientas
📊 Soporte para consultas instantáneas y de rango
🔒 Autenticación mediante API Key de Grafana
🐳 Incluye Docker y Docker Compose para fácil despliegue
Instalación
Opción 1: Instalación local
Clona el repositorio y navega al directorio:
bash
git clone <repository-url>
cd grafana-prometheus-mcp
Instala las dependencias:
bash
npm install
Copia el archivo de configuración de ejemplo:
bash
cp .env.example .env
Edita .env con tu configuración de Grafana:
env
GRAFANA_URL=http://localhost:3000
GRAFANA_API_KEY=tu-api-key-aqui
HTTP_PORT=3001
MODE=both
Construye el proyecto:
bash
npm run build
Inicia el servidor:
bash
npm start
Opción 2: Usando Docker
Construye y ejecuta con Docker Compose:
bash
docker-compose up -d
Configuración
Variables de entorno
GRAFANA_URL: URL de tu instancia de Grafana (default: http://localhost:3000)
GRAFANA_API_KEY: API Key de Grafana con permisos para consultar Prometheus
HTTP_PORT: Puerto para la API HTTP (default: 3001)
MODE: Modo de operación:
mcp: Solo servidor MCP (stdio)
http: Solo API HTTP
both: Ambos servicios (default)
Obtener API Key de Grafana
Accede a tu instancia de Grafana
Ve a Configuration → API Keys
Crea una nueva API Key con rol "Viewer" o superior
Copia la key generada a tu archivo .env
Uso
API HTTP (para n8n)
Endpoint de consulta
http
POST http://localhost:3001/api/query_prometheus
Content-Type: application/json

{
  "query": "up",
  "start": "2024-01-01T00:00:00Z",
  "end": "2024-01-01T01:00:00Z",
  "step": "5m"
}
Respuesta exitosa
json
{
  "status": "success",
  "data": {
    "resultType": "matrix",
    "result": [...]
  }
}
Endpoint de salud
http
GET http://localhost:3001/health
Listar herramientas disponibles
http
GET http://localhost:3001/api/tools
Integración con n8n
En n8n, añade un nodo HTTP Request
Configura:
Method: POST
URL: http://localhost:3001/api/query_prometheus
Authentication: None (o añade headers personalizados si implementas autenticación adicional)
Body Content Type: JSON
Body:
json
{
  "query": "{{ $json.promql_query }}",
  "start": "{{ $json.start_time }}",
  "end": "{{ $json.end_time }}",
  "step": "{{ $json.step || '5m' }}"
}
Uso como MCP Server
Si estás usando Claude Desktop o una herramienta compatible con MCP:

Añade la configuración en tu claude_desktop_config.json:
json
{
  "mcpServers": {
    "grafana-prometheus": {
      "command": "node",
      "args": ["/path/to/grafana-prometheus-mcp/dist/index.js"],
      "env": {
        "GRAFANA_URL": "http://localhost:3000",
        "GRAFANA_API_KEY": "tu-api-key"
      }
    }
  }
}
Ejemplos de consultas
Consulta instantánea
json
{
  "query": "up",
  "time": "2024-01-01T12:00:00Z"
}
Consulta de rango
json
{
  "query": "rate(http_requests_total[5m])",
  "start": "2024-01-01T00:00:00Z",
  "end": "2024-01-01T01:00:00Z",
  "step": "1m"
}
Métricas de CPU
json
{
  "query": "100 - (avg(rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
  "start": "2024-01-01T00:00:00Z",
  "end": "2024-01-01T01:00:00Z",
  "step": "5m"
}
Desarrollo
Ejecutar en modo desarrollo
bash
# Solo MCP
npm run dev

# Solo HTTP
npm run dev:http

# Ambos
npm run dev:both
Estructura del proyecto
grafana-prometheus-mcp/
├── src/
│   └── index.ts          # Código principal del servidor
├── dist/                 # Código compilado
├── package.json          # Dependencias y scripts
├── tsconfig.json         # Configuración de TypeScript
├── .env.example          # Ejemplo de configuración
├── docker-compose.yml    # Configuración de Docker
├── Dockerfile           # Imagen Docker
└── README.md            # Este archivo
Troubleshooting
Error: "Invalid API Key"
Verifica que tu API Key de Grafana sea válida
Asegúrate de que la key tenga permisos para consultar datasources
Error: "Connection refused"
Verifica que Grafana esté ejecutándose
Confirma que la URL de Grafana sea correcta
Si usas Docker, asegúrate de que los contenedores estén en la misma red
No se reciben datos
Verifica que el datasource ID sea correcto (por defecto usa ID 1)
Confirma que Prometheus esté configurado como datasource en Grafana
Revisa los logs del servidor para más detalles
Licencia
MIT

