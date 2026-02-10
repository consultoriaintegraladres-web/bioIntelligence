import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Helper to safely convert BigInt/Decimal to Number
function safeNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "bigint") return Number(val);
  if (typeof val === "object" && typeof val.toNumber === "function") return val.toNumber();
  return Number(val) || 0;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ success: true, data: [] }, { status: 200 });
    }

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo");
    const codigo_habilitacion = searchParams.get("codigo_habilitacion");
    const lote_de_carga = searchParams.get("lote_de_carga");
    const nombre_ips = searchParams.get("nombre_ips");
    const fecha_inicio = searchParams.get("fecha_inicio");
    const fecha_fin = searchParams.get("fecha_fin");
    const tipo_validacion = searchParams.get("tipo_validacion");
    const origen = searchParams.get("origen");
    const nombre_envio = searchParams.get("nombre_envio");
    const tipo_envio = searchParams.get("tipo_envio");

    // ============================================================
    // FILTROS DE control_lotes (para WHERE directo)
    // Nota: control_lotes tiene columnas en minúsculas excepto
    // "codigo_habilitación" (con tilde)
    // ============================================================
    const lotesFilters: string[] = [];
    
    // Excluir RG
    lotesFilters.push("nombre_envio NOT ILIKE '%RG%'");
    
    // Codigo habilitacion (columna con tilde)
    const canViewAllIPS = session.user.role === "ADMIN" || session.user.role === "COORDINADOR";
    if (!canViewAllIPS) {
      const userCodigo = session.user.codigoHabilitacion?.substring(0, 10) || "";
      if (userCodigo) {
        lotesFilters.push(`"codigo_habilitación" LIKE '${userCodigo}%'`);
      }
    } else if (codigo_habilitacion && codigo_habilitacion.trim() !== "") {
      lotesFilters.push(`"codigo_habilitación" ILIKE '%${codigo_habilitacion}%'`);
    }

    // Nombre IPS
    if (nombre_ips && nombre_ips.trim() !== "") {
      lotesFilters.push(`nombre_ips ILIKE '%${nombre_ips}%'`);
    }

    // Fecha creacion
    if (fecha_inicio && fecha_fin) {
      lotesFilters.push(`fecha_creacion >= '${fecha_inicio}' AND fecha_creacion <= '${fecha_fin}'`);
    }

    // Nombre envio
    if (nombre_envio && nombre_envio.trim() !== "") {
      lotesFilters.push(`nombre_envio ILIKE '%${nombre_envio}%'`);
    }

    // Tipo envio
    if (tipo_envio && tipo_envio.trim() !== "") {
      lotesFilters.push(`tipo_envio = '${tipo_envio}'`);
    }

    const lotesWhere = lotesFilters.join(" AND ");

    // ============================================================
    // SUBCONSULTA: SELECT numero_lote FROM control_lotes WHERE [filtros]
    // CAST a VARCHAR porque lote_de_carga en inconsistencias es VARCHAR
    // y numero_lote en control_lotes es INTEGER
    // ============================================================
    const lotesSubquery = `SELECT CAST(numero_lote AS VARCHAR) FROM control_lotes WHERE ${lotesWhere}`;

    // ============================================================
    // FILTROS DE inconsistencias
    // IMPORTANTE: Columnas con mayúsculas llevan comillas dobles
    // ============================================================
    const incFilters: string[] = [];
    
    // FILTRO PRINCIPAL: Solo mostrar donde mostrar_reporte = 1
    incFilters.push("p.mostrar_reporte = 1");
    
    // RELACIÓN con control_lotes
    incFilters.push(`i.lote_de_carga IN (${lotesSubquery})`);
    
    // Codigo habilitacion en inconsistencias (seguridad extra para no-admin)
    if (!canViewAllIPS) {
      const userCodigo = session.user.codigoHabilitacion?.substring(0, 10) || "";
      if (userCodigo) {
        incFilters.push(`i."Codigo_habilitacion_prestador_servicios_salud" LIKE '${userCodigo}%'`);
      }
    }

    // Lote de carga directo
    if (lote_de_carga && lote_de_carga.trim() !== "") {
      incFilters.push(`i.lote_de_carga = '${lote_de_carga}'`);
    }

    // Tipo validacion
    if (tipo_validacion && tipo_validacion !== "all" && tipo_validacion !== "") {
      incFilters.push(`i.tipo_validacion LIKE '%${tipo_validacion}%'`);
    }

    // Origen (case-insensitive para normalizar variantes como "furips 2" vs "Furips 2")
    if (origen && origen !== "all" && origen !== "") {
      incFilters.push(`UPPER(TRIM(i.origen)) = UPPER(TRIM('${origen}'))`);
    }

    const incWhere = incFilters.join(" AND ");

    switch (tipo) {
      case "kpis": {
        // KPIs de control_lotes - aliases con comillas dobles para preservar case
        const lotesQuery = `
          SELECT 
            COUNT(*) as "totalLotes",
            COALESCE(SUM(cantidad_facturas), 0) as "totalFacturas",
            COALESCE(SUM(valor_reclamado), 0) as "valorTotalReclamado"
          FROM control_lotes
          WHERE ${lotesWhere}
        `;
        
        // KPIs de inconsistencias - cantidad total
        const inconsistenciasCountQuery = `
          SELECT 
            COUNT(*) as "totalInconsistencias"
          FROM inconsistencias i
          INNER JOIN par_validaciones p ON i.tipo_validacion = p.tipo_validacion
          WHERE ${incWhere}
        `;

        // KPIs de inconsistencias - valor deduplicado
        const inconsistenciasValorQuery = `
          SELECT 
            COALESCE(SUM(sub.valor_total), 0) as "valorTotalInconsistencias"
          FROM (
            SELECT i."Numero_factura", i.codigo_del_servicio, MAX(i.valor_total) as valor_total
            FROM inconsistencias i
            INNER JOIN par_validaciones p ON i.tipo_validacion = p.tipo_validacion
            WHERE ${incWhere}
            GROUP BY i."Numero_factura", i.codigo_del_servicio
          ) sub
        `;

        console.log("[REPORTES] KPIs lotesQuery:", lotesQuery.substring(0, 200));

        const [lotesResult, inconsistenciasCountResult, inconsistenciasValorResult] = await Promise.all([
          prisma.$queryRawUnsafe<any[]>(lotesQuery),
          prisma.$queryRawUnsafe<any[]>(inconsistenciasCountQuery),
          prisma.$queryRawUnsafe<any[]>(inconsistenciasValorQuery),
        ]);

        console.log("[REPORTES] KPIs lotesResult:", lotesResult[0]);
        console.log("[REPORTES] KPIs incCount:", inconsistenciasCountResult[0]);
        console.log("[REPORTES] KPIs incValor:", inconsistenciasValorResult[0]);

        return NextResponse.json({
          success: true,
          data: {
            totalLotes: safeNumber(lotesResult[0]?.totalLotes),
            totalFacturas: safeNumber(lotesResult[0]?.totalFacturas),
            valorTotalReclamado: safeNumber(lotesResult[0]?.valorTotalReclamado),
            totalInconsistencias: safeNumber(inconsistenciasCountResult[0]?.totalInconsistencias),
            valorTotalInconsistencias: safeNumber(inconsistenciasValorResult[0]?.valorTotalInconsistencias),
          },
        });
      }

      case "resumen_validacion": {
        const query = `
          SELECT 
            sub.tipo_validacion,
            SUM(sub.cnt) as "cantidad_registros",
            COALESCE(SUM(sub.valor_dedup), 0) as "valor_total",
            p."Recomendación" as "Recomendacion",
            p."Tipo_robot"
          FROM (
            SELECT 
              i.tipo_validacion,
              i."Numero_factura",
              i.codigo_del_servicio,
              COUNT(*) as cnt,
              MAX(i.valor_total) as valor_dedup
            FROM inconsistencias i
            INNER JOIN par_validaciones p ON i.tipo_validacion = p.tipo_validacion
            WHERE ${incWhere}
            GROUP BY i.tipo_validacion, i."Numero_factura", i.codigo_del_servicio
          ) sub
          INNER JOIN par_validaciones p ON sub.tipo_validacion = p.tipo_validacion
          GROUP BY sub.tipo_validacion, p."Recomendación", p."Tipo_robot"
          ORDER BY "cantidad_registros" DESC
          LIMIT 20
        `;

        const result = await prisma.$queryRawUnsafe<any[]>(query);

        return NextResponse.json({
          success: true,
          data: result.map((item) => ({
            tipo_validacion: item.tipo_validacion || "Sin clasificar",
            cantidad_registros: safeNumber(item.cantidad_registros),
            valor_total: safeNumber(item.valor_total),
            Recomendacion: item.Recomendacion,
            Tipo_robot: item.Tipo_robot,
          })),
        });
      }

      case "resumen_origen": {
        const query = `
          SELECT
            sub.origen_norm as origen,
            SUM(sub.cnt) as "cantidad_hallazgos",
            COALESCE(SUM(sub.valor_dedup), 0) as "valor_total"
          FROM (
            SELECT
              INITCAP(TRIM(COALESCE(i.origen, 'Sin origen'))) as origen_norm,
              i."Numero_factura",
              i.codigo_del_servicio,
              COUNT(*) as cnt,
              MAX(i.valor_total) as valor_dedup
            FROM inconsistencias i
            INNER JOIN par_validaciones p ON i.tipo_validacion = p.tipo_validacion
            WHERE ${incWhere}
            GROUP BY INITCAP(TRIM(COALESCE(i.origen, 'Sin origen'))), i."Numero_factura", i.codigo_del_servicio
          ) sub
          GROUP BY sub.origen_norm
          ORDER BY "cantidad_hallazgos" DESC
        `;

        const result = await prisma.$queryRawUnsafe<any[]>(query);

        return NextResponse.json({
          success: true,
          data: result.map((item) => ({
            origen: item.origen,
            cantidad_hallazgos: safeNumber(item.cantidad_hallazgos),
            valor_total: safeNumber(item.valor_total),
          })),
        });
      }

      case "tipos_validacion": {
        const baseConditions = ["p.mostrar_reporte = 1"];
        
        if (session.user.role !== "ADMIN" && session.user.codigoHabilitacion) {
          baseConditions.push(`i."Codigo_habilitacion_prestador_servicios_salud" LIKE '${session.user.codigoHabilitacion.substring(0, 10)}%'`);
        }

        const query = `
          SELECT DISTINCT i.tipo_validacion
          FROM inconsistencias i
          INNER JOIN par_validaciones p ON i.tipo_validacion = p.tipo_validacion
          WHERE ${baseConditions.join(" AND ")}
          ORDER BY i.tipo_validacion
          LIMIT 100
        `;

        const result = await prisma.$queryRawUnsafe<any[]>(query);

        return NextResponse.json({
          success: true,
          data: result.map((item) => item.tipo_validacion),
        });
      }

      case "origenes": {
        const baseConditions = ["p.mostrar_reporte = 1"];
        
        if (session.user.role !== "ADMIN" && session.user.codigoHabilitacion) {
          baseConditions.push(`i."Codigo_habilitacion_prestador_servicios_salud" LIKE '${session.user.codigoHabilitacion.substring(0, 10)}%'`);
        }

        const query = `
          SELECT DISTINCT INITCAP(TRIM(i.origen)) as origen
          FROM inconsistencias i
          INNER JOIN par_validaciones p ON i.tipo_validacion = p.tipo_validacion
          WHERE i.origen IS NOT NULL AND ${baseConditions.join(" AND ")}
          ORDER BY origen
        `;

        const result = await prisma.$queryRawUnsafe<any[]>(query);

        return NextResponse.json({
          success: true,
          data: result.map((item) => item.origen),
        });
      }

      case "lotes": {
        const baseConditions = ["p.mostrar_reporte = 1"];
        
        if (session.user.role !== "ADMIN" && session.user.codigoHabilitacion) {
          baseConditions.push(`i."Codigo_habilitacion_prestador_servicios_salud" LIKE '${session.user.codigoHabilitacion.substring(0, 10)}%'`);
        }

        const query = `
          SELECT DISTINCT i.lote_de_carga
          FROM inconsistencias i
          INNER JOIN par_validaciones p ON i.tipo_validacion = p.tipo_validacion
          WHERE i.lote_de_carga IS NOT NULL AND ${baseConditions.join(" AND ")}
          ORDER BY i.lote_de_carga DESC
          LIMIT 100
        `;

        const result = await prisma.$queryRawUnsafe<any[]>(query);

        return NextResponse.json({
          success: true,
          data: result.map((item) => item.lote_de_carga),
        });
      }

      case "ips_nombres": {
        const query = `
          SELECT DISTINCT nombre_ips
          FROM control_lotes
          WHERE nombre_ips IS NOT NULL AND nombre_ips != ''
          ORDER BY nombre_ips
          LIMIT 200
        `;

        console.log("[REPORTES] Query IPS:", query);
        const result = await prisma.$queryRawUnsafe<any[]>(query);
        console.log("[REPORTES] Resultados IPS:", result.length, "registros");

        return NextResponse.json({
          success: true,
          data: result.map((item) => item.nombre_ips).filter(Boolean),
        });
      }

      case "tipos_envio": {
        const query = `
          SELECT DISTINCT tipo_envio
          FROM control_lotes
          WHERE tipo_envio IS NOT NULL AND tipo_envio != ''
          ORDER BY tipo_envio
        `;

        console.log("[REPORTES] Query tipos_envio:", query);
        const result = await prisma.$queryRawUnsafe<any[]>(query);
        console.log("[REPORTES] Resultados tipos_envio:", result.length, "registros");

        return NextResponse.json({
          success: true,
          data: result.map((item) => item.tipo_envio).filter(Boolean),
        });
      }

      default:
        return NextResponse.json({
          success: true,
          data: [],
        });
    }
  } catch (error) {
    console.error("[REPORTES] Error:", error);
    return NextResponse.json({
      success: false,
      data: [],
      error: String(error),
    });
  }
}
