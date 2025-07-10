// Tipos para Grafana Dashboard
export interface GrafanaDashboard {
  id: number;
  uid: string;
  title: string;
  uri: string;
  url: string;
  slug: string;
  type: string;
  tags: string[];
  isStarred: boolean;
  folderId?: number;
  folderUid?: string;
  folderTitle?: string;
  folderUrl?: string;
}

export interface GrafanaDashboardDetails {
  meta: {
    type: string;
    canSave: boolean;
    canEdit: boolean;
    canAdmin: boolean;
    canStar: boolean;
    canDelete: boolean;
    slug: string;
    url: string;
    expires: string;
    created: string;
    updated: string;
    updatedBy: string;
    createdBy: string;
    version: number;
    hasAcl: boolean;
    isFolder: boolean;
    folderId: number;
    folderUid: string;
    folderTitle: string;
    folderUrl: string;
  };
  dashboard: {
    id: number;
    uid: string;
    title: string;
    tags: string[];
    timezone: string;
    schemaVersion: number;
    version: number;
    panels: GrafanaPanel[];
    time?: {
      from: string;
      to: string;
    };
    timepicker?: any;
    templating?: {
      list: any[];
    };
    annotations?: {
      list: any[];
    };
    refresh?: string;
    description?: string;
  };
}

export interface GrafanaPanel {
  id: number;
  gridPos: {
    h: number;
    w: number;
    x: number;
    y: number;
  };
  type: string;
  title: string;
  description?: string;
  datasource?: {
    type: string;
    uid: string;
  };
  targets: GrafanaPanelTarget[];
  options?: any;
  fieldConfig?: any;
  transformations?: any[];
  transparent?: boolean;
  pluginVersion?: string;
}

export interface GrafanaPanelTarget {
  refId: string;
  expr?: string; // Para Prometheus
  query?: string; // Para otros datasources
  datasource?: {
    type: string;
    uid: string;
  };
  instant?: boolean;
  range?: boolean;
  intervalMs?: number;
  maxDataPoints?: number;
  legendFormat?: string;
  step?: number;
  queryType?: string;
  exemplar?: boolean;
  requestId?: string;
  utcOffsetSec?: number;
}

// Tipos para Snapshots
export interface GrafanaSnapshot {
  deleteKey: string;
  deleteUrl: string;
  key: string;
  url: string;
  id: number;
  expires?: string;
  externalUrl?: string;
}

// Tipos para Datasources
export interface GrafanaDatasource {
  id: number;
  uid: string;
  orgId: number;
  name: string;
  type: string;
  typeLogoUrl: string;
  access: string;
  url: string;
  user: string;
  database: string;
  basicAuth: boolean;
  basicAuthUser: string;
  withCredentials: boolean;
  isDefault: boolean;
  jsonData: {
    [key: string]: any;
  };
  secureJsonFields: {
    [key: string]: boolean;
  };
  version: number;
  readOnly: boolean;
}

// Tipos para resultados de Prometheus
export interface PrometheusQueryResult {
  status: 'success' | 'error';
  data?: {
    resultType: 'matrix' | 'vector' | 'scalar' | 'string';
    result: PrometheusResult[];
  };
  errorType?: string;
  error?: string;
  warnings?: string[];
}

export interface PrometheusResult {
  metric: {
    [key: string]: string;
  };
  value?: [number, string]; // Para resultados instantáneos
  values?: [number, string][]; // Para resultados de rango
}

// Tipos para métricas de Node Exporter
export interface NodeExporterMetrics {
  cpu?: {
    usage: number;
    cores: number;
    loadAvg: {
      '1m': number;
      '5m': number;
      '15m': number;
    };
  };
  memory?: {
    total: number;
    used: number;
    free: number;
    available: number;
    usagePercent: number;
  };
  disk?: {
    devices: Array<{
      device: string;
      mountpoint: string;
      total: number;
      used: number;
      free: number;
      usagePercent: number;
    }>;
  };
  network?: {
    interfaces: Array<{
      interface: string;
      rxBytes: number;
      txBytes: number;
      rxPackets: number;
      txPackets: number;
      rxErrors: number;
      txErrors: number;
    }>;
  };
  system?: {
    uptime: number;
    bootTime: number;
    hostname: string;
    os: string;
    kernel: string;
  };
}