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
}

export function PieChart3D({ data, title = "Distribución de Hallazgos", themeMode = "dark" }: PieChart3DProps) {
  const isLight = themeMode === "light";
  const textColor = isLight ? "#1a1a1a" : "#ffffff";
  const containerRef = useRef<HTMLDivElement>(null);

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

    // PREMIUM METALLIC SHINE COLORS - Brighter, more vibrant with shine effect
    const colors = [
      "rgba(147, 51, 234, 0.98)",   // Vivid Purple - Shiny
      "rgba(16, 185, 129, 0.98)",   // Emerald Green - Shiny
      "rgba(236, 72, 153, 0.98)",   // Pink - Shiny
      "rgba(59, 130, 246, 0.98)",   // Blue - Shiny
      "rgba(245, 158, 11, 0.98)",   // Amber - Shiny
      "rgba(139, 92, 246, 0.98)",   // Violet - Shiny
      "rgba(34, 197, 94, 0.98)",    // Green - Shiny
      "rgba(249, 115, 22, 0.98)",   // Orange - Shiny
      "rgba(14, 165, 233, 0.98)",   // Sky Blue - Shiny
      "rgba(168, 85, 247, 0.98)",   // Purple - Shiny
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
        // Constrain the pie to a square domain so it doesn't deform
        domain: {
          x: [0.0, 0.65],
          y: [0.05, 0.95],
        },
        marker: {
          colors,
          line: {
            color: isLight ? "#ffffff" : "rgba(255,255,255,0.4)",
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
          family: "system-ui, -apple-system, sans-serif",
        },
        hovertemplate: hoverTexts,
        // Subtle pull effect for 3D depth
        pull: values.map((_, i) => {
          if (i === 0) return 0.06;
          if (i === 1) return 0.03;
          return 0;
        }),
        rotation: 45,
        customdata: cantidades,
        sort: false,
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
    <div ref={containerRef} className="relative w-full h-full">
      <Plot
        data={chartData}
        layout={{
          autosize: true,
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          font: { 
            color: textColor, 
            family: "system-ui, -apple-system, sans-serif", 
            size: 14 
          },
          showlegend: true,
          legend: {
            orientation: "v" as const,
            y: 0.5,
            x: 0.72,
            xanchor: "left" as const,
            font: { size: 12, color: textColor, family: "system-ui" },
            bgcolor: "transparent",
            bordercolor: isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)",
            borderwidth: 1,
            itemclick: "toggleothers" as const,
            itemdoubleclick: "toggle" as const,
          },
          margin: { l: 10, r: 10, t: 30, b: 30 },
          hoverlabel: {
            bgcolor: isLight ? "#ffffff" : "#1e1e2e",
            bordercolor: "#9333EA",
            borderwidth: 2,
            font: { color: isLight ? "#1a1a1a" : "#fff", size: 14, family: "system-ui" },
            shadow: true,
          },
          annotations: [
            {
              text: `<b>Total</b><br>${formatTotalValue(totalValue)}`,
              showarrow: false,
              font: { 
                size: 18, 
                color: textColor, 
                family: "system-ui, -apple-system, sans-serif",
                weight: "bold",
              },
              x: 0.325,
              y: 0.5,
              bgcolor: isLight ? "rgba(255,255,255,0.9)" : "rgba(30,30,46,0.9)",
              bordercolor: isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.2)",
              borderwidth: 2,
              borderpad: 8,
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
            ? "drop-shadow(0 8px 16px rgba(0,0,0,0.15))" 
            : "drop-shadow(0 8px 24px rgba(147,51,234,0.4))",
        }}
      />
    </div>
  );
}
