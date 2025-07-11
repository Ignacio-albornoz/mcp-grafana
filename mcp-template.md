# MCP Module Template

Module Name: <ModuleName>
Description: \<Breve descripción del módulo>

1. Estructura de carpetas

---

src/
entrypoint/
index.ts            # Punto de arranque

gateways/ <moduleName>Adapter.ts    # Adaptador de entrada para este módulo

orchestrator/ <moduleName>Router.ts     # Rutas y mapeo de endpoints <moduleName>Orchestrator.ts # Orquestación de flujos

controllers/ <moduleName>Controller.ts # Validación y orquestación ligera

services/ <moduleName>Service.ts    # Lógica de negocio pura

adapters/ <moduleName>/              # Cliente externo del servicio <ModuleName>Client.ts    # Implementación de llamadas a la API

core/
logger.ts                # Registro de eventos
errorHandler.ts          # Manejo de errores

types/ <moduleName>.types.ts    # Interfaces y tipos TS

2. Pasos para agregar un nuevo método

---

1. Cliente externo

   * Archivo: src/adapters/<moduleName>/<ModuleName>Client.ts
   * Agrega la función:
     async <methodName>(params: <ParamsType>): Promise<<ReturnType>> { /\* ... \*/ }

2. Servicio

   * Archivo: src/services/<moduleName>Service.ts
   * Define el método:
     public async <methodName>(params: <ParamsType>): Promise<<ReturnType>> {
     return this.client.<methodName>(params);
     }

3. Controlador

   * Archivo: src/controllers/<moduleName>Controller.ts
   * Añade el handler:
     public async <methodName>Handler(req, res) {
     const result = await this.service.<methodName>(req.params);
     res.send(result);
     }

4. Router / Orquestador

   * Archivo: src/orchestrator/<moduleName>Router.ts
   * Mapea la ruta:
     router.get('/<moduleName>/<methodName>', controller.<methodName>Handler.bind(controller));

5. Tipos

   * Archivo: src/types/<moduleName>.types.ts
   * Añade/actualiza interfaces:
     export interface <MethodName>Params { /\* ... */ }
     export interface <MethodName>Result { /* ... \*/ }

6. Pruebas

   * Crear tests unitarios en tests/<moduleName>/<methodName>.spec.ts

7. Convenciones de nombres

---

* <ModuleName>: PascalCase (e.g., Grafana)
* <moduleName>: camelCase (e.g., grafana)
* <methodName>: camelCase (e.g., listDashboards)
* <ParamsType>: Descripción de parámetros (e.g., ListDashboardsParams)
* <ReturnType>: Tipo de retorno (e.g., Dashboard\[])

## Uso:

Duplica este archivo como punto de partida para cada nuevo módulo MCP. Sustituye los placeholders con los nombres concretos y sigue los pasos para agregar métodos de forma consistente.
