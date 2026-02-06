import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Helper to convert BigInt and Decimal values to Numbers
function serializeResults(results: any[]) {
  return results.map(row => {
    const serialized: any = {};
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === "bigint") {
        serialized[key] = Number(value);
      } else if (value !== null && value !== undefined && typeof value === "object" && typeof (value as any).toNumber === "function") {
        serialized[key] = (value as any).toNumber();
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
    const tipo_envio = searchParams.get("tipo_envio"); // 'Primera vez' o 'Revalidacion'
    const numero_lote = searchParams.get("numero_lote");
    const numero_factura = searchParams.get("numero_factura");
    const limit = searchParams.get("limit") || "5000";
    const page = searchParams.get("page") || "1";

    // ============================================================
    // LÓGICA SIMPLE: filtrar inconsistencias por Numero_factura
    // y lote_de_carga (numero_lote de la vista revision_facturas)
    // ============================================================
    const conditions: string[] = [];

    // Filtro principal: solo hallazgos con mostrar_reporte = 1
    conditions.push("p.mostrar_reporte = 1");

    // Filtrar por Numero_factura (obligatorio para este endpoint)
    // Usar TRIM porque Numero_factura en inconsistencias es LongText y puede tener espacios
    if (numero_factura && numero_factura.trim() !== "") {
      conditions.push(`TRIM(i.Numero_factura) = TRIM('${numero_factura.trim()}')`);
    }

    // Filtrar por numero_lote (que mapea a lote_de_carga en inconsistencias)
    if (numero_lote && numero_lote.trim() !== "") {
      conditions.push(`TRIM(i.lote_de_carga) = TRIM('${numero_lote.trim()}')`);
    }

    // Seguridad: para usuarios no ADMIN, restringir por código habilitación
    if (session.user.role !== "ADMIN") {
      const userCodigo = session.user.codigoHabilitacion?.substring(0, 10) || "";
      if (userCodigo) {
        conditions.push(`i.Codigo_habilitacion_prestador_servicios_salud LIKE '${userCodigo}%'`);
      }
    }

    const whereClause = conditions.length > 0 ? conditions.join(" AND ") : "1=1";

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Count query
    const countQuery = `
      SELECT CAST(COUNT(*) AS SIGNED) as total
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
      LIMIT ${parseInt(limit)} OFFSET ${skip}
    `;

    console.log("[hallazgos-by-tipo-envio] Params:", { tipo_envio, numero_lote, numero_factura });
    console.log("[hallazgos-by-tipo-envio] WHERE:", whereClause);

    const [countResult, dataResult] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(countQuery),
      prisma.$queryRawUnsafe<any[]>(dataQuery),
    ]);

    const serializedCount = serializeResults(countResult);
    const serializedData = serializeResults(dataResult);
    const total = serializedCount[0]?.total || 0;

    console.log("[hallazgos-by-tipo-envio] Total encontrados:", total);

    return NextResponse.json({
      data: serializedData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error: any) {
    console.error("Error fetching hallazgos by tipo_envio:", error);
    return NextResponse.json(
      { error: "Error al obtener hallazgos", details: error.message },
      { status: 500 }
    );
  }
}
