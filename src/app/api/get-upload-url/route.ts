import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMultiplePresignedUrls, isR2Configured } from "@/lib/cloudflare-r2";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo ADMIN e IPS pueden cargar archivos
    const userRole = (session.user as any).role;
    if (userRole === "ANALYST") {
      return NextResponse.json(
        { error: "Los analistas no pueden cargar archivos" },
        { status: 403 }
      );
    }

    // Verificar configuración de R2
    if (!isR2Configured()) {
      return NextResponse.json({
        success: false,
        error: "Los servidores de seguridad Bio no están configurados correctamente",
      }, { status: 500 });
    }

    const body = await request.json();
    const { files, nombreIps, idEnvio } = body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "Se requiere al menos un archivo" },
        { status: 400 }
      );
    }

    if (!nombreIps || !idEnvio) {
      return NextResponse.json(
        { error: "Se requiere nombreIps e idEnvio" },
        { status: 400 }
      );
    }

    console.log(`🔑 Generando ${files.length} presigned URLs para ${nombreIps}/${idEnvio}`);

    const result = await getMultiplePresignedUrls(files, nombreIps, idEnvio);

    console.log(`✅ URLs generadas exitosamente`);

    return NextResponse.json({
      success: true,
      folderPath: result.folderPath,
      urls: result.urls,
    });
  } catch (error: any) {
    console.error("Error generating presigned URLs:", error);
    return NextResponse.json(
      { error: "Error al generar URLs de carga", details: error?.message },
      { status: 500 }
    );
  }
}
