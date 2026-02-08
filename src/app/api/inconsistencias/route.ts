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
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const tipo_validacion = searchParams.get("tipo_validacion");
    const numero_factura = searchParams.get("numero_factura");
    const origen = searchParams.get("origen");
    const codigo_habilitacion = searchParams.get("codigo_habilitacion");
    const lote_de_carga = searchParams.get("lote_de_carga");
    const search = searchParams.get("search");
    const fecha_inicio = searchParams.get("fecha_inicio");
    const fecha_fin = searchParams.get("fecha_fin");
    const nombre_ips = searchParams.get("nombre_ips");
    const nombre_envio = searchParams.get("nombre_envio");
    const tipo_envio = searchParams.get("tipo_envio");

    const skip = (page - 1) * limit;

    // ============================================================
    // FILTROS DE control_lotes
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

    // SUBCONSULTA: SELECT numero_lote FROM control_lotes WHERE [filtros]
    const lotesSubquery = `SELECT numero_lote FROM control_lotes WHERE ${lotesWhere}`;

    // ============================================================
    // FILTROS DE inconsistencias
    // ============================================================
    const conditions: string[] = [];
    
    // Filtro principal: mostrar_reporte = 1
    conditions.push("p.mostrar_reporte = 1");
    
    // RELACIÓN: lote_de_carga IN (SELECT numero_lote FROM control_lotes WHERE ...)
    conditions.push(`i.lote_de_carga IN (${lotesSubquery})`);

    // Codigo habilitacion (solo para usuarios no admin/coordinador, para seguridad)
    if (!canViewAllIPS) {
      const userCodigo = session.user.codigoHabilitacion?.substring(0, 10) || "";
      if (userCodigo) {
        conditions.push(`i.Codigo_habilitacion_prestador_servicios_salud LIKE '${userCodigo}%'`);
      }
    }

    // NOTA: No aplicamos filtro de IPS ni fecha aquí porque ya están filtrados 
    // a través de la subconsulta de control_lotes (lote_de_carga IN ...)

    if (tipo_validacion && tipo_validacion !== "all" && tipo_validacion !== "") {
      conditions.push(`i.tipo_validacion LIKE '%${tipo_validacion}%'`);
    }

    if (numero_factura) {
      conditions.push(`i.Numero_factura LIKE '%${numero_factura}%'`);
    }

    if (origen && origen !== "all" && origen !== "") {
      conditions.push(`i.origen = '${origen}'`);
    }

    // Lote de carga directo (filtro adicional si se especifica un lote específico)
    if (lote_de_carga && lote_de_carga.trim() !== "") {
      conditions.push(`i.lote_de_carga = '${lote_de_carga}'`);
    }

    // Search filter - busca por factura, origen, tipo_validacion, descripcion_servicio
    if (search) {
      conditions.push(`(i.Numero_factura LIKE '%${search}%' OR i.IPS LIKE '%${search}%' OR i.origen LIKE '%${search}%' OR i.tipo_validacion LIKE '%${search}%' OR i.descripcion_servicio LIKE '%${search}%' OR i.observacion LIKE '%${search}%')`);
    }

    const whereClause = conditions.join(" AND ");

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

    const [countResult, data] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(countQuery),
      prisma.$queryRawUnsafe<any[]>(dataQuery),
    ]);

    const total = Number(countResult[0]?.total || 0);

    // Serialize data
    const serializedData = data.map((item) => ({
      ...item,
      Numero_factura: item.Numero_factura?.substring(0, 12) || null,
      valor_unitario: item.valor_unitario?.toString() || null,
      valor_total: item.valor_total?.toString() || null,
    }));

    return NextResponse.json({
      success: true,
      data: serializedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching inconsistencias:", error);
    return NextResponse.json(
      { error: "Error al obtener inconsistencias", details: String(error) },
      { status: 500 }
    );
  }
}
