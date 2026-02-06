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
    const numero_lote = searchParams.get("numero_lote");
    const codigo_habilitacion = searchParams.get("codigo_habilitacion");
    const nombre_ips = searchParams.get("nombre_ips");
    const fecha_inicio = searchParams.get("fecha_inicio");
    const fecha_fin = searchParams.get("fecha_fin");
    const nombre_envio = searchParams.get("nombre_envio");
    const tipo_envio = searchParams.get("tipo_envio");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    // ============================================================
    // FILTROS DE control_lotes
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

    // Tipo envio
    if (tipo_envio && tipo_envio.trim() !== "") {
      lotesFilters.push(`tipo_envio = '${tipo_envio}'`);
    }

    // Numero lote
    if (numero_lote && numero_lote.trim() !== "") {
      lotesFilters.push(`numero_lote = '${numero_lote}'`);
    }

    // Query para obtener datos de revision_facturas
    // La vista debe tener: numero_lote, numero_factura, primera_revision, segunda_revision
    const whereConditions: string[] = [];
    
    // Si hay un numero_lote específico, filtrar directamente por él
    // De lo contrario, usar los filtros de control_lotes para obtener los lotes válidos
    if (numero_lote && numero_lote.trim() !== "") {
      // Filtro directo por numero_lote
      whereConditions.push(`numero_lote = '${numero_lote}'`);
    } else {
      // Usar filtros de control_lotes para obtener lotes válidos
      const lotesWhere = lotesFilters.length > 0 ? lotesFilters.join(" AND ") : "1=1";
      whereConditions.push(`numero_lote IN (SELECT numero_lote FROM control_lotes WHERE ${lotesWhere})`);
    }

    // Search filter
    if (search) {
      whereConditions.push(`(numero_factura LIKE '%${search}%' OR numero_lote LIKE '%${search}%')`);
    }

    const whereClause = whereConditions.length > 0 ? whereConditions.join(" AND ") : "1=1";

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM revision_facturas
      WHERE ${whereClause}
    `;

    // Data query
    const dataQuery = `
      SELECT 
        numero_lote,
        numero_factura,
        primera_revision,
        segunda_revision
      FROM revision_facturas
      WHERE ${whereClause}
      ORDER BY numero_lote DESC, numero_factura ASC
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
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching revision_facturas:", error);
    return NextResponse.json(
      { error: "Error al obtener datos de revisión de facturas", details: error.message },
      { status: 500 }
    );
  }
}
