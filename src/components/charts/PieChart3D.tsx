"use client";

import { useMemo, useRef } from "react";
import { ThemeMode } from "@/contexts/app-context";
import Plot from "./SafePlot";

interface PieChart3DProps {
  data: Array<{
    name: string;
    value: number;
    cantidad?: number;
  }>;
  title?: string;
  themeMode?: ThemeMode;
  onItemClick?: (tipoValidacion: string) => void;
}

// Ultra-vibrant neon gradient colors for pie segments
const PIE_COLORS = [
  "rgba(139, 92, 246, 0.96)",   // Vivid Purple
  "rgba(6, 182, 212, 0.96)",    // Electric Cyan
  "rgba(244, 63, 94, 0.96)",    // Hot Rose
  "rgba(16, 185, 129, 0.96)",   // Emerald
  "rgba(245, 158, 11, 0.96)",   // Amber Gold
  "rgba(59, 130, 246, 0.96)",   // Royal Blue
  "rgba(236, 72, 153, 0.96)",   // Neon Pink
  "rgba(20, 184, 166, 0.96)",   // Teal
  "rgba(99, 102, 241, 0.96)",   // Indigo
  "rgba(217, 70, 239, 0.96)",   // Fuchsia
];

// Lighter border colors for each segment (glossy edge effect)
const PIE_BORDERS = [
  "rgba(192, 168, 255, 0.7)",
  "rgba(127, 234, 252, 0.7)",
  "rgba(255, 153, 170, 0.7)",
  "rgba(128, 236, 199, 0.7)",
  "rgba(253, 212, 112, 0.7)",
  "rgba(155, 194, 255, 0.7)",
  "rgba(252, 162, 210, 0.7)",
  "rgba(118, 232, 218, 0.7)",
  "rgba(176, 178, 255, 0.7)",
  "rgba(242, 168, 255, 0.7)",
];

export function PieChart3D({ data, title = "Distribución de Hallazgos", themeMode = "dark", onItemClick }: PieChart3DProps) {
  const isLight = themeMode === "light";
  const textColor = isLight ? "#1e293b" : "#f1f5f9";
  const containerRef = useRef<HTMLDivElement>(null);

  const sortedDataRef = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...data].sort((a, b) => b.value - a.value).slice(0, 10);
  }, [data]);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const sortedData = sortedDataRef;

    const formatValue = (v: number) => {
      if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
      if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
      return `$${v.toFixed(0)}`;
    };

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
    const values = sortedData.map((d) => d.value);
    const cantidades = sortedData.map((d) => d.cantidad || 0);

    const colors = sortedData.map((_, i) => PIE_COLORS[i % PIE_COLORS.length]);
    const borderColors = sortedData.map((_, i) => PIE_BORDERS[i % PIE_BORDERS.length]);

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
        hole: 0.42,
        domain: {
          x: [0.0, 0.62],
          y: [0.02, 0.98],
        },
        marker: {
          colors,
          line: {
            color: isLight ? borderColors : borderColors,
            width: 2.5,
          },
        },
        textinfo: "percent" as const,
        textposition: "outside" as const,
        textfont: {
          color: textColor,
          size: 13,
          family: "'Inter', 'SF Pro Display', system-ui, sans-serif",
        },
        outsidetextfont: {
          color: textColor,
          size: 12,
          family: "'Inter', 'SF Pro Display', system-ui, sans-serif",
        },
        hovertemplate: hoverTexts,
        // Progressive pull for 3D depth effect - all segments pulled
        pull: values.map((_, i) => {
          if (i === 0) return 0.08;
          if (i === 1) return 0.05;
          if (i === 2) return 0.03;
          return 0.015;
        }),
        rotation: 40,
        customdata: cantidades,
        sort: false,
        direction: "clockwise" as const,
      },
    ];
  }, [sortedDataRef, isLight, textColor]);

  const handlePlotClick = (event: any) => {
    if (!onItemClick || !event?.points?.[0]) return;
    const pointIndex = event.points[0].i;
    const clickedItem = sortedDataRef[pointIndex];
    if (clickedItem) {
      onItemClick(clickedItem.name);
    }
  };

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
    <div ref={containerRef} className="relative w-full h-full">
      {/* CSS 3D perspective tilt - more aggressive for dome/convex effect */}
      <div
        className="w-full h-full"
        style={{
          transform: "perspective(700px) rotateX(20deg)",
          transformOrigin: "center 55%",
          transformStyle: "preserve-3d",
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
            showlegend: true,
            legend: {
              orientation: "v" as const,
              y: 0.5,
              x: 0.68,
              xanchor: "left" as const,
              font: { size: 11, color: textColor, family: "'Inter', system-ui" },
              bgcolor: "transparent",
              bordercolor: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)",
              borderwidth: 1,
              itemclick: "toggleothers" as const,
              itemdoubleclick: "toggle" as const,
            },
            margin: { l: 10, r: 10, t: 25, b: 25 },
            hoverlabel: {
              bgcolor: isLight ? "rgba(255,255,255,0.96)" : "rgba(15,15,40,0.96)",
              bordercolor: isLight ? "rgba(139,92,246,0.5)" : "rgba(139,92,246,0.7)",
              borderwidth: 2,
              font: { color: isLight ? "#1e293b" : "#f1f5f9", size: 13, family: "'Inter', system-ui" },
            },
            annotations: [
              {
                text: `<b>Total</b><br><span style="font-size:20px">${formatTotalValue(totalValue)}</span>`,
                showarrow: false,
                font: {
                  size: 14,
                  color: textColor,
                  family: "'Inter', 'SF Pro Display', system-ui, sans-serif",
                },
                x: 0.31,
                y: 0.5,
                bgcolor: isLight ? "rgba(255,255,255,0.92)" : "rgba(20,20,50,0.92)",
                bordercolor: isLight ? "rgba(139,92,246,0.3)" : "rgba(139,92,246,0.4)",
                borderwidth: 2,
                borderpad: 12,
              },
            ],
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
              ? "drop-shadow(0 14px 35px rgba(0,0,0,0.18)) drop-shadow(0 0 1px rgba(0,0,0,0.1))"
              : "drop-shadow(0 18px 45px rgba(139,92,246,0.3)) drop-shadow(0 8px 20px rgba(0,0,0,0.35)) drop-shadow(0 0 3px rgba(139,92,246,0.15))",
          }}
        />

        {/* Glossy dome highlight overlay - simulates convex surface reflection */}
        <div
          style={{
            position: "absolute",
            top: "8%",
            left: "2%",
            width: "58%",
            height: "80%",
            background: isLight
              ? "radial-gradient(ellipse at 35% 30%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 35%, transparent 60%)"
              : "radial-gradient(ellipse at 35% 30%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 35%, transparent 60%)",
            pointerEvents: "none",
            borderRadius: "50%",
            zIndex: 10,
          }}
        />
      </div>

      {/* Elliptical shadow underneath the tilted pie - thicker for depth illusion */}
      <div
        style={{
          position: "absolute",
          bottom: "2%",
          left: "5%",
          width: "55%",
          height: "28px",
          background: isLight
            ? "radial-gradient(ellipse, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.04) 40%, transparent 70%)"
            : "radial-gradient(ellipse, rgba(139,92,246,0.20) 0%, rgba(139,92,246,0.08) 40%, transparent 70%)",
          filter: "blur(10px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
    </div>
  );
}
