"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { ThemeMode } from "@/contexts/app-context";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface PieChart3DProps {
  data: Array<{
    name: string;
    value: number;
    cantidad?: number;
  }>;
  title?: string;
  themeMode?: ThemeMode;
}

export function PieChart3D({ data, title = "Distribución de Hallazgos", themeMode = "dark" }: PieChart3DProps) {
  const isLight = themeMode === "light";
  const textColor = isLight ? "#1a1a1a" : "#ffffff";

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Sort by value (descending) and take top 10
    const sortedData = [...data].sort((a, b) => b.value - a.value).slice(0, 10);
    
    // Format value for display
    const formatValue = (v: number) => {
      if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
      if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
      return `$${v.toFixed(0)}`;
    };
    
    // Truncate labels to max 60 chars, split in 2 lines if needed
    const labels = sortedData.map((d) => {
      if (d.name.length <= 30) return d.name;
      if (d.name.length <= 60) {
        // Split in 2 lines
        const mid = Math.ceil(d.name.length / 2);
        const spaceIndex = d.name.lastIndexOf(' ', mid);
        if (spaceIndex > 10) {
          return d.name.substring(0, spaceIndex) + '<br>' + d.name.substring(spaceIndex + 1);
        }
        return d.name.substring(0, 30) + '<br>' + d.name.substring(30, 60);
      }
      return d.name.substring(0, 57) + "...";
    });
    const values = sortedData.map((d) => d.value);
    const cantidades = sortedData.map((d) => d.cantidad || 0);

    // FUTURISTIC NEON COLOR PALETTE - Brighter colors
    const colors = [
      "rgba(147, 51, 234, 0.95)",   // Vivid Purple
      "rgba(16, 185, 129, 0.95)",   // Emerald Green
      "rgba(236, 72, 153, 0.95)",   // Pink
      "rgba(59, 130, 246, 0.95)",   // Blue
      "rgba(245, 158, 11, 0.95)",   // Amber
      "rgba(139, 92, 246, 0.95)",   // Violet
      "rgba(34, 197, 94, 0.95)",    // Green
      "rgba(249, 115, 22, 0.95)",   // Orange
      "rgba(14, 165, 233, 0.95)",   // Sky Blue
      "rgba(168, 85, 247, 0.95)",   // Purple
    ];

    // Build hover text for each item
    const hoverTexts = sortedData.map((d, i) => 
      `<b>${d.name}</b><br>` +
      `Valor: ${formatValue(values[i])}<br>` +
      `Cantidad: ${cantidades[i].toLocaleString()}<br>` +
      `Porcentaje: %{percent}<extra></extra>`
    );

    return [
      {
        values,
        labels,
        type: "pie" as const,
        hole: 0.45,
        marker: {
          colors,
          line: {
            color: isLight ? "#ffffff" : "#0a0a0f",
            width: 3,
          },
        },
        textinfo: "percent" as const,
        textposition: "outside" as const,
        textfont: { 
          color: textColor, 
          size: 14, 
          family: "system-ui, -apple-system, sans-serif",
        },
        outsidetextfont: {
          color: textColor,
          size: 13,
        },
        hovertemplate: hoverTexts,
        pull: values.map((_, i) => (i === 0 ? 0.08 : i === 1 ? 0.04 : 0)),
        rotation: 45,
        customdata: cantidades,
      },
    ];
  }, [data, isLight, textColor]);

  // Calculate total value for center annotation
  const totalValue = useMemo(() => {
    if (!data || data.length === 0) return 0;
    return data.reduce((sum, d) => sum + d.value, 0);
  }, [data]);

  const formatTotalValue = (v: number) => {
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  };

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
        showlegend: true,
        legend: {
          orientation: "v" as const,
          y: 0.5,
          x: 1.02,
          xanchor: "left" as const,
          font: { size: 13, color: textColor },
          bgcolor: "transparent",
        },
        margin: { l: 20, r: 180, t: 30, b: 30 },
        hoverlabel: {
          bgcolor: isLight ? "#ffffff" : "#1e1e2e",
          bordercolor: "#9333EA",
          font: { color: isLight ? "#1a1a1a" : "#fff", size: 14 },
        },
        annotations: [
          {
            text: `<b>Total</b><br>${formatTotalValue(totalValue)}`,
            showarrow: false,
            font: { size: 16, color: textColor, family: "system-ui" },
            x: 0.4,
            y: 0.5,
          },
        ],
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
