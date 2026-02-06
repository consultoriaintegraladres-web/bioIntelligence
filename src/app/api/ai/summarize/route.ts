import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface HallazgoDetalle {
  inconsistencia_id: number;
  Numero_factura: string | null;
  origen: string | null;
  tipo_validacion: string | null;
  observacion: string | null;
  descripcion_servicio: string | null;
  cantidad: number | null;
  valor_unitario: string | null;
  valor_total: string | null;
}

export async function POST(request: NextRequest) {
  try {
    // Log temporal para diagnosticar variables de entorno
    console.log("🔍 Variables de entorno disponibles:", {
      hasGEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
      nodeEnv: process.env.NODE_ENV,
      allEnvKeys: Object.keys(process.env).filter(k => k.includes("GEMINI") || k.includes("NEXT")).join(", ")
    });

    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { hallazgos } = await request.json();

    if (!hallazgos || !Array.isArray(hallazgos) || hallazgos.length === 0) {
      return NextResponse.json(
        { error: "No se proporcionaron hallazgos para resumir" },
        { status: 400 }
      );
    }

    // Tomar máximo 1000 hallazgos para análisis
    const hallazgosToSummarize = hallazgos.slice(0, Math.min(1000, hallazgos.length));

    // Formatear los hallazgos para el prompt
    const hallazgosFormatted = hallazgosToSummarize.map((h: HallazgoDetalle, index: number) => {
      return `[${index + 1}] Tipo: ${h.tipo_validacion || "N/A"} | Origen: ${h.origen || "N/A"} | Observación: ${h.observacion || "N/A"} | Factura: ${h.Numero_factura || "N/A"} | Valor: ${h.valor_total || "N/A"}`;
    }).join("\n");

    const totalHallazgos = hallazgos.length;
    const analizados = hallazgosToSummarize.length;

    // Obtener el prompt personalizado desde la base de datos
    let promptTemplate = "";
    try {
      const promptRecord = await prisma.aIPrompt.findFirst({
        orderBy: {
          updated_at: "desc",
        },
      });
      promptTemplate = promptRecord?.prompt_text || "";
    } catch (error) {
      console.error("Error loading prompt from database:", error);
    }

    // Si no hay prompt personalizado, usar el por defecto
    if (!promptTemplate) {
      promptTemplate = `Eres un experto certificado en normatividad ECAT Colombia ADRES y Manual de Auditoría de Reclamaciones Personas Jurídicas, especializado en análisis de hallazgos de auditoría médica.

INSTRUCCIONES CRÍTICAS:
- Analiza y agrupa los hallazgos por tipologías o casuísticas similares
- Identifica MÁXIMO 5 tipologías diferentes (si solo hay una, muestra solo una)
- NO expliques cada hallazgo individualmente
- NO uses frases como "aparentemente", "sugiere", "probablemente", "podría ser", "parece que"
- Habla con seguridad y precisión técnica, como experto en normatividad ADRES
- Usa lenguaje técnico profesional y directo
- Cita normativas ADRES cuando sea relevante

CONTEXTO NORMATIVO:
- Normatividad ADRES para ECAT (Eventos Catastróficos)
- Manual de Auditoría de Reclamaciones Personas Jurídicas ADRES
- Resolución 3374 de 2000 y normativas relacionadas
- Protocolos de validación de facturación SOAT

TAREA:
Analiza los siguientes {totalHallazgos} hallazgos (de un total de {totalHallazgos}) y agrupa por tipologías similares de errores o inconsistencias.

Para cada tipología identificada, proporciona:
1. Nombre de la tipología (título descriptivo y técnico)
2. Descripción técnica de la inconsistencia según normatividad ADRES
3. Cantidad aproximada de hallazgos que pertenecen a esta tipología
4. Normativa ADRES aplicable (si aplica)
5. Impacto en la auditoría ECAT

FORMATO DE RESPUESTA:
Usa el siguiente formato para cada tipología:

**TIPOLOGÍA [Número]: [Nombre de la Tipología]**
- Descripción: [Descripción técnica precisa]
- Cantidad de casos: [Aproximadamente X hallazgos]
- Normativa aplicable: [Citar normativa ADRES si aplica]
- Impacto: [Impacto en auditoría ECAT]

Hallazgos a analizar:
{hallazgos}

IMPORTANTE: Si todos los hallazgos pertenecen a una sola tipología, muestra solo una. Si hay múltiples tipologías, agrupa hasta máximo 5. Responde con seguridad técnica, sin expresiones de duda.`;
    }

    // Reemplazar variables en el prompt
    const prompt = promptTemplate
      .replace(/{totalHallazgos}/g, totalHallazgos.toString())
      .replace(/{hallazgos}/g, hallazgosFormatted);

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY no está configurada en las variables de entorno");
      return NextResponse.json(
        { error: "API key de Gemini no configurada. Verifica que GEMINI_API_KEY esté en las variables de entorno." },
        { status: 500 }
      );
    }

    // Log para verificar que la API key está presente (sin mostrar el valor completo)
    console.log(`✅ GEMINI_API_KEY encontrada: ${GEMINI_API_KEY.substring(0, 10)}...`);

    // Llamar a Gemini API - Usando gemini-2.0-flash (modelo rápido y estable)
    // Modelos disponibles: gemini-3-flash-preview, gemini-2.5-flash, gemini-2.0-flash
    const modelName = "gemini-2.0-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      let errorMessage = "Error al comunicarse con la API de Gemini";
      let errorDetails: any = {};
      
      try {
        const errorJson = JSON.parse(errorData);
        errorMessage = errorJson.error?.message || errorMessage;
        errorDetails = errorJson.error || {};
        console.error(`❌ Error de Gemini API (modelo: ${modelName}):`, {
          message: errorMessage,
          code: errorDetails.code,
          status: errorDetails.status,
          fullError: errorJson
        });
      } catch {
        // Si no es JSON, usar el texto directamente
        errorMessage = errorData || errorMessage;
        console.error(`❌ Error de Gemini API (modelo: ${modelName}):`, errorData);
      }
      
      // Mensaje más descriptivo para el usuario
      if (errorMessage.includes("not found") || errorMessage.includes("not supported")) {
        errorMessage = `El modelo "${modelName}" no está disponible. Verifica que tu API key tenga acceso a este modelo o que el nombre del modelo sea correcto.`;
      } else if (errorMessage.includes("API key")) {
        errorMessage = "API key inválida o sin permisos. Verifica tu GEMINI_API_KEY en las variables de entorno.";
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          modelUsed: modelName,
          details: process.env.NODE_ENV === "development" ? errorDetails : undefined
        },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      return NextResponse.json(
        { error: "Respuesta inválida de Gemini API" },
        { status: 500 }
      );
    }

    const summary = data.candidates[0].content.parts[0].text;

    return NextResponse.json({
      summary,
      totalHallazgos: hallazgos.length,
      resumidos: hallazgosToSummarize.length,
    });
  } catch (error: any) {
    console.error("Error al resumir hallazgos:", error);
    return NextResponse.json(
      { error: error.message || "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
