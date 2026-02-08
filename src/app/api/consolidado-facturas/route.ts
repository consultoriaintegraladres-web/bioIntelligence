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
    // FILTROS DE control_lotes (igual que revision-facturas)
    // ============================================================
    const lotesFilters: string[] = [];
    
    // Excluir RG - COLLATE para evitar conflicto de collation
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

      // Buscar columnas por patrones (case-insensitive)
      const findColumn = (patterns: string[]) => {
        return columnNames.find(col => {
          const colLower = col.toLowerCase();
          return patterns.some(pattern => colLower.includes(pattern.toLowerCase()));
        }) || columnNames[0]; // Fallback a primera columna si no se encuentra
      };

      const conteoFactura = columnMap['Conteo_Factura'] || findColumn(['conteo', 'factura']);
      const totalReclamado = columnMap['Total_Suma_Reclamado'] || findColumn(['total', 'reclamado', 'suma']);
      const conHallazgos = columnMap['Facturas_con_Hallazgos'] || findColumn(['con', 'hallazgo']);
      const sinHallazgos = columnMap['Facturas_sin_Hallazgos'] || findColumn(['sin', 'hallazgo']);
      const hallazgosCriticos = columnMap['Conteo_Hallazgos_Criticos'] || findColumn(['critico', 'hallazgo']);
      const valorCriticos = columnMap['Valor_Total_Hallazgos_Criticos'] || findColumn(['valor', 'critico']);

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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/660cc560-af41-44a9-be17-cf7d8435b0ac',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'consolidado-facturas/route.ts:218',message:'Query results count',data:{count:result.length,viewName},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/660cc560-af41-44a9-be17-cf7d8435b0ac',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'consolidado-facturas/route.ts:260',message:'Totals calculated',data:{totals,serializedCount:serializedData.length,firstRow:serializedData[0]},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Asegurar que todos los valores numéricos sean números, no BigInt
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
      viewName, // Para debug
    });
  } catch (error: any) {
    console.error("❌ Error fetching consolidado_facturas:", error?.message);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/660cc560-af41-44a9-be17-cf7d8435b0ac',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'consolidado-facturas/route.ts:catch',message:'API error caught',data:{errorMessage:error?.message,errorName:error?.constructor?.name},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
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
