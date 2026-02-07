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
        // Handle Prisma Decimal
        serialized[key] = (value as any).toNumber();
      } else if (value !== null && value !== undefined && typeof value === "object" && !(value instanceof Date) && typeof value.toString === "function") {
        // Handle other numeric-like objects
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
    // FILTROS DE control_lotes (para subquery cuando no hay lote directo)
    // ============================================================
    const lotesFilters: string[] = [];
    
    // Excluir RG - COLLATE para evitar conflicto de collation
    lotesFilters.push("nombre_envio NOT LIKE '%RG%' COLLATE utf8mb4_general_ci");
    
    // Codigo habilitacion
    if (session.user.role !== "ADMIN") {
      const userCodigo = session.user.codigoHabilitacion?.substring(0, 10) || "";
      if (userCodigo) {
        lotesFilters.push(`codigo_habilitación LIKE '${userCodigo}%' COLLATE utf8mb4_general_ci`);
      }
    } else if (codigo_habilitacion && codigo_habilitacion.trim() !== "") {
      lotesFilters.push(`codigo_habilitación LIKE '%${codigo_habilitacion}%' COLLATE utf8mb4_general_ci`);
    }

    // Nombre IPS - usar COLLATE para evitar problemas de collation
    if (nombre_ips && nombre_ips.trim() !== "") {
      lotesFilters.push(`nombre_ips LIKE '%${nombre_ips}%' COLLATE utf8mb4_general_ci`);
    }

    // Fecha creacion
    if (fecha_inicio && fecha_fin) {
      lotesFilters.push(`fecha_creacion >= '${fecha_inicio}' AND fecha_creacion <= '${fecha_fin}'`);
    }

    // Nombre envio
    if (nombre_envio && nombre_envio.trim() !== "") {
      lotesFilters.push(`nombre_envio LIKE '%${nombre_envio}%' COLLATE utf8mb4_general_ci`);
    }

    // Tipo envio
    if (tipo_envio && tipo_envio.trim() !== "") {
      lotesFilters.push(`tipo_envio = '${tipo_envio}' COLLATE utf8mb4_general_ci`);
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
      whereConditions.push(`(Numero_factura LIKE '%${search}%' COLLATE utf8mb4_general_ci OR CAST(numero_lote AS CHAR) LIKE '%${search}%' COLLATE utf8mb4_general_ci)`);
    }

    const whereClause = whereConditions.join(" AND ");

    console.log("📋 revision_facturas WHERE:", whereClause);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/660cc560-af41-44a9-be17-cf7d8435b0ac',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'revision-facturas/route.ts:109',message:'WHERE clause built',data:{whereClause,lotesFilters},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

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

    // Summary query - KPIs solo de Primera Revisión (usar SIGNED para evitar Decimal/BigInt)
    const summaryQuery = `
      SELECT
        CAST(SUM(CASE WHEN Primera_revision LIKE '%Ver hallazgos%' COLLATE utf8mb4_general_ci OR Primera_revision LIKE '%Ver Hallazgos%' COLLATE utf8mb4_general_ci THEN 1 ELSE 0 END) AS SIGNED) as facturas_con_hallazgos,
        CAST(COALESCE(SUM(CASE WHEN Primera_revision LIKE '%Ver hallazgos%' COLLATE utf8mb4_general_ci OR Primera_revision LIKE '%Ver Hallazgos%' COLLATE utf8mb4_general_ci THEN Total_reclamado_por_amparo_gastos_medicos_quirurgicos ELSE 0 END), 0) AS SIGNED) as valor_facturas_con_hallazgos,
        CAST(SUM(CASE WHEN Primera_revision LIKE '%Ok%hallazgos%' COLLATE utf8mb4_general_ci THEN 1 ELSE 0 END) AS SIGNED) as facturas_ok,
        CAST(COUNT(*) AS SIGNED) as total_facturas
      FROM revision_facturas
      WHERE ${whereClause}
    `;

    const [countResult, rawDataResult, summaryResult] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(countQuery),
      prisma.$queryRawUnsafe<any[]>(dataQuery),
      prisma.$queryRawUnsafe<any[]>(summaryQuery),
    ]);

    // Serialize to handle any BigInt values
    const dataResult = serializeResults(rawDataResult);
    const serializedSummary = serializeResults(summaryResult);
    const total = Number(countResult[0]?.total || 0);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/660cc560-af41-44a9-be17-cf7d8435b0ac',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'revision-facturas/route.ts:153',message:'Query success',data:{total,dataCount:dataResult.length,summary:serializedSummary[0]},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

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
    console.error("❌ Stack:", error.stack);
    return NextResponse.json(
      { error: "Error al obtener datos de revisión de facturas", details: error.message },
      { status: 500 }
    );
  }
}
