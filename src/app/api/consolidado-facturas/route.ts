import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Helper to convert BigInt and Decimal values to Numbers
function serializeResults(data: any[]): any[] {
  return data.map((row) => {
    const serialized: any = {};
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === "bigint") {
        serialized[key] = Number(value);
      } else if (value !== null && value !== undefined && typeof value === "object" && typeof value.toNumber === "function") {
        serialized[key] = value.toNumber();
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

    // ============================================================
    // FILTROS DE control_lotes (igual que revision-facturas)
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
    // WHERE de vista consolidado
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

    const whereClause = whereConditions.join(" AND ");

    console.log("📊 consolidado_facturas WHERE:", whereClause);

    // Query para obtener datos de la vista consolidado
    // Intentamos diferentes nombres posibles de la vista basados en la imagen
    const possibleViewNames = [
      "vista_consolidado_facturas_lote",
      "vista_consolidado_facturas",
      "consolidado_facturas_lote",
      "consolidado_facturas",
      "vista_consolidado_facturas_l",
      "vista_consolidado_facturas_lotes"
    ];

    let dataResult: any[] = [];
    let viewName = "";
    let lastError: any = null;

    for (const view of possibleViewNames) {
      try {
        const query = `
          SELECT 
            numero_lote,
            Conteo_Factura,
            Total_Suma_Reclamado,
            Facturas_con_Hallazgos,
            Facturas_sin_Hallazgos,
            Conteo_Hallazgos_Criticos,
            Valor_Total_Hallazgos_Criticos
          FROM ${view}
          WHERE ${whereClause}
          ORDER BY numero_lote DESC
        `;
        
        const result = await prisma.$queryRawUnsafe<any[]>(query);
        dataResult = result;
        viewName = view;
        break;
      } catch (error: any) {
        lastError = error;
        // Si la vista no existe, continuar con la siguiente
        if (error.message?.includes("doesn't exist") || 
            error.message?.includes("Unknown table") ||
            error.message?.includes("Table") && error.message?.includes("doesn't exist")) {
          continue;
        }
        // Si es otro tipo de error, lanzarlo
        throw error;
      }
    }

    if (!viewName) {
      console.error("❌ No se encontró la vista consolidado. Último error:", lastError?.message);
      return NextResponse.json(
        { 
          error: "No se encontró la vista consolidado_facturas. Verifique el nombre de la vista en la base de datos.",
          details: lastError?.message 
        },
        { status: 404 }
      );
    }

    console.log(`✅ Vista encontrada: ${viewName}`);

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

    return NextResponse.json({
      data: serializedData,
      totals,
    });
  } catch (error: any) {
    console.error("❌ Error fetching consolidado_facturas:", error.message);
    console.error("❌ Stack:", error.stack);
    return NextResponse.json(
      { error: "Error al obtener datos consolidados", details: error.message },
      { status: 500 }
    );
  }
}
