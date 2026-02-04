// User types
export interface UserSession {
  id: number;
  email: string;
  nombre: string;
  codigo_habilitacion: string;
  role: "ADMIN" | "USER";
}

// Control Lotes types
export interface ControlLoteFilters {
  numero_lote?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  nombre_ips?: string;
  codigo_habilitacion?: string;
  nombre_envio?: string;
}

export interface ControlLoteResponse {
  id: number;
  numero_lote: string | null;
  fecha_creacion: Date | null;
  nombre_ips: string | null;
  codigo_habilitacion: string | null;
  cantidad_facturas: number | null;
  valor_reclamado: string | null;
  nombre_envio: string | null;
}

// Inconsistencias types
export interface InconsistenciaFilters {
  tipo_validacion?: string;
  numero_factura?: string;
  origen?: string;
  codigo_habilitacion?: string;
  lote_de_carga?: string;
}

export interface InconsistenciaResponse {
  id: number;
  Numero_factura: string | null;
  Codigo_habilitacion_prestador_servicios_salud: string | null;
  IPS: string | null;
  origen: string | null;
  tipo_validacion: string | null;
  observacion: string | null;
  tipo_servicio: string | null;
  codigo_del_servicio: string | null;
  descripcion_servicio: string | null;
  cantidad: number | null;
  valor_unitario: string | null;
  valor_total: string | null;
  fecha: Date | null;
  lote_de_carga: string | null;
  id_factura_furips1: string | null;
  usuario: string | null;
}

// Resumen types for dashboard
export interface ResumenPorValidacion {
  tipo_validacion: string;
  cantidad_registros: number;
  valor_total: number;
  Recomendacion: string | null;
  Tipo_robot: string | null;
}

export interface ResumenPorOrigen {
  origen: string;
  cantidad_hallazgos: number;
  valor_total: number;
}

// Chart data types
export interface ChartDataItem {
  name: string;
  value: number;
  cantidad?: number;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// KPIs
export interface DashboardKPIs {
  totalLotes: number;
  totalInconsistencias: number;
  valorTotalReclamado: number;
  totalFacturas: number;
}
