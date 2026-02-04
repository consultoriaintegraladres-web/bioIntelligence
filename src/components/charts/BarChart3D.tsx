"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { ThemeMode } from "@/contexts/app-context";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface BarChart3DProps {
  data: Array<{
    name: string;
    cantidad: number;
    valor: number;
  }>;
  title?: string;
  themeMode?: ThemeMode;
}

export function BarChart3D({ data, title = "Distribución por Tipo de Validación", themeMode = "dark" }: BarChart3DProps) {
  const isLight = themeMode === "light";
  const textColor = isLight ? "#1a1a1a" : "#ffffff";
  const gridColor = isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Truncate labels - max 60 chars, split in 2 lines if needed
    const labels = data.slice(0, 12).map((d) => {
      if (d.name.length <= 30) return d.name;
      if (d.name.length <= 60) {
        const mid = Math.ceil(d.name.length / 2);
        const spaceIndex = d.name.lastIndexOf(' ', mid);
        if (spaceIndex > 10) {
          return d.name.substring(0, spaceIndex) + '<br>' + d.name.substring(spaceIndex + 1);
        }
        return d.name.substring(0, 30) + '<br>' + d.name.substring(30, 60);
      }
      return d.name.substring(0, 57) + "...";
    });
    const cantidades = data.slice(0, 12).map((d) => d.cantidad);
    const valores = data.slice(0, 12).map((d) => d.valor / 1000000);

    // FUTURISTIC GRADIENT COLORS - Neon effect
    const colors = cantidades.map((_, i) => {
      const ratio = i / cantidades.length;
      // From vivid purple to emerald green
      const r = Math.round(147 - ratio * 100);
      const g = Math.round(51 + ratio * 134);
      const b = Math.round(234 - ratio * 100);
      return `rgba(${r}, ${g}, ${b}, 0.9)`;
    });

    return [
      {
        x: labels,
        y: cantidades,
        type: "bar" as const,
        marker: {
          color: colors,
          line: {
            color: "rgba(147, 51, 234, 0.8)",
            width: 1.5,
          },
        },
        text: cantidades.map(c => c.toLocaleString()),
        textposition: "outside" as const,
        textfont: { color: textColor, size: 13 },
        hovertemplate: "<b>%{x}</b><br>Cantidad: %{y:,}<extra></extra>",
      },
    ];
  }, [data, textColor]);

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
          tickangle: -45,
          tickfont: { size: 12, color: textColor },
          gridcolor: gridColor,
          showgrid: false,
          automargin: true,
        },
        yaxis: {
          title: { text: "Cantidad de Hallazgos", font: { size: 15, color: textColor } },
          tickfont: { size: 13, color: textColor },
          gridcolor: gridColor,
        },
        margin: { l: 80, r: 40, t: 40, b: 180 },
        bargap: 0.25,
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
