import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const userCodigoHabilitacion = (session.user as any).codigoHabilitacion;

    let whereClause: any = {};

    // IPS solo ve sus propios envíos
    if (userRole === "USER") {
      whereClause.codigo_habilitacion = userCodigoHabilitacion;
    }
    // ADMIN y ANALYST ven todos los envíos

    const envios = await prisma.controlEnvioIps.findMany({
      where: whereClause,
      orderBy: {
        fecha_carga: "desc",
      },
    });

    // Formatear datos para la respuesta
    const formattedEnvios = envios.map((envio) => ({
      id: envio.id,
      codigoHabilitacion: envio.codigo_habilitacion,
      nombreIps: envio.nombre_ips,
      nombreArchivo: envio.nombre_archivo,
      cantidadFacturas: envio.cantidad_facturas,
      cantidadItems: envio.cantidad_items,
      valorTotal: Number(envio.valor_total),
      rutaDrive: envio.ruta_drive,
      estado: envio.estado,
      fechaCarga: envio.fecha_carga,
      fechaProcesado: envio.fecha_procesado,
      procesadoPor: envio.procesado_por,
    }));

    return NextResponse.json({
      success: true,
      data: formattedEnvios,
      total: formattedEnvios.length,
    });
  } catch (error) {
    console.error("Error fetching envios:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
