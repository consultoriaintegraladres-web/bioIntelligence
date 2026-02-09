import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Helper to convert BigInt and Decimal values to Numbers in query results
function serializeResults(data: any[]): any[] {
  return data.map((row) => {
    const serialized: any = {};
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === "bigint") {
        serialized[key] = Number(value);
      } else if (value !== null && value !== undefined && typeof value === "object" && "toNumber" in value && typeof (value as any).toNumber === "function") {
        serialized[key] = (value as any).toNumber();
      } else if (value !== null && value !== undefined && typeof value === "object" && !(value instanceof Date) && typeof value.toString === "function") {
        const str = value.toString();
        const num = Number(str);
        serialized[key] = isNaN(num) ? str : num;
      } else {
        serialized[key] = value;
      }
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

    // ============================================================
    // WHERE de revision_facturas
    // ============================================================
    const whereConditions: string[] = [];
    
    if (numero_lote && numero_lote.trim() !== "") {
      whereConditions.push(`numero_lote = ${parseInt(numero_lote)}`);
    } else {
      const lotesWhere = lotesFilters.join(" AND ");
      whereConditions.push(`numero_lote IN (SELECT numero_lote FROM control_lotes WHERE ${lotesWhere})`);
    }

    // Search filter - columnas con mayúsculas van con comillas dobles
    if (search) {
      whereConditions.push(`("Numero_factura" ILIKE '%${search}%' OR CAST(numero_lote AS TEXT) ILIKE '%${search}%')`);
    }

    const whereClause = whereConditions.join(" AND ");

    console.log("📋 revision_facturas WHERE:", whereClause);

    // Count query
    const countQuery = `
      SELECT CAST(COUNT(*) AS INTEGER) as "total"
      FROM revision_facturas
      WHERE ${whereClause}
    `;

    // Data query - columnas con mayúsculas van con comillas dobles
    const dataQuery = `
      SELECT 
        numero_lote,
        "Numero_factura",
        "Primera_revision",
        segunda_revision,
        "Total_reclamado_por_amparo_gastos_medicos_quirurgicos"
      FROM revision_facturas
      WHERE ${whereClause}
      ORDER BY numero_lote DESC, "Numero_factura" ASC
      LIMIT ${limit} OFFSET ${skip}
    `;

    // Summary query - columnas con mayúsculas van con comillas dobles
    const summaryQuery = `
      SELECT
        CAST(SUM(CASE WHEN "Primera_revision" ILIKE '%Ver hallazgos%' OR "Primera_revision" ILIKE '%Ver Hallazgos%' THEN 1 ELSE 0 END) AS INTEGER) as "facturas_con_hallazgos",
        CAST(COALESCE(SUM(CASE WHEN "Primera_revision" ILIKE '%Ver hallazgos%' OR "Primera_revision" ILIKE '%Ver Hallazgos%' THEN "Total_reclamado_por_amparo_gastos_medicos_quirurgicos" ELSE 0 END), 0) AS INTEGER) as "valor_facturas_con_hallazgos",
        CAST(SUM(CASE WHEN "Primera_revision" ILIKE '%Ok%hallazgos%' THEN 1 ELSE 0 END) AS INTEGER) as "facturas_ok",
        CAST(COUNT(*) AS INTEGER) as "total_facturas"
      FROM revision_facturas
      WHERE ${whereClause}
    `;

    const [countResult, rawDataResult, summaryResult] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(countQuery),
      prisma.$queryRawUnsafe<any[]>(dataQuery),
      prisma.$queryRawUnsafe<any[]>(summaryQuery),
    ]);

    const dataResult = serializeResults(rawDataResult);
    const serializedSummary = serializeResults(summaryResult);
    const total = Number(countResult[0]?.total || 0);

    return NextResponse.json({
      data: dataResult,
      summary: {
        facturas_con_hallazgos: serializedSummary[0]?.facturas_con_hallazgos || 0,
        valor_facturas_con_hallazgos: Number(serializedSummary[0]?.valor_facturas_con_hallazgos || 0),
        facturas_ok: serializedSummary[0]?.facturas_ok || 0,
        total_facturas: serializedSummary[0]?.total_facturas || 0,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("❌ Error fetching revision_facturas:", error.message);
    return NextResponse.json(
      { error: "Error al obtener datos de revisión de facturas", details: error.message },
      { status: 500 }
    );
  }
}
