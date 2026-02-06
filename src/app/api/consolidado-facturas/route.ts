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
      const lotesWhere = lotesFilters.length > 0 ? lotesFilters.join(" AND ") : "1=1";
      whereConditions.push(`numero_lote IN (SELECT numero_lote FROM control_lotes WHERE ${lotesWhere})`);
    }

    const whereClause = whereConditions.join(" AND ");

    console.log("📊 consolidado_facturas WHERE:", whereClause);
    console.log("📊 consolidado_facturas lotesFilters:", lotesFilters);

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

    // Primero intentar obtener la estructura de la vista para conocer los nombres de columnas
    let viewName = "";
    let columnNames: string[] = [];
    
    // Intentar obtener las columnas de la vista
    for (const view of possibleViewNames) {
      try {
        // Primero intentar SELECT * para ver qué columnas tiene
        const testQuery = `SELECT * FROM ${view} LIMIT 1`;
        const testResult = await prisma.$queryRawUnsafe<any[]>(testQuery);
        if (testResult && testResult.length > 0) {
          columnNames = Object.keys(testResult[0]);
          viewName = view;
          console.log(`✅ Vista ${view} encontrada. Columnas:`, columnNames);
          break;
        }
      } catch (error: any) {
        lastError = error;
        if (error.message?.includes("doesn't exist") || 
            error.message?.includes("Unknown table") ||
            error.message?.includes("does not exist")) {
          continue;
        }
        // Si es error de columna, la vista existe pero con diferentes nombres
        if (error.message?.includes("Unknown column")) {
          console.log(`⚠️ Vista ${view} existe pero con columnas diferentes`);
          continue;
        }
      }
    }

    // Si encontramos la vista, construir la query con los nombres correctos
    if (viewName && columnNames.length > 0) {
      // Mapear nombres esperados a nombres reales (case-insensitive)
      const columnMap: { [key: string]: string } = {};
      const expectedColumns = [
        'Conteo_Factura', 'conteo_factura', 'ConteoFactura', 'conteoFactura',
        'Total_Suma_Reclamado', 'total_suma_reclamado', 'TotalSumaReclamado', 'totalSumaReclamado',
        'Facturas_con_Hallazgos', 'facturas_con_hallazgos', 'FacturasConHallazgos', 'facturasConHallazgos',
        'Facturas_sin_Hallazgos', 'facturas_sin_hallazgos', 'FacturasSinHallazgos', 'facturasSinHallazgos',
        'Conteo_Hallazgos_Criticos', 'conteo_hallazgos_criticos', 'ConteoHallazgosCriticos', 'conteoHallazgosCriticos',
        'Valor_Total_Hallazgos_Criticos', 'valor_total_hallazgos_criticos', 'ValorTotalHallazgosCriticos', 'valorTotalHallazgosCriticos'
      ];

      // Buscar coincidencias (case-insensitive)
      for (const expected of expectedColumns) {
        const found = columnNames.find(col => col.toLowerCase() === expected.toLowerCase());
        if (found) {
          columnMap[expected] = found;
        }
      }

      // Si no encontramos coincidencias, usar los nombres tal cual están en la vista
      const conteoFactura = columnMap['Conteo_Factura'] || columnNames.find(c => c.toLowerCase().includes('conteo') && c.toLowerCase().includes('factura')) || columnNames[1];
      const totalReclamado = columnMap['Total_Suma_Reclamado'] || columnNames.find(c => c.toLowerCase().includes('total') && c.toLowerCase().includes('reclamado')) || columnNames[2];
      const conHallazgos = columnMap['Facturas_con_Hallazgos'] || columnNames.find(c => c.toLowerCase().includes('con') && c.toLowerCase().includes('hallazgo')) || columnNames[3];
      const sinHallazgos = columnMap['Facturas_sin_Hallazgos'] || columnNames.find(c => c.toLowerCase().includes('sin') && c.toLowerCase().includes('hallazgo')) || columnNames[4];
      const hallazgosCriticos = columnMap['Conteo_Hallazgos_Criticos'] || columnNames.find(c => c.toLowerCase().includes('critico')) || columnNames[5];
      const valorCriticos = columnMap['Valor_Total_Hallazgos_Criticos'] || columnNames.find(c => c.toLowerCase().includes('valor') && c.toLowerCase().includes('critico')) || columnNames[6];

      console.log(`📊 Columnas mapeadas:`, {
        conteoFactura,
        totalReclamado,
        conHallazgos,
        sinHallazgos,
        hallazgosCriticos,
        valorCriticos
      });

      const query = `
        SELECT 
          numero_lote,
          \`${conteoFactura}\` as Conteo_Factura,
          \`${totalReclamado}\` as Total_Suma_Reclamado,
          \`${conHallazgos}\` as Facturas_con_Hallazgos,
          \`${sinHallazgos}\` as Facturas_sin_Hallazgos,
          \`${hallazgosCriticos}\` as Conteo_Hallazgos_Criticos,
          \`${valorCriticos}\` as Valor_Total_Hallazgos_Criticos
        FROM ${viewName}
        WHERE ${whereClause}
        ORDER BY numero_lote DESC
      `;

      console.log(`📝 Query ejecutada:`, query.substring(0, 300) + "...");
      
      const result = await prisma.$queryRawUnsafe<any[]>(query);
      console.log(`✅ Resultados obtenidos:`, result.length);
      if (result.length > 0) {
        console.log(`📊 Primer resultado:`, JSON.stringify(result[0], null, 2));
      }
      dataResult = result;
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

    console.log("📊 Datos serializados:", serializedData.length, "registros");
    console.log("📊 Primer registro:", serializedData[0]);

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

    console.log("📊 Totales calculados:", totals);

    return NextResponse.json({
      data: serializedData,
      totals,
      viewName, // Para debug
    });
  } catch (error: any) {
    console.error("❌ Error fetching consolidado_facturas:", error);
    console.error("❌ Error message:", error.message);
    console.error("❌ Error stack:", error.stack);
    console.error("❌ Error completo:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
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
