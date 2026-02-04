import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const numero_lote = searchParams.get("numero_lote");
    const fecha_inicio = searchParams.get("fecha_inicio");
    const fecha_fin = searchParams.get("fecha_fin");
    const nombre_ips = searchParams.get("nombre_ips");
    const codigo_habilitacion = searchParams.get("codigo_habilitacion");
    const nombre_envio = searchParams.get("nombre_envio");

    // Validate date range is max 1 month for non-admin users
    if (fecha_inicio && fecha_fin && session.user.role !== "ADMIN") {
      const startDate = new Date(fecha_inicio);
      const endDate = new Date(fecha_fin);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 31) {
        return NextResponse.json(
          { error: "El rango de fechas no puede exceder 1 mes" },
          { status: 400 }
        );
      }
    }

    // Build where clause
    const where: Prisma.ControlLoteWhereInput = {
      // ALWAYS exclude records where nombre_envio contains "RG"
      NOT: {
        nombre_envio: {
          contains: "RG",
        },
      },
    };

    // Filter by codigo_habilitacion for non-admin users
    if (session.user.role !== "ADMIN" && session.user.codigoHabilitacion) {
      where.codigo_habilitacion = {
        startsWith: session.user.codigoHabilitacion.substring(0, 10),
      };
    } else if (codigo_habilitacion) {
      where.codigo_habilitacion = {
        contains: codigo_habilitacion,
      };
    }

    if (numero_lote) {
      where.numero_lote = parseInt(numero_lote);
    }

    if (fecha_inicio && fecha_fin) {
      where.fecha_creacion = {
        gte: new Date(fecha_inicio),
        lte: new Date(fecha_fin),
      };
    }

    if (nombre_ips) {
      where.nombre_ips = {
        contains: nombre_ips,
      };
    }

    if (nombre_envio) {
      where.AND = [
        { nombre_envio: { contains: nombre_envio } },
        { NOT: { nombre_envio: { contains: "RG" } } },
      ];
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.controlLote.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fecha_creacion: "desc" },
      }),
      prisma.controlLote.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching lotes:", error);
    return NextResponse.json(
      { error: "Error al obtener lotes" },
      { status: 500 }
    );
  }
}
