import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Obtener el prompt actual
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo ADMIN puede ver prompts
    const userRole = (session.user as any).role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    // Obtener el prompt más reciente
    const promptRecord = await prisma.aIPrompt.findFirst({
      orderBy: {
        updated_at: "desc",
      },
    });

    return NextResponse.json({
      prompt: promptRecord?.prompt_text || null,
      updated_at: promptRecord?.updated_at || null,
      updated_by: promptRecord?.updated_by || null,
    });
  } catch (error: any) {
    console.error("Error fetching prompt:", error);
    return NextResponse.json(
      { error: "Error al obtener el prompt" },
      { status: 500 }
    );
  }
}

// POST: Guardar o actualizar el prompt
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo ADMIN puede guardar prompts
    const userRole = (session.user as any).role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "El prompt no puede estar vacío" },
        { status: 400 }
      );
    }

    // Obtener el prompt más reciente
    const existingPrompt = await prisma.aIPrompt.findFirst({
      orderBy: {
        updated_at: "desc",
      },
    });

    const userEmail = session.user.email || "unknown";

    if (existingPrompt) {
      // Actualizar el prompt existente
      await prisma.aIPrompt.update({
        where: { id: existingPrompt.id },
        data: {
          prompt_text: prompt.trim(),
          updated_by: userEmail,
        },
      });
    } else {
      // Crear nuevo prompt
      await prisma.aIPrompt.create({
        data: {
          prompt_text: prompt.trim(),
          updated_by: userEmail,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Prompt guardado exitosamente",
    });
  } catch (error: any) {
    console.error("Error saving prompt:", error);
    return NextResponse.json(
      { error: "Error al guardar el prompt" },
      { status: 500 }
    );
  }
}
