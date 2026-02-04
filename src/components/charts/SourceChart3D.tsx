"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { ThemeMode } from "@/contexts/app-context";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface SourceChart3DProps {
  data: Array<{
    origen: string;
    cantidad_hallazgos: number;
    valor_total: number;
  }>;
  title?: string;
  themeMode?: ThemeMode;
}

export function SourceChart3D({ data, title = "Análisis por Fuente/Origen", themeMode = "dark" }: SourceChart3DProps) {
  const isLight = themeMode === "light";
  const textColor = isLight ? "#1a1a1a" : "#ffffff";
  const gridColor = isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.15)";

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const origenes = data.map((d) => d.origen || "Sin origen");
    const cantidades = data.map((d) => d.cantidad_hallazgos);
    const valores = data.map((d) => d.valor_total / 1000000);

    // Bubble sizes based on value
    const maxVal = Math.max(...valores, 1);
    const sizes = valores.map((v) => 40 + (v / maxVal) * 80);

    return [
      {
        x: origenes,
        y: cantidades,
        mode: "markers+text" as const,
        type: "scatter" as const,
        text: cantidades.map(c => c.toLocaleString()),
        textposition: "top center" as const,
        textfont: { color: textColor, size: 14, family: "system-ui" },
        marker: {
          size: sizes,
          color: valores,
          colorscale: [
            [0, "rgba(147, 51, 234, 0.8)"],     // Vivid Purple
            [0.5, "rgba(236, 72, 153, 0.85)"],  // Pink
            [1, "rgba(16, 185, 129, 0.9)"],     // Emerald
          ],
          colorbar: {
            title: { text: "Valor (M)", font: { color: textColor, size: 14 } },
            tickfont: { color: textColor, size: 13 },
            bordercolor: "transparent",
            bgcolor: "transparent",
          },
          line: {
            color: isLight ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.3)",
            width: 2,
          },
        },
        hovertemplate: "<b>%{x}</b><br>Hallazgos: %{y:,}<br>Valor: $%{marker.color:.2f}M<extra></extra>",
      },
    ];
  }, [data, isLight, textColor]);

  if (!chartData) {
    return (
      <div className={`flex items-center justify-center h-full text-lg ${isLight ? "text-gray-500" : "text-gray-400"}`}>
        No hay datos disponibles
      </div>
    );
  }

  return (
    <Plot
      data={chartData}
      layout={{
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: textColor, family: "system-ui, -apple-system, sans-serif", size: 14 },
        xaxis: {
          title: { text: "Origen / Fuente", font: { size: 16, color: textColor } },
          tickfont: { size: 14, color: textColor },
          gridcolor: gridColor,
          tickangle: -30,
        },
        yaxis: {
          title: { text: "Cantidad de Hallazgos", font: { size: 16, color: textColor } },
          tickfont: { size: 14, color: textColor },
          gridcolor: gridColor,
        },
        margin: { l: 90, r: 130, t: 40, b: 120 },
        hoverlabel: {
          bgcolor: isLight ? "#ffffff" : "#1e1e2e",
          bordercolor: "#9333EA",
          font: { color: isLight ? "#1a1a1a" : "#fff", size: 14 },
        },
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
