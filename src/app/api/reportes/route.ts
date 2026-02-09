import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    // ============================================================
    const lotesFilters: string[] = [];
    
    // Excluir RG
    lotesFilters.push("nombre_envio NOT ILIKE '%RG%'");
    
    // Codigo habilitacion
    const canViewAllIPS = session.user.role === "ADMIN" || session.user.role === "COORDINADOR";
    if (!canViewAllIPS) {
      const userCodigo = session.user.codigoHabilitacion?.substring(0, 10) || "";
      if (userCodigo) {
        lotesFilters.push(`codigo_habilitación LIKE '${userCodigo}%'`);
      }
    } else if (codigo_habilitacion && codigo_habilitacion.trim() !== "") {
      lotesFilters.push(`codigo_habilitación ILIKE '%${codigo_habilitacion}%'`);
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
    // CAST a VARCHAR porque lote_de_carga es VARCHAR y numero_lote es INTEGER
    // ============================================================
    const lotesSubquery = `SELECT CAST(numero_lote AS VARCHAR) as numero_lote FROM control_lotes WHERE ${lotesWhere}`;

    // ============================================================
    // FILTROS DE inconsistencias
    // ============================================================
    const incFilters: string[] = [];
    
    // FILTRO PRINCIPAL: Solo mostrar donde mostrar_reporte = 1
    incFilters.push("p.mostrar_reporte = 1");
    
    // RELACIÓN: lote_de_carga IN (SELECT numero_lote FROM control_lotes WHERE ...)
    // Este filtro ya incluye: IPS, fecha, codigo_habilitacion, tipo_envio, nombre_envio
    incFilters.push(`i.lote_de_carga IN (${lotesSubquery})`);
    
    // Codigo habilitacion en inconsistencias (solo para usuarios no-admin/coordinador, como seguridad extra)
    if (!canViewAllIPS) {
      const userCodigo = session.user.codigoHabilitacion?.substring(0, 10) || "";
      if (userCodigo) {
        incFilters.push(`i.Codigo_habilitacion_prestador_servicios_salud LIKE '${userCodigo}%'`);
      }
    }

    // Lote de carga directo (filtro adicional si se especifica un lote específico)
    if (lote_de_carga && lote_de_carga.trim() !== "") {
      incFilters.push(`i.lote_de_carga = '${lote_de_carga}'`);
    }

    // Tipo validacion
    if (tipo_validacion && tipo_validacion !== "all" && tipo_validacion !== "") {
      incFilters.push(`i.tipo_validacion LIKE '%${tipo_validacion}%'`);
    }

    // Origen
    if (origen && origen !== "all" && origen !== "") {
      incFilters.push(`i.origen = '${origen}'`);
    }

    // NOTA: No aplicamos filtro de IPS, fecha ni codigo_habilitacion (admin) aquí 
    // porque ya están filtrados a través de la subconsulta de control_lotes

    const incWhere = incFilters.join(" AND ");

    switch (tipo) {
      case "kpis": {
        // KPIs de control_lotes (filtrado directo)
        const lotesQuery = `
          SELECT 
            COUNT(*) as totalLotes,
            COALESCE(SUM(cantidad_facturas), 0) as totalFacturas,
            COALESCE(SUM(valor_reclamado), 0) as valorTotalReclamado
          FROM control_lotes
          WHERE ${lotesWhere}
        `;
        
        // KPIs de inconsistencias - cantidad total
        const inconsistenciasCountQuery = `
          SELECT 
            COUNT(*) as totalInconsistencias
          FROM inconsistencias i
          INNER JOIN par_validaciones p ON i.tipo_validacion = p.tipo_validacion
          WHERE ${incWhere}
        `;

        // KPIs de inconsistencias - valor deduplicado por (Numero_factura, codigo_del_servicio)
        // Para evitar duplicar el valor cuando la misma factura+item tiene múltiples orígenes
        const inconsistenciasValorQuery = `
          SELECT 
            COALESCE(SUM(sub.valor_total), 0) as valorTotalInconsistencias
          FROM (
            SELECT i."Numero_factura", i.codigo_del_servicio, MAX(i.valor_total) as valor_total
            FROM inconsistencias i
            INNER JOIN par_validaciones p ON i.tipo_validacion = p.tipo_validacion
            WHERE ${incWhere}
            GROUP BY i."Numero_factura", i.codigo_del_servicio
          ) sub
        `;

        const [lotesResult, inconsistenciasCountResult, inconsistenciasValorResult] = await Promise.all([
          prisma.$queryRawUnsafe<any[]>(lotesQuery),
          prisma.$queryRawUnsafe<any[]>(inconsistenciasCountQuery),
          prisma.$queryRawUnsafe<any[]>(inconsistenciasValorQuery),
        ]);

        return NextResponse.json({
          success: true,
          data: {
            totalLotes: Number(lotesResult[0]?.totalLotes || 0),
            totalFacturas: Number(lotesResult[0]?.totalFacturas || 0),
            valorTotalReclamado: Number(lotesResult[0]?.valorTotalReclamado || 0),
            totalInconsistencias: Number(inconsistenciasCountResult[0]?.totalInconsistencias || 0),
            valorTotalInconsistencias: Number(inconsistenciasValorResult[0]?.valorTotalInconsistencias || 0),
          },
        });
      }

      case "resumen_validacion": {
        // Valor deduplicado: para cada tipo_validacion, sumamos solo un valor por (Numero_factura, codigo_del_servicio)
        const query = `
          SELECT 
            sub.tipo_validacion,
            SUM(sub.cnt) as cantidad_registros,
            COALESCE(SUM(sub.valor_dedup), 0) as valor_total,
            p.Recomendación as Recomendacion,
            p.Tipo_robot
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
          GROUP BY sub.tipo_validacion, p.Recomendación, p.Tipo_robot
          ORDER BY cantidad_registros DESC
          LIMIT 20
        `;

        const result = await prisma.$queryRawUnsafe<any[]>(query);

        return NextResponse.json({
          success: true,
          data: result.map((item) => ({
            tipo_validacion: item.tipo_validacion || "Sin clasificar",
            cantidad_registros: Number(item.cantidad_registros),
            valor_total: Number(item.valor_total),
            Recomendacion: item.Recomendacion,
            Tipo_robot: item.Tipo_robot,
          })),
        });
      }

      case "resumen_origen": {
        // Valor deduplicado por (Numero_factura, codigo_del_servicio) dentro de cada origen
        const query = `
          SELECT 
            sub.origen,
            SUM(sub.cnt) as cantidad_hallazgos,
            COALESCE(SUM(sub.valor_dedup), 0) as valor_total
          FROM (
            SELECT 
              COALESCE(i.origen, 'Sin origen') as origen,
              i."Numero_factura",
              i.codigo_del_servicio,
              COUNT(*) as cnt,
              MAX(i.valor_total) as valor_dedup
            FROM inconsistencias i
            INNER JOIN par_validaciones p ON i.tipo_validacion = p.tipo_validacion
            WHERE ${incWhere}
            GROUP BY i.origen, i."Numero_factura", i.codigo_del_servicio
          ) sub
          GROUP BY sub.origen
          ORDER BY cantidad_hallazgos DESC
        `;

        const result = await prisma.$queryRawUnsafe<any[]>(query);

        return NextResponse.json({
          success: true,
          data: result.map((item) => ({
            origen: item.origen,
            cantidad_hallazgos: Number(item.cantidad_hallazgos),
            valor_total: Number(item.valor_total),
          })),
        });
      }

      case "tipos_validacion": {
        const baseConditions = ["p.mostrar_reporte = 1"];
        
        if (session.user.role !== "ADMIN" && session.user.codigoHabilitacion) {
          baseConditions.push(`i.Codigo_habilitacion_prestador_servicios_salud LIKE '${session.user.codigoHabilitacion.substring(0, 10)}%'`);
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
          baseConditions.push(`i.Codigo_habilitacion_prestador_servicios_salud LIKE '${session.user.codigoHabilitacion.substring(0, 10)}%'`);
        }

        const query = `
          SELECT DISTINCT i.origen
          FROM inconsistencias i
          INNER JOIN par_validaciones p ON i.tipo_validacion = p.tipo_validacion
          WHERE i.origen IS NOT NULL AND ${baseConditions.join(" AND ")}
          ORDER BY i.origen
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
          baseConditions.push(`i.Codigo_habilitacion_prestador_servicios_salud LIKE '${session.user.codigoHabilitacion.substring(0, 10)}%'`);
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
