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
  const gridColor = isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.15)";

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Sort by valor (descending) and take top 12
    const sortedData = [...data].sort((a, b) => b.valor - a.valor).slice(0, 12);

    // Truncate labels - max 60 chars, split in 2 lines if needed
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

    // Format value for display
    const formatValue = (v: number) => {
      if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
      if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
      return `$${v.toFixed(0)}`;
    };

    // PREMIUM 3D GRADIENT COLORS - Metallic shine effect
    const generateGradientColors = (index: number, total: number) => {
      const ratio = index / total;
      
      // Create vibrant gradient from purple/cyan to emerald/green
      const gradients = [
        { start: [147, 51, 234], end: [6, 182, 212] },   // Purple to Cyan
        { start: [236, 72, 153], end: [16, 185, 129] },  // Pink to Emerald
        { start: [59, 130, 246], end: [34, 197, 94] },    // Blue to Green
        { start: [168, 85, 247], end: [14, 165, 233] },  // Purple to Sky
        { start: [245, 158, 11], end: [236, 72, 153] },  // Amber to Pink
        { start: [139, 92, 246], end: [6, 182, 212] },  // Violet to Cyan
      ];
      
      const gradient = gradients[index % gradients.length];
      const r = Math.round(gradient.start[0] + (gradient.end[0] - gradient.start[0]) * ratio);
      const g = Math.round(gradient.start[1] + (gradient.end[1] - gradient.start[1]) * ratio);
      const b = Math.round(gradient.start[2] + (gradient.end[2] - gradient.start[2]) * ratio);
      
      return `rgba(${r}, ${g}, ${b}, 0.95)`;
    };

    const colors = cantidades.map((_, i) => generateGradientColors(i, cantidades.length));

    return [
      {
        x: labels,
        y: valoresMillones,
        type: "bar" as const,
        name: "Valor",
        marker: {
          color: colors,
          line: {
            color: isLight ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)",
            width: 2,
          },
          pattern: {
            shape: "" as const,
          },
        },
        text: sortedData.map((d, i) => `${formatValue(valores[i])}<br>(${cantidades[i].toLocaleString()})`),
        textposition: "outside" as const,
        textfont: { 
          color: textColor, 
          size: 12,
          family: "system-ui, -apple-system, sans-serif",
        },
        hovertemplate: sortedData.map((d, i) => 
          `<b>${d.name}</b><br>` +
          `Valor: ${formatValue(valores[i])}<br>` +
          `Cantidad: ${cantidades[i].toLocaleString()}<extra></extra>`
        ),
        customdata: cantidades,
        // 3D effect with rounded corners
        base: Array(sortedData.length).fill(0),
        width: 0.7,
      },
    ];
  }, [data, textColor, isLight]);

  if (!chartData) {
    return (
      <div className={`flex items-center justify-center h-full text-lg ${isLight ? "text-gray-500" : "text-gray-400"}`}>
        No hay datos disponibles
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Shine overlay effect */}
      <div 
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: isLight 
            ? "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)"
            : "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%)",
          borderRadius: "12px",
        }}
      />
      <Plot
        data={chartData}
        layout={{
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          font: { 
            color: textColor, 
            family: "system-ui, -apple-system, sans-serif", 
            size: 14 
          },
          xaxis: {
            tickangle: -45,
            tickfont: { size: 12, color: textColor },
            gridcolor: gridColor,
            showgrid: true,
            gridwidth: 1,
            automargin: true,
            zeroline: false,
            linecolor: isLight ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)",
            linewidth: 1,
          },
          yaxis: {
            title: { 
              text: "Valor (Millones $)", 
              font: { size: 16, color: textColor, family: "system-ui" } 
            },
            tickfont: { size: 13, color: textColor },
            gridcolor: gridColor,
            gridwidth: 1,
            showgrid: true,
            tickformat: ",.1f",
            ticksuffix: "M",
            zeroline: false,
            linecolor: isLight ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)",
            linewidth: 1,
          },
          margin: { l: 90, r: 40, t: 40, b: 180 },
          bargap: 0.3,
          bargroupgap: 0.1,
          hoverlabel: {
            bgcolor: isLight ? "#ffffff" : "#1e1e2e",
            bordercolor: "#9333EA",
            borderwidth: 2,
            font: { color: isLight ? "#1a1a1a" : "#fff", size: 14, family: "system-ui" },
            shadow: true,
          },
          // 3D shadow effect
          scene: undefined,
        }}
        config={{ 
          displayModeBar: false, 
          responsive: true,
          doubleClick: "reset",
        }}
        style={{ 
          width: "100%", 
          height: "100%",
          filter: isLight ? "drop-shadow(0 4px 6px rgba(0,0,0,0.1))" : "drop-shadow(0 4px 12px rgba(147,51,234,0.3))",
        }}
      />
    </div>
  );
}
