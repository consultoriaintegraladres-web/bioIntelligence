"use client";

import { useMemo } from "react";
import { ThemeMode } from "@/contexts/app-context";
import Plot from "./SafePlot";

interface BarChart3DProps {
  data: Array<{
    name: string;
    cantidad: number;
    valor: number;
  }>;
  title?: string;
  themeMode?: ThemeMode;
  onItemClick?: (tipoValidacion: string) => void;
}

// Premium 3D color palette: base (front face), top (lighter), side (darker), glow
const COLORS_3D = [
  { base: "rgba(139, 92, 246, 0.95)", top: "rgba(192, 168, 255, 0.88)", side: "rgba(91, 33, 182, 0.82)", glow: "rgba(139,92,246,0.35)" },
  { base: "rgba(6, 182, 212, 0.95)",  top: "rgba(127, 234, 252, 0.88)", side: "rgba(8, 126, 164, 0.82)",  glow: "rgba(6,182,212,0.35)" },
  { base: "rgba(244, 63, 94, 0.95)",  top: "rgba(255, 153, 170, 0.88)", side: "rgba(185, 28, 65, 0.82)",  glow: "rgba(244,63,94,0.35)" },
  { base: "rgba(16, 185, 129, 0.95)", top: "rgba(128, 236, 199, 0.88)", side: "rgba(5, 122, 85, 0.82)",   glow: "rgba(16,185,129,0.35)" },
  { base: "rgba(245, 158, 11, 0.95)", top: "rgba(253, 212, 112, 0.88)", side: "rgba(180, 98, 8, 0.82)",   glow: "rgba(245,158,11,0.35)" },
  { base: "rgba(59, 130, 246, 0.95)", top: "rgba(155, 194, 255, 0.88)", side: "rgba(30, 80, 210, 0.82)",  glow: "rgba(59,130,246,0.35)" },
  { base: "rgba(236, 72, 153, 0.95)", top: "rgba(252, 162, 210, 0.88)", side: "rgba(175, 25, 100, 0.82)", glow: "rgba(236,72,153,0.35)" },
  { base: "rgba(20, 184, 166, 0.95)", top: "rgba(118, 232, 218, 0.88)", side: "rgba(13, 130, 118, 0.82)", glow: "rgba(20,184,166,0.35)" },
  { base: "rgba(99, 102, 241, 0.95)", top: "rgba(176, 178, 255, 0.88)", side: "rgba(60, 54, 195, 0.82)",  glow: "rgba(99,102,241,0.35)" },
  { base: "rgba(239, 68, 68, 0.95)",  top: "rgba(255, 158, 158, 0.88)", side: "rgba(175, 30, 30, 0.82)",  glow: "rgba(239,68,68,0.35)" },
  { base: "rgba(217, 70, 239, 0.95)", top: "rgba(242, 168, 255, 0.88)", side: "rgba(150, 30, 170, 0.82)", glow: "rgba(217,70,239,0.35)" },
  { base: "rgba(34, 197, 94, 0.95)",  top: "rgba(145, 240, 180, 0.88)", side: "rgba(18, 135, 60, 0.82)",  glow: "rgba(34,197,94,0.35)" },
];

export function BarChart3D({ data, title = "Distribución por Tipo de Validación", themeMode = "dark", onItemClick }: BarChart3DProps) {
  const isLight = themeMode === "light";
  const textColor = isLight ? "#1e293b" : "#f1f5f9";
  const gridColor = isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)";

  const sortedDataRef = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...data].sort((a, b) => b.valor - a.valor).slice(0, 12);
  }, [data]);

  const { chartData, shapes } = useMemo(() => {
    if (!data || data.length === 0) return { chartData: null, shapes: [] };

    const sortedData = sortedDataRef;

    const labels = sortedData.map((d) => {
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
    const cantidades = sortedData.map((d) => d.cantidad);
    const valores = sortedData.map((d) => d.valor);
    const valoresMillones = sortedData.map((d) => d.valor / 1000000);

    const formatValue = (v: number) => {
      if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
      if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
      return `$${v.toFixed(0)}`;
    };

    const baseColors = sortedData.map((_, i) => COLORS_3D[i % COLORS_3D.length].base);

    // === 3D SHAPES: top face and side face for each bar ===
    const maxVal = Math.max(...valoresMillones, 1);
    const dx = 0.11;                // horizontal 3D depth
    const dy = maxVal * 0.032;      // vertical 3D depth
    const halfWidth = 0.30;         // bar half-width

    const shapes3D: any[] = [];

    sortedData.forEach((_, i) => {
      const v = valoresMillones[i];
      if (v <= 0) return;

      const c = COLORS_3D[i % COLORS_3D.length];

      // Right side face (parallelogram)
      shapes3D.push({
        type: "path",
        path: `M ${i + halfWidth},0 L ${i + halfWidth},${v} L ${i + halfWidth + dx},${v + dy} L ${i + halfWidth + dx},${dy} Z`,
        fillcolor: c.side,
        line: { width: 0.5, color: "rgba(255,255,255,0.12)" },
        xref: "x",
        yref: "y",
        layer: "above",
      });

      // Top face (parallelogram)
      shapes3D.push({
        type: "path",
        path: `M ${i - halfWidth},${v} L ${i + halfWidth},${v} L ${i + halfWidth + dx},${v + dy} L ${i - halfWidth + dx},${v + dy} Z`,
        fillcolor: c.top,
        line: { width: 0.5, color: "rgba(255,255,255,0.22)" },
        xref: "x",
        yref: "y",
        layer: "above",
      });
    });

    const traces = [
      {
        x: labels,
        y: valoresMillones,
        type: "bar" as const,
        name: "Valor",
        marker: {
          color: baseColors,
          line: {
            color: isLight ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.18)",
            width: 1.5,
          },
        },
        text: sortedData.map((_, i) => `${formatValue(valores[i])}`),
        textposition: "outside" as const,
        textfont: {
          color: textColor,
          size: 11,
          family: "'Inter', 'SF Pro Display', system-ui, sans-serif",
        },
        hovertemplate: sortedData.map((d, i) =>
          `<b>${d.name}</b><br>` +
          `Valor: ${formatValue(valores[i])}<br>` +
          `Cantidad: ${cantidades[i].toLocaleString()}<extra></extra>`
        ),
        customdata: cantidades,
        width: halfWidth * 2,
      },
    ];

    return { chartData: traces, shapes: shapes3D };
  }, [sortedDataRef, textColor, isLight]);

  const handlePlotClick = (event: any) => {
    if (!onItemClick || !event?.points?.[0]) return;
    const pointIndex = event.points[0].pointNumber;
    const clickedItem = sortedDataRef[pointIndex];
    if (clickedItem) {
      onItemClick(clickedItem.name);
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
        transform: "perspective(1400px) rotateX(2deg) rotateY(-1.5deg)",
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
            tickangle: -45,
            tickfont: { size: 11, color: textColor },
            gridcolor: gridColor,
            showgrid: false,
            automargin: true,
            zeroline: false,
            linecolor: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)",
            linewidth: 1,
          },
          yaxis: {
            title: {
              text: "Valor (Millones $)",
              font: { size: 13, color: textColor, family: "'Inter', system-ui" },
              standoff: 12,
            },
            tickfont: { size: 11, color: textColor },
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
          margin: { l: 75, r: 50, t: 35, b: 180 },
          shapes,
          hoverlabel: {
            bgcolor: isLight ? "rgba(255,255,255,0.96)" : "rgba(15,15,40,0.96)",
            bordercolor: isLight ? "rgba(139,92,246,0.5)" : "rgba(139,92,246,0.7)",
            borderwidth: 2,
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
