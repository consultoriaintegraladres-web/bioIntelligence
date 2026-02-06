import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tipo_envio = searchParams.get("tipo_envio"); // 'Primera vez' o 'Revalidacion'
    const numero_lote = searchParams.get("numero_lote");
    const numero_factura = searchParams.get("numero_factura");
    const codigo_habilitacion = searchParams.get("codigo_habilitacion");
    const nombre_ips = searchParams.get("nombre_ips");
    const fecha_inicio = searchParams.get("fecha_inicio");
    const fecha_fin = searchParams.get("fecha_fin");
    const nombre_envio = searchParams.get("nombre_envio");
    const limit = searchParams.get("limit") || "5000";
    const page = searchParams.get("page") || "1";

    if (!tipo_envio || (tipo_envio !== "Primera vez" && tipo_envio !== "Revalidacion")) {
      return NextResponse.json(
        { error: "tipo_envio debe ser 'Primera vez' o 'Revalidacion'" },
        { status: 400 }
      );
    }

    // ============================================================
    // FILTROS DE control_lotes
    // ============================================================
    const lotesFilters: string[] = [];
    
    // Excluir RG
    lotesFilters.push("nombre_envio NOT LIKE '%RG%'");
    
    // Tipo envio específico
    lotesFilters.push(`tipo_envio = '${tipo_envio}'`);
    
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

    // Numero lote
    if (numero_lote && numero_lote.trim() !== "") {
      lotesFilters.push(`numero_lote = '${numero_lote}'`);
    }

    const lotesWhere = lotesFilters.join(" AND ");

    // SUBCONSULTA: SELECT numero_lote FROM control_lotes WHERE [filtros]
    const lotesSubquery = `SELECT numero_lote FROM control_lotes WHERE ${lotesWhere}`;

    // ============================================================
    // FILTROS DE inconsistencias
    // ============================================================
    const conditions: string[] = [];
    
    // Filtro principal: mostrar_reporte = 1
    conditions.push("p.mostrar_reporte = 1");
    
    // RELACIÓN: lote_de_carga IN (SELECT numero_lote FROM control_lotes WHERE tipo_envio = ...)
    conditions.push(`i.lote_de_carga IN (${lotesSubquery})`);

    // Filtrar por numero_lote específico si se proporciona
    if (numero_lote && numero_lote.trim() !== "") {
      conditions.push(`i.lote_de_carga = '${numero_lote}'`);
    }

    // Filtrar por Numero_factura específico si se proporciona
    if (numero_factura && numero_factura.trim() !== "") {
      conditions.push(`i.Numero_factura = '${numero_factura}'`);
    }

    // Codigo habilitacion (solo para usuarios no admin, para seguridad)
    if (session.user.role !== "ADMIN") {
      const userCodigo = session.user.codigoHabilitacion?.substring(0, 10) || "";
      if (userCodigo) {
        conditions.push(`i.Codigo_habilitacion_prestador_servicios_salud LIKE '${userCodigo}%'`);
      }
    }

    const whereClause = conditions.join(" AND ");

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM inconsistencias i
      INNER JOIN par_validaciones p ON i.tipo_validacion = p.tipo_validacion
      WHERE ${whereClause}
    `;

    // Data query
    const dataQuery = `
      SELECT 
        i.inconsistencia_id,
        i.Numero_factura,
        i.Codigo_habilitacion_prestador_servicios_salud,
        i.IPS,
        i.origen,
        i.tipo_validacion,
        i.observacion,
        i.tipo_servicio,
        i.codigo_del_servicio,
        i.descripcion_servicio,
        i.cantidad,
        i.valor_unitario,
        i.valor_total,
        i.fecha,
        i.lote_de_carga,
        i.id_factura_furips1,
        i.usuario
      FROM inconsistencias i
      INNER JOIN par_validaciones p ON i.tipo_validacion = p.tipo_validacion
      WHERE ${whereClause}
      ORDER BY i.inconsistencia_id DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const [countResult, dataResult] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(countQuery),
      prisma.$queryRawUnsafe<any[]>(dataQuery),
    ]);

    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      data: dataResult,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error: any) {
    console.error("Error fetching hallazgos by tipo_envio:", error);
    return NextResponse.json(
      { error: "Error al obtener hallazgos", details: error.message },
      { status: 500 }
    );
  }
}
