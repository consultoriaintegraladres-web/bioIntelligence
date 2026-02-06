import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Helper to convert BigInt values to Numbers in query results
function serializeResults(data: any[]): any[] {
  return data.map((row) => {
    const serialized: any = {};
    for (const [key, value] of Object.entries(row)) {
      serialized[key] = typeof value === "bigint" ? Number(value) : value;
    }
    return serialized;
  });
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
    // FILTROS DE control_lotes (para subquery cuando no hay lote directo)
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

    // ============================================================
    // WHERE de revision_facturas
    // ============================================================
    const whereConditions: string[] = [];
    
    // Si hay un numero_lote específico, filtrar directamente
    if (numero_lote && numero_lote.trim() !== "") {
      whereConditions.push(`numero_lote = ${parseInt(numero_lote)}`);
    } else {
      // Usar filtros de control_lotes para obtener lotes válidos
      const lotesWhere = lotesFilters.join(" AND ");
      whereConditions.push(`numero_lote IN (SELECT numero_lote FROM control_lotes WHERE ${lotesWhere})`);
    }

    // Search filter
    if (search) {
      whereConditions.push(`(Numero_factura LIKE '%${search}%' OR CAST(numero_lote AS CHAR) LIKE '%${search}%')`);
    }

    const whereClause = whereConditions.join(" AND ");

    console.log("📋 revision_facturas WHERE:", whereClause);

    // Count query - CAST to SIGNED to avoid BigInt serialization issues
    const countQuery = `
      SELECT CAST(COUNT(*) AS SIGNED) as total
      FROM revision_facturas
      WHERE ${whereClause}
    `;

    // Data query - use exact column names as defined in the view
    const dataQuery = `
      SELECT 
        numero_lote,
        Numero_factura,
        Primera_revision,
        segunda_revision,
        Total_reclamado_por_amparo_gastos_medicos_quirurgicos
      FROM revision_facturas
      WHERE ${whereClause}
      ORDER BY numero_lote DESC, Numero_factura ASC
      LIMIT ${limit} OFFSET ${skip}
    `;

    console.log("📋 revision_facturas COUNT query:", countQuery);
    console.log("📋 revision_facturas DATA query:", dataQuery);

    const [countResult, rawDataResult] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(countQuery),
      prisma.$queryRawUnsafe<any[]>(dataQuery),
    ]);

    // Serialize to handle any BigInt values
    const dataResult = serializeResults(rawDataResult);
    const total = Number(countResult[0]?.total || 0);

    console.log(`📋 revision_facturas: ${total} registros encontrados, página ${page}`);

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
    console.error("❌ Error fetching revision_facturas:", error.message);
    console.error("❌ Stack:", error.stack);
    return NextResponse.json(
      { error: "Error al obtener datos de revisión de facturas", details: error.message },
      { status: 500 }
    );
  }
}
