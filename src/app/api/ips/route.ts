import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    // Get distinct IPS names from control_lotes
    const result = await prisma.$queryRawUnsafe<{ nombre_ips: string }[]>(`
      SELECT DISTINCT nombre_ips 
      FROM control_lotes 
      WHERE nombre_ips IS NOT NULL 
        AND nombre_ips != ''
        ${search ? `AND nombre_ips LIKE '%${search}%' COLLATE utf8mb4_general_ci` : ""}
      ORDER BY nombre_ips
      LIMIT 20
    `);

    return NextResponse.json({
      success: true,
      data: result.map((r) => r.nombre_ips).filter(Boolean),
    });
  } catch (error) {
    console.error("Error fetching IPS:", error);
    return NextResponse.json(
      { error: "Error al obtener IPS" },
      { status: 500 }
    );
  }
}
