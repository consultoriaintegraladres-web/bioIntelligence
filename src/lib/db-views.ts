import { prisma } from "@/lib/prisma";

/**
 * Ensures the PostgreSQL views required by the application exist.
 * Uses CREATE OR REPLACE VIEW so it's safe to call multiple times.
 * These views were migrated from MySQL and adapted for PostgreSQL.
 */
export async function ensureViewsExist(): Promise<void> {
  try {
    // Check if revision_facturas view exists
    const viewCheck = await prisma.$queryRawUnsafe<any[]>(`
      SELECT table_name FROM information_schema.views 
      WHERE table_schema = 'public' AND table_name IN ('revision_facturas', 'vista_consolidado_facturas_lote')
    `);
    const existingViews = viewCheck.map((v: any) => v.table_name);
    
    if (existingViews.includes('revision_facturas') && existingViews.includes('vista_consolidado_facturas_lote')) {
      return; // Both views exist, nothing to do
    }

    console.log("🔧 Creando vistas faltantes en PostgreSQL...");

    if (!existingViews.includes('revision_facturas')) {
      await createRevisionFacturasView();
    }
    if (!existingViews.includes('vista_consolidado_facturas_lote')) {
      await createConsolidadoFacturasView();
    }
  } catch (error: any) {
    console.error("⚠️ Error verificando/creando vistas:", error.message);
  }
}

export async function createRevisionFacturasView(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE VIEW revision_facturas AS
    WITH cte_errores AS (
      SELECT DISTINCT "Numero_factura"
      FROM inconsistencias
    ),
    facturas_primera AS (
      SELECT DISTINCT f."Numero_factura"
      FROM furips1_consolidado f
      JOIN control_lotes cl ON f.numero_lote = cl.numero_lote
      WHERE cl.tipo_envio = 'Primera vez'
    ),
    facturas_revalidacion AS (
      SELECT DISTINCT f."Numero_factura"
      FROM furips1_consolidado f
      JOIN control_lotes cl ON f.numero_lote = cl.numero_lote
      WHERE cl.tipo_envio = 'Revalidacion'
    )
    SELECT
      CASE
        WHEN fp."Numero_factura" IS NOT NULL AND err."Numero_factura" IS NOT NULL THEN 'Ver hallazgos'
        ELSE 'Ok Sin hallazgos'
      END AS "Primera_revision",
      CASE
        WHEN fp."Numero_factura" IS NULL OR err."Numero_factura" IS NULL THEN 'No requiere segunda revisión'
        WHEN fp."Numero_factura" IS NOT NULL AND err."Numero_factura" IS NOT NULL 
             AND fr."Numero_factura" IS NOT NULL AND err."Numero_factura" IS NOT NULL THEN 'Ver hallazgos'
        WHEN fp."Numero_factura" IS NOT NULL AND err."Numero_factura" IS NOT NULL 
             AND fr."Numero_factura" IS NOT NULL AND err."Numero_factura" IS NULL THEN 'Ok sin hallazgos'
        ELSE 'No fue reenviada'
      END AS segunda_revision,
      f.id,
      f."Numero_radicado_anterior",
      f."RGO_Respuesta_a_Glosa_u_objecion",
      f."Numero_factura",
      f."Codigo_habilitacion_prestador_servicios_salud",
      f."Primer_apellido_victima",
      f."Segundo_apellido_victima",
      f."Primer_nombre_victima",
      f."Segundo_nombre_victima",
      f."Tipo_documento_de_identidad_victima",
      f."Numero_documento_de_identidad_victima",
      f."Condicion_victima",
      f."Naturaleza_evento",
      f."Direccion_ocurrencia_evento",
      f."Fecha_ocurrencia_evento",
      f."Hora_ocurrencia_evento",
      f."Estado_aseguramiento",
      f."Marca",
      f."Placa",
      f."Tipo_Vehiculo",
      f."Codigo_aseguradora",
      f."Numero_poliza_SOAT",
      f."Fecha_inicio_vigencia_de_poliza",
      f."Fecha_final_vigencia_poliza",
      f."Numero_radicado_SIRAS",
      f."Cobro_por_agotamiento_tope_Aseguradora",
      f."Codigo_CUPS_servicio_principal_hospitalizacion",
      f."Complejidad_procedimiento_quirurgico",
      f."Codigo_CUPS_procedimiento_quirurgico_principal",
      f."Codigo_CUPS_procedimiento_quirurgico_secundario",
      f."Se_presto_servicio_UCI",
      f."Dias_UCI_reclamados",
      f."Tipo_documento_de_identidad_propietario",
      f."Numero_documento_identidad_propietario",
      f."Primer_apellido_propietario",
      f."Segundo_apellido_propietario",
      f."Primer_nombre_propietario",
      f."Segundo_nombre_propietario",
      f."Direccion_residencia_propietario",
      f."Codigo_departamento_residencia_propietario",
      f."Codigo_municipio_residencia_propietario",
      f."Primer_apellido_conductor",
      f."Segundo_apellido_conductor",
      f."Primer_nombre_conductor",
      f."Segundo_nombre_conductor",
      f."Tipo_documento_identidad_conductor",
      f."Numero_documento_identidad_conductor",
      f."Direccion_residencia_conductor",
      f."Codigo_departamento_residencia_conductor",
      f."Codigo_municipio_residencia_conductor",
      f."Fecha_ingreso1",
      f."Hora_ingreso1",
      f."Fecha_egreso",
      f."Hora_egreso",
      f."Codigo_diagnostico_principal_ingreso",
      f."Codigo_diagnostico_principal_egreso",
      f."Primer_apellido_medico",
      f."Segundo_apellido_medico",
      f."Primer_nombre_medico",
      f."Segundo_nombre_medico",
      f."Tipo_documento_identidad_medico",
      f."Numero_documento_de_identidad_medico",
      f."Numero_registro_medico",
      f."Total_facturado_por_amparo_gastos_medicos_quirurgicos",
      f."Total_reclamado_por_amparo_gastos_medicos_quirurgicos",
      f."Total_facturado_por_amparo_gastos_transporte",
      f."Total_reclamado_por_amparo_gastos_transporte",
      f."Descripcion_evento",
      f.numero_lote,
      f.usuario
    FROM furips1_consolidado f
    LEFT JOIN cte_errores err ON f."Numero_factura" = err."Numero_factura"
    LEFT JOIN facturas_primera fp ON f."Numero_factura" = fp."Numero_factura"
    LEFT JOIN facturas_revalidacion fr ON f."Numero_factura" = fr."Numero_factura"
  `);
  console.log("✅ Vista revision_facturas creada");
}

export async function createConsolidadoFacturasView(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE VIEW vista_consolidado_facturas_lote AS
    SELECT
      f.numero_lote,
      COUNT(DISTINCT f."Numero_factura") AS conteo_factura,
      COALESCE(SUM(f."Total_reclamado_por_amparo_gastos_medicos_quirurgicos"), 0) AS total_suma_reclamado,
      COUNT(DISTINCT CASE WHEN err."Numero_factura" IS NOT NULL THEN f."Numero_factura" END) AS con_hallazgos,
      COUNT(DISTINCT CASE WHEN err."Numero_factura" IS NULL THEN f."Numero_factura" END) AS sin_hallazgos,
      COUNT(err."Numero_factura") AS conteo_hallazgos_criticos,
      COALESCE(SUM(CASE WHEN err."Numero_factura" IS NOT NULL THEN f."Total_reclamado_por_amparo_gastos_medicos_quirurgicos" ELSE 0 END), 0) AS valor_total_hallazgos_criticos
    FROM furips1_consolidado f
    LEFT JOIN (
      SELECT DISTINCT "Numero_factura"
      FROM inconsistencias
    ) err ON f."Numero_factura" = err."Numero_factura"
    GROUP BY f.numero_lote
  `);
  console.log("✅ Vista vista_consolidado_facturas_lote creada");
}
