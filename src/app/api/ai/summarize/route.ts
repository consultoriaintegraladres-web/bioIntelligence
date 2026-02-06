import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

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

    // Tomar los primeros 10 hallazgos
    const hallazgosToSummarize = hallazgos.slice(0, 10);

    // Formatear los hallazgos para el prompt
    const hallazgosFormatted = hallazgosToSummarize.map((h: HallazgoDetalle, index: number) => {
      return `
Hallazgo ${index + 1}:
- Tipo de Validación: ${h.tipo_validacion || "N/A"}
- Origen: ${h.origen || "N/A"}
- Descripción del Servicio: ${h.descripcion_servicio || "N/A"}
- Observación: ${h.observacion || "N/A"}
- Número de Factura: ${h.Numero_factura || "N/A"}
- Cantidad: ${h.cantidad || "N/A"}
- Valor Total: ${h.valor_total || "N/A"}
`;
    }).join("\n");

    const prompt = `Eres un experto certificado en auditoría médica y análisis de hallazgos en facturación de servicios de salud por accidentes de tránsito (ECAT), con conocimiento profundo de la normatividad ADRES y el Manual de Auditoría ADRES.

INSTRUCCIONES IMPORTANTES:
- Responde con seguridad y precisión, basándote en la normatividad vigente de ADRES
- NO uses frases como "al parecer", "probablemente", "podría ser" o similares
- Usa lenguaje técnico profesional y preciso
- Cita la normatividad ADRES cuando sea relevante
- Sé directo y seguro en tus afirmaciones

CONTEXTO NORMATIVO:
- Normatividad ADRES para ECAT (Eventos Catastróficos)
- Manual de Auditoría ADRES
- Resolución 3374 de 2000 y normativas relacionadas
- Protocolos de validación de facturación SOAT

Analiza los siguientes hallazgos y proporciona un resumen técnico y profesional de cada uno, explicando con precisión:

1. Qué tipo de inconsistencia representa cada hallazgo según la normatividad ADRES
2. Por qué es relevante para la auditoría de ECAT
3. Qué información clave contiene cada uno y su impacto en la facturación
4. Referencia normativa cuando aplique

Hallazgos a analizar:
${hallazgosFormatted}

Proporciona un resumen estructurado y profesional, numerando cada hallazgo del 1 al ${hallazgosToSummarize.length}. Usa lenguaje técnico preciso y evita cualquier expresión de incertidumbre.`;

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
