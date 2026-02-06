"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAppContext } from "@/contexts/app-context";

export default function AdminPromptsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { themeMode } = useAppContext();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isLight = themeMode === "light";
  const bgColor = isLight ? "bg-white" : "bg-[#12121a]";
  const borderColor = isLight ? "border-gray-200" : "border-[#1e1e2e]";
  const textColor = isLight ? "text-gray-900" : "text-white";
  const subTextColor = isLight ? "text-gray-600" : "text-gray-400";

  useEffect(() => {
    // Verificar que sea admin
    if (session && (session.user as any)?.role !== "ADMIN") {
      router.push("/resumen");
      return;
    }

    // Cargar prompt actual
    loadPrompt();
  }, [session, router]);

  const loadPrompt = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/prompts");
      if (response.ok) {
        const data = await response.json();
        setPrompt(data.prompt || "");
      } else {
        // Si no existe, usar el prompt por defecto
        setPrompt(getDefaultPrompt());
      }
    } catch (error) {
      console.error("Error loading prompt:", error);
      setPrompt(getDefaultPrompt());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultPrompt = () => {
    return `Eres un experto certificado en normatividad ECAT Colombia ADRES y Manual de Auditoría de Reclamaciones Personas Jurídicas, especializado en análisis de hallazgos de auditoría médica.

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
  };

  const handleSave = async () => {
    if (!prompt.trim()) {
      setMessage({ type: "error", text: "El prompt no puede estar vacío" });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      const response = await fetch("/api/admin/prompts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Prompt guardado exitosamente" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await response.json();
        setMessage({ type: "error", text: error.error || "Error al guardar el prompt" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error al guardar el prompt" });
    } finally {
      setSaving(false);
    }
  };

  if (!session || (session.user as any)?.role !== "ADMIN") {
    return null;
  }

  return (
    <div className={`min-h-screen ${bgColor} p-6`}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className={`text-3xl font-bold ${textColor} mb-2`}>
            Administrador de Prompts de IA
          </h1>
          <p className={subTextColor}>
            Configura el prompt que se enviará a Gemini AI para analizar hallazgos
          </p>
        </div>

        {message && (
          <Alert
            className={`mb-4 ${
              message.type === "success"
                ? "bg-green-500/10 border-green-500/50"
                : "bg-red-500/10 border-red-500/50"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            <AlertDescription className={textColor}>{message.text}</AlertDescription>
          </Alert>
        )}

        <Card className={`${bgColor} ${borderColor} border`}>
          <CardHeader>
            <CardTitle className={textColor}>Prompt de Gemini AI</CardTitle>
            <CardDescription className={subTextColor}>
              Variables disponibles: {"{totalHallazgos}"}, {"{hallazgos}"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
              </div>
            ) : (
              <>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className={`min-h-[500px] ${bgColor} ${textColor} ${borderColor} font-mono text-sm`}
                  placeholder="Escribe el prompt aquí..."
                />
                <div className="mt-4 flex justify-end gap-3">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Guardar Prompt
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
