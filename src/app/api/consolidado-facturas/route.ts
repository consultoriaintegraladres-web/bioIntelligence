import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureViewsExist, createConsolidadoFacturasView } from "@/lib/db-views";

// Helper to convert BigInt and Decimal values to Numbers
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
    const numero_lote = searchParams.get("numero_lote");
    const codigo_habilitacion = searchParams.get("codigo_habilitacion");
    const nombre_ips = searchParams.get("nombre_ips");
    const fecha_inicio = searchParams.get("fecha_inicio");
    const fecha_fin = searchParams.get("fecha_fin");
    const nombre_envio = searchParams.get("nombre_envio");
    const tipo_envio = searchParams.get("tipo_envio");

    console.log("📊 consolidado-facturas Params recibidos:", {
      numero_lote,
      codigo_habilitacion,
      nombre_ips,
      fecha_inicio,
      fecha_fin,
      nombre_envio,
      tipo_envio,
      role: session.user.role,
    });

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
    // WHERE de vista consolidado
    // ============================================================
    const whereConditions: string[] = [];
    
    if (numero_lote && numero_lote.trim() !== "") {
      whereConditions.push(`numero_lote = ${parseInt(numero_lote)}`);
    } else {
      const lotesWhere = lotesFilters.length > 0 ? lotesFilters.join(" AND ") : "1=1";
      whereConditions.push(`numero_lote IN (SELECT numero_lote FROM control_lotes WHERE ${lotesWhere})`);
    }

    const whereClause = whereConditions.join(" AND ");

    console.log("📊 consolidado_facturas WHERE:", whereClause);

    // Ensure views exist (auto-creates if missing)
    await ensureViewsExist();

    // Query the vista_consolidado_facturas_lote view directly
    const viewName = "vista_consolidado_facturas_lote";
    
    const query = `
      SELECT 
        numero_lote,
        conteo_factura AS "Conteo_Factura",
        total_suma_reclamado AS "Total_Suma_Reclamado",
        con_hallazgos AS "Facturas_con_Hallazgos",
        sin_hallazgos AS "Facturas_sin_Hallazgos",
        conteo_hallazgos_criticos AS "Conteo_Hallazgos_Criticos",
        valor_total_hallazgos_criticos AS "Valor_Total_Hallazgos_Criticos"
      FROM ${viewName}
      WHERE ${whereClause}
      ORDER BY numero_lote DESC
    `;

    console.log(`📝 Query ejecutada:`, query.substring(0, 300) + "...");
    
    let dataResult: any[] = [];
    try {
      const result = await prisma.$queryRawUnsafe<any[]>(query);
      console.log(`✅ Resultados obtenidos:`, result.length);
      dataResult = result;
    } catch (viewError: any) {
      console.error(`❌ Error consultando vista ${viewName}:`, viewError.message);
      
      // If view doesn't exist, try to create it
      if (viewError.message?.includes("does not exist")) {
        console.log("🔧 Vista no encontrada, intentando crearla...");
        try {
          await createConsolidadoFacturasView();
          console.log("✅ Vista creada exitosamente, reintentando consulta...");
          const retryResult = await prisma.$queryRawUnsafe<any[]>(query);
          dataResult = retryResult;
        } catch (createError: any) {
          console.error("❌ Error creando vista:", createError.message);
          return NextResponse.json(
            { 
              error: "No se encontró la vista consolidado_facturas y no se pudo crear.",
              details: createError.message 
            },
            { status: 404 }
          );
        }
      } else {
        return NextResponse.json(
          { 
            error: "Error al consultar vista consolidado_facturas",
            details: viewError.message 
          },
          { status: 500 }
        );
      }
    }

    // Serialize results
    const serializedData = serializeResults(dataResult);

    // Calcular totales agregados
    const totals = serializedData.reduce((acc, row) => {
      acc.totalFacturas += Number(row.Conteo_Factura || 0);
      acc.totalReclamado += Number(row.Total_Suma_Reclamado || 0);
      acc.totalConHallazgos += Number(row.Facturas_con_Hallazgos || 0);
      acc.totalSinHallazgos += Number(row.Facturas_sin_Hallazgos || 0);
      acc.totalHallazgosCriticos += Number(row.Conteo_Hallazgos_Criticos || 0);
      acc.totalValorHallazgosCriticos += Number(row.Valor_Total_Hallazgos_Criticos || 0);
      return acc;
    }, {
      totalFacturas: 0,
      totalReclamado: 0,
      totalConHallazgos: 0,
      totalSinHallazgos: 0,
      totalHallazgosCriticos: 0,
      totalValorHallazgosCriticos: 0,
    });

    const safeTotals = {
      totalFacturas: Number(totals.totalFacturas) || 0,
      totalReclamado: Number(totals.totalReclamado) || 0,
      totalConHallazgos: Number(totals.totalConHallazgos) || 0,
      totalSinHallazgos: Number(totals.totalSinHallazgos) || 0,
      totalHallazgosCriticos: Number(totals.totalHallazgosCriticos) || 0,
      totalValorHallazgosCriticos: Number(totals.totalValorHallazgosCriticos) || 0,
    };

    return NextResponse.json({
      data: serializedData,
      totals: safeTotals,
      viewName,
    });
  } catch (error: any) {
    console.error("❌ Error fetching consolidado_facturas:", error?.message);
    return NextResponse.json(
      { 
        error: "Error al obtener datos consolidados", 
        details: error.message || String(error),
        type: error.constructor?.name || "UnknownError"
      },
      { status: 500 }
    );
  }
}
