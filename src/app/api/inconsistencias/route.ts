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
    
    lotesFilters.push("nombre_envio NOT ILIKE '%RG%'");
    
    const canViewAllIPS = session.user.role === "ADMIN" || session.user.role === "COORDINADOR";
    if (!canViewAllIPS) {
      const userCodigo = session.user.codigoHabilitacion?.substring(0, 10) || "";
      if (userCodigo) {
        lotesFilters.push(`"codigo_habilitación" LIKE '${userCodigo}%'`);
      }
    } else if (codigo_habilitacion && codigo_habilitacion.trim() !== "") {
      lotesFilters.push(`"codigo_habilitación" ILIKE '%${codigo_habilitacion}%'`);
    }

    if (nombre_ips && nombre_ips.trim() !== "") {
      lotesFilters.push(`nombre_ips ILIKE '%${nombre_ips}%'`);
    }

    if (fecha_inicio && fecha_fin) {
      lotesFilters.push(`fecha_creacion >= '${fecha_inicio}' AND fecha_creacion <= '${fecha_fin}'`);
    }

    if (nombre_envio && nombre_envio.trim() !== "") {
      lotesFilters.push(`nombre_envio ILIKE '%${nombre_envio}%'`);
    }

    if (tipo_envio && tipo_envio.trim() !== "") {
      lotesFilters.push(`tipo_envio = '${tipo_envio}'`);
    }

    const lotesWhere = lotesFilters.join(" AND ");

    // SUBCONSULTA con CAST por tipo VARCHAR vs INTEGER
    const lotesSubquery = `SELECT CAST(numero_lote AS VARCHAR) FROM control_lotes WHERE ${lotesWhere}`;

    // ============================================================
    // FILTROS DE inconsistencias
    // IMPORTANTE: Columnas con mayúsculas requieren comillas dobles en PostgreSQL
    // ============================================================
    const conditions: string[] = [];
    
    conditions.push("p.mostrar_reporte = 1");
    conditions.push(`i.lote_de_carga IN (${lotesSubquery})`);

    if (!canViewAllIPS) {
      const userCodigo = session.user.codigoHabilitacion?.substring(0, 10) || "";
      if (userCodigo) {
        conditions.push(`i."Codigo_habilitacion_prestador_servicios_salud" LIKE '${userCodigo}%'`);
      }
    }

    if (tipo_validacion && tipo_validacion !== "all" && tipo_validacion !== "") {
      conditions.push(`i.tipo_validacion LIKE '%${tipo_validacion}%'`);
    }

    if (numero_factura) {
      conditions.push(`i."Numero_factura" LIKE '%${numero_factura}%'`);
    }

    if (origen && origen !== "all" && origen !== "") {
      conditions.push(`i.origen = '${origen}'`);
    }

    if (lote_de_carga && lote_de_carga.trim() !== "") {
      conditions.push(`i.lote_de_carga = '${lote_de_carga}'`);
    }

    // Search filter - columnas con mayúsculas van con comillas dobles
    if (search) {
      conditions.push(`(
        i."Numero_factura" ILIKE '%${search}%' 
        OR i."IPS" ILIKE '%${search}%' 
        OR i.origen ILIKE '%${search}%' 
        OR i.tipo_validacion ILIKE '%${search}%' 
        OR i.descripcion_servicio ILIKE '%${search}%' 
        OR i.observacion ILIKE '%${search}%'
      )`);
    }

    const whereClause = conditions.join(" AND ");

    // Count query
    const countQuery = `
      SELECT COUNT(*) as "total"
      FROM inconsistencias i
      INNER JOIN par_validaciones p ON i.tipo_validacion = p.tipo_validacion
      WHERE ${whereClause}
    `;

    // Data query - columnas con mayúsculas van con comillas dobles
    const dataQuery = `
      SELECT 
        i.inconsistencia_id,
        i."Numero_factura",
        i."Codigo_habilitacion_prestador_servicios_salud",
        i."IPS",
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

    const total = safeNumber(countResult[0]?.total);

    // Serialize data
    const serializedData = data.map((item) => ({
      ...item,
      inconsistencia_id: safeNumber(item.inconsistencia_id),
      Numero_factura: item.Numero_factura?.substring(0, 12) || null,
      valor_unitario: item.valor_unitario?.toString() || null,
      valor_total: item.valor_total?.toString() || null,
      cantidad: safeNumber(item.cantidad),
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
