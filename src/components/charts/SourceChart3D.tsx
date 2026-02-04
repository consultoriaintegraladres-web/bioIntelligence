"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { ThemeMode } from "@/contexts/app-context";
import type { Data } from "plotly.js";

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

    // Sort by valor_total (descending)
    const sortedData = [...data].sort((a, b) => b.valor_total - a.valor_total);

    const origenes = sortedData.map((d) => d.origen || "Sin origen");
    const cantidades = sortedData.map((d) => d.cantidad_hallazgos);
    const valores = sortedData.map((d) => d.valor_total);
    const valoresMillones = sortedData.map((d) => d.valor_total / 1000000);

    // Format value for display
    const formatValue = (v: number) => {
      if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
      if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
      return `$${v.toFixed(0)}`;
    };

    // Bubble sizes based on value
    const maxVal = Math.max(...valoresMillones, 1);
    const sizes = valoresMillones.map((v) => 40 + (v / maxVal) * 80);

    return [
      {
        x: origenes,
        y: valoresMillones,
        mode: "text+markers" as const,
        type: "scatter" as const,
        text: sortedData.map((d, i) => `${formatValue(valores[i])}<br>(${cantidades[i].toLocaleString()})`),
        textposition: "top center" as const,
        textfont: { color: textColor, size: 12, family: "system-ui" },
        marker: {
          size: sizes,
          color: valoresMillones,
          colorscale: "Viridis" as const,
          showscale: true,
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
        hovertemplate: sortedData.map((d, i) => 
          `<b>${origenes[i]}</b><br>` +
          `Valor: ${formatValue(valores[i])}<br>` +
          `Cantidad: ${cantidades[i].toLocaleString()}<extra></extra>`
        ),
      },
    ] as Data[];
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
          title: { text: "Valor (Millones $)", font: { size: 16, color: textColor } },
          tickfont: { size: 14, color: textColor },
          gridcolor: gridColor,
          tickformat: ",.1f",
          ticksuffix: "M",
        },
        margin: { l: 90, r: 130, t: 60, b: 120 },
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
