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
    const lote = searchParams.get("lote");

    if (!lote) {
      return NextResponse.json({ exists: false });
    }

    // Check if the lote exists
    const result = await prisma.$queryRawUnsafe<{ count: number }[]>(`
      SELECT COUNT(*) as count 
      FROM inconsistencias 
      WHERE lote_de_carga = '${lote}'
      LIMIT 1
    `);

    const exists = Number(result[0]?.count || 0) > 0;

    return NextResponse.json({
      success: true,
      exists,
      lote,
    });
  } catch (error) {
    console.error("Error validating lote:", error);
    return NextResponse.json(
      { error: "Error al validar lote" },
      { status: 500 }
    );
  }
}
