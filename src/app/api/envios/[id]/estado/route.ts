import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo ADMIN puede cambiar el estado
    const userRole = (session.user as any).role;
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo los administradores pueden cambiar el estado de los envíos" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const envioId = parseInt(id, 10);
    if (isNaN(envioId)) {
      return NextResponse.json(
        { error: "ID de envío inválido" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { estado } = body;

    if (!estado || !["EN_PROCESO", "FINALIZADO"].includes(estado)) {
      return NextResponse.json(
        { error: "Estado inválido. Debe ser EN_PROCESO o FINALIZADO" },
        { status: 400 }
      );
    }

    // Verificar que el envío existe
    const existingEnvio = await prisma.controlEnvioIps.findUnique({
      where: { id: envioId },
    });

    if (!existingEnvio) {
      return NextResponse.json(
        { error: "Envío no encontrado" },
        { status: 404 }
      );
    }

    // Actualizar el estado
    const updatedEnvio = await prisma.controlEnvioIps.update({
      where: { id: envioId },
      data: {
        estado,
        fecha_procesado: estado === "FINALIZADO" ? new Date() : null,
        procesado_por: estado === "FINALIZADO" ? session.user.email : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Estado actualizado a ${estado}`,
      data: {
        id: updatedEnvio.id,
        estado: updatedEnvio.estado,
        fechaProcesado: updatedEnvio.fecha_procesado,
        procesadoPor: updatedEnvio.procesado_por,
      },
    });
  } catch (error) {
    console.error("Error updating envio status:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
