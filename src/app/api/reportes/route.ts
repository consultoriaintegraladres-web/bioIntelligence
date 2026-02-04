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

    // ============================================================
    // FILTROS DE control_lotes (para WHERE directo)
    // ============================================================
    const lotesFilters: string[] = [];
    
    // Excluir RG
    lotesFilters.push("nombre_envio NOT LIKE '%RG%'");
    
    // Codigo habilitacion
    if (session.user.role !== "ADMIN") {
      const userCodigo = session.user.codigoHabilitacion?.substring(0, 10) || "";
      if (userCodigo) {
        lotesFilters.push(`codigo_habilitación LIKE '${userCodigo}%'`);
      }
    } else if (codigo_habilitacion && codigo_habilitacion.trim() !== "") {
      lotesFilters.push(`codigo_habilitación LIKE '%${codigo_habilitacion}%'`);
    }

    // Nombre IPS
    if (nombre_ips && nombre_ips.trim() !== "") {
      lotesFilters.push(`nombre_ips LIKE '%${nombre_ips}%'`);
    }

    // Fecha creacion
    if (fecha_inicio && fecha_fin) {
      lotesFilters.push(`fecha_creacion >= '${fecha_inicio}' AND fecha_creacion <= '${fecha_fin}'`);
    }

    // Nombre envio
    if (nombre_envio && nombre_envio.trim() !== "") {
      lotesFilters.push(`nombre_envio LIKE '%${nombre_envio}%'`);
    }

    const lotesWhere = lotesFilters.join(" AND ");

    // ============================================================
    // SUBCONSULTA: SELECT numero_lote FROM control_lotes WHERE [filtros]
    // ============================================================
    const lotesSubquery = `SELECT numero_lote FROM control_lotes WHERE ${lotesWhere}`;

    // ============================================================
    // FILTROS DE inconsistencias
    // ============================================================
    const incFilters: string[] = [];
    
    // FILTRO PRINCIPAL: Solo mostrar donde mostrar_reporte = 1
    incFilters.push("p.mostrar_reporte = 1");
    
    // RELACIÓN: lote_de_carga IN (SELECT numero_lote FROM control_lotes WHERE ...)
    incFilters.push(`i.lote_de_carga IN (${lotesSubquery})`);
    
    // Codigo habilitacion en inconsistencias
    if (session.user.role !== "ADMIN") {
      const userCodigo = session.user.codigoHabilitacion?.substring(0, 10) || "";
      if (userCodigo) {
        incFilters.push(`i.Codigo_habilitacion_prestador_servicios_salud LIKE '${userCodigo}%'`);
      }
    } else if (codigo_habilitacion && codigo_habilitacion.trim() !== "") {
      incFilters.push(`i.Codigo_habilitacion_prestador_servicios_salud LIKE '%${codigo_habilitacion}%'`);
    }

    // Lote de carga directo
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

    // IPS en inconsistencias
    if (nombre_ips && nombre_ips.trim() !== "") {
      incFilters.push(`i.IPS LIKE '%${nombre_ips}%'`);
    }

    // Fecha en inconsistencias
    if (fecha_inicio && fecha_fin) {
      incFilters.push(`i.fecha >= '${fecha_inicio}' AND i.fecha <= '${fecha_fin}'`);
    }

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
        
        // KPIs de inconsistencias
        const inconsistenciasQuery = `
          SELECT 
            COUNT(*) as totalInconsistencias,
            COALESCE(SUM(i.valor_total), 0) as valorTotalInconsistencias
          FROM inconsistencias i
          INNER JOIN par_validaciones p ON i.tipo_validacion = p.tipo_validacion
          WHERE ${incWhere}
        `;

        const [lotesResult, inconsistenciasResult] = await Promise.all([
          prisma.$queryRawUnsafe<any[]>(lotesQuery),
          prisma.$queryRawUnsafe<any[]>(inconsistenciasQuery),
        ]);

        return NextResponse.json({
          success: true,
          data: {
            totalLotes: Number(lotesResult[0]?.totalLotes || 0),
            totalFacturas: Number(lotesResult[0]?.totalFacturas || 0),
            valorTotalReclamado: Number(lotesResult[0]?.valorTotalReclamado || 0),
            totalInconsistencias: Number(inconsistenciasResult[0]?.totalInconsistencias || 0),
            valorTotalInconsistencias: Number(inconsistenciasResult[0]?.valorTotalInconsistencias || 0),
          },
        });
      }

      case "resumen_validacion": {
        const query = `
          SELECT 
            i.tipo_validacion,
            COUNT(*) as cantidad_registros,
            COALESCE(SUM(i.valor_total), 0) as valor_total,
            p.Recomendación as Recomendacion,
            p.Tipo_robot
          FROM inconsistencias i
          INNER JOIN par_validaciones p ON i.tipo_validacion = p.tipo_validacion
          WHERE ${incWhere}
          GROUP BY i.tipo_validacion, p.Recomendación, p.Tipo_robot
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
        const query = `
          SELECT 
            COALESCE(i.origen, 'Sin origen') as origen,
            COUNT(*) as cantidad_hallazgos,
            COALESCE(SUM(i.valor_total), 0) as valor_total
          FROM inconsistencias i
          INNER JOIN par_validaciones p ON i.tipo_validacion = p.tipo_validacion
          WHERE ${incWhere}
          GROUP BY i.origen
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

        const result = await prisma.$queryRawUnsafe<any[]>(query);

        return NextResponse.json({
          success: true,
          data: result.map((item) => item.nombre_ips),
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
