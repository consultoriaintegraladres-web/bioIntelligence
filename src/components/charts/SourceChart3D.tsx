"use client";

import { useMemo } from "react";
import { ThemeMode } from "@/contexts/app-context";
import Plot from "./SafePlot";

interface SourceChart3DProps {
  data: Array<{
    origen: string;
    cantidad_hallazgos: number;
    valor_total: number;
  }>;
  title?: string;
  themeMode?: ThemeMode;
  onItemClick?: (origen: string) => void;
}

// Premium bubble colors matching the bar/pie palette
const BUBBLE_COLORS = [
  "rgba(139, 92, 246, 0.88)",
  "rgba(6, 182, 212, 0.88)",
  "rgba(244, 63, 94, 0.88)",
  "rgba(16, 185, 129, 0.88)",
  "rgba(245, 158, 11, 0.88)",
  "rgba(59, 130, 246, 0.88)",
  "rgba(236, 72, 153, 0.88)",
  "rgba(20, 184, 166, 0.88)",
  "rgba(99, 102, 241, 0.88)",
  "rgba(217, 70, 239, 0.88)",
];

// Lighter border for glossy 3D sphere effect
const BUBBLE_BORDERS = [
  "rgba(192, 168, 255, 0.6)",
  "rgba(127, 234, 252, 0.6)",
  "rgba(255, 153, 170, 0.6)",
  "rgba(128, 236, 199, 0.6)",
  "rgba(253, 212, 112, 0.6)",
  "rgba(155, 194, 255, 0.6)",
  "rgba(252, 162, 210, 0.6)",
  "rgba(118, 232, 218, 0.6)",
  "rgba(176, 178, 255, 0.6)",
  "rgba(242, 168, 255, 0.6)",
];

export function SourceChart3D({ data, title = "Análisis por Fuente/Origen", themeMode = "dark", onItemClick }: SourceChart3DProps) {
  const isLight = themeMode === "light";
  const textColor = isLight ? "#1e293b" : "#f1f5f9";
  const gridColor = isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)";

  const sortedDataRef = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...data].sort((a, b) => b.valor_total - a.valor_total);
  }, [data]);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const sortedData = sortedDataRef;

    const origenes = sortedData.map((d) => d.origen || "Sin origen");
    const cantidades = sortedData.map((d) => d.cantidad_hallazgos);
    const valores = sortedData.map((d) => d.valor_total);
    const valoresMillones = sortedData.map((d) => d.valor_total / 1000000);

    const formatValue = (v: number) => {
      if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
      if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
      return `$${v.toFixed(0)}`;
    };

    // Bubble sizes scaled proportionally
    const maxVal = Math.max(...valoresMillones, 1);
    const sizes = valoresMillones.map((v) => 35 + (v / maxVal) * 85);

    // Per-bubble colors from the premium palette
    const colors = sortedData.map((_, i) => BUBBLE_COLORS[i % BUBBLE_COLORS.length]);
    const borders = sortedData.map((_, i) => BUBBLE_BORDERS[i % BUBBLE_BORDERS.length]);

    return [
      {
        x: origenes,
        y: valoresMillones,
        mode: "text+markers" as const,
        type: "scatter" as const,
        text: sortedData.map((_, i) => `${formatValue(valores[i])}<br>(${cantidades[i].toLocaleString()})`),
        textposition: "top center" as const,
        textfont: {
          color: textColor,
          size: 11,
          family: "'Inter', 'SF Pro Display', system-ui, sans-serif",
        },
        marker: {
          size: sizes,
          color: colors,
          line: {
            color: borders,
            width: 2,
          },
          opacity: 0.92,
        },
        hovertemplate: sortedData.map((_, i) =>
          `<b>${origenes[i]}</b><br>` +
          `Valor: ${formatValue(valores[i])}<br>` +
          `Cantidad: ${cantidades[i].toLocaleString()}<extra></extra>`
        ),
      },
    ] as any[];
  }, [sortedDataRef, isLight, textColor]);

  const handlePlotClick = (event: any) => {
    if (!onItemClick || !event?.points?.[0]) return;
    const pointIndex = event.points[0].pointNumber;
    const clickedItem = sortedDataRef[pointIndex];
    if (clickedItem) {
      onItemClick(clickedItem.origen || "Sin origen");
    }
  };

  if (!chartData) {
    return (
      <div className={`flex items-center justify-center h-full text-lg ${isLight ? "text-gray-500" : "text-gray-400"}`}>
        No hay datos disponibles
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full"
      style={{
        transform: "perspective(1200px) rotateX(2deg) rotateY(-1deg)",
        transformOrigin: "center center",
      }}
    >
      <Plot
        data={chartData}
        onPlotClick={handlePlotClick}
        layout={{
          autosize: true,
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          font: {
            color: textColor,
            family: "'Inter', 'SF Pro Display', system-ui, sans-serif",
            size: 13,
          },
          xaxis: {
            title: {
              text: "Origen / Fuente",
              font: { size: 14, color: textColor, family: "'Inter', system-ui" },
              standoff: 12,
            },
            tickfont: { size: 12, color: textColor },
            gridcolor: gridColor,
            showgrid: false,
            tickangle: -30,
            zeroline: false,
            linecolor: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)",
            linewidth: 1,
          },
          yaxis: {
            title: {
              text: "Valor (Millones $)",
              font: { size: 14, color: textColor, family: "'Inter', system-ui" },
              standoff: 12,
            },
            tickfont: { size: 12, color: textColor },
            gridcolor: gridColor,
            gridwidth: 1,
            showgrid: true,
            griddash: "dot",
            tickformat: ",.1f",
            ticksuffix: "M",
            zeroline: false,
            linecolor: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)",
            linewidth: 1,
          },
          margin: { l: 80, r: 50, t: 50, b: 120 },
          hoverlabel: {
            bgcolor: isLight ? "rgba(255,255,255,0.65)" : "rgba(15,15,40,0.65)",
            bordercolor: isLight ? "rgba(139,92,246,0.3)" : "rgba(139,92,246,0.45)",
            borderwidth: 1,
            font: {
              color: isLight ? "#1e293b" : "#f1f5f9",
              size: 13,
              family: "'Inter', system-ui",
            },
          },
        }}
        config={{
          displayModeBar: false,
          responsive: true,
          doubleClick: "reset",
        }}
        style={{
          width: "100%",
          height: "100%",
          filter: isLight
            ? "drop-shadow(0 10px 25px rgba(0,0,0,0.12))"
            : "drop-shadow(0 10px 35px rgba(139,92,246,0.2)) drop-shadow(0 4px 12px rgba(0,0,0,0.25))",
        }}
      />
    </div>
  );
}
