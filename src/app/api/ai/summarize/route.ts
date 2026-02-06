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

    const prompt = `Eres un experto en auditoría médica y análisis de hallazgos en facturación de servicios de salud. 

Analiza los siguientes hallazgos y proporciona un resumen claro y conciso de cada uno, explicando en qué consiste cada tipo de hallazgo y por qué es importante.

Resume los hallazgos de manera que sea fácil de entender para personal no técnico, explicando:
1. Qué tipo de inconsistencia representa cada hallazgo
2. Por qué es relevante para la auditoría
3. Qué información clave contiene cada uno

Hallazgos a analizar:
${hallazgosFormatted}

Proporciona un resumen estructurado, numerando cada hallazgo del 1 al ${hallazgosToSummarize.length}.`;

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "API key de Gemini no configurada" },
        { status: 500 }
      );
    }

    // Llamar a Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
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
      try {
        const errorJson = JSON.parse(errorData);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        // Si no es JSON, usar el texto directamente
        errorMessage = errorData || errorMessage;
      }
      console.error("Error de Gemini API:", errorData);
      return NextResponse.json(
        { error: errorMessage },
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
