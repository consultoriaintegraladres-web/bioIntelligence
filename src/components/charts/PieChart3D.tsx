"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { ThemeMode } from "@/contexts/app-context";

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

// ──────────────────────────────────────────────
// Highcharts CDN loader (base + 3D module)
// ──────────────────────────────────────────────
const HC_CDN = "https://code.highcharts.com/highcharts.js";
const HC_3D_CDN = "https://code.highcharts.com/highcharts-3d.js";

let hcLoadPromise: Promise<any> | null = null;

function loadHighcharts(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject("SSR");

  const win = window as any;
  // Already fully loaded (base + 3d)?
  if (win.Highcharts && win.Highcharts._3dLoaded) {
    return Promise.resolve(win.Highcharts);
  }

  if (hcLoadPromise) return hcLoadPromise;

  const loadScript = (src: string): Promise<void> =>
    new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
      if (existing) {
        if (existing.dataset.loaded === "true") { resolve(); return; }
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", reject);
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => { s.dataset.loaded = "true"; resolve(); };
      s.onerror = reject;
      document.head.appendChild(s);
    });

  hcLoadPromise = loadScript(HC_CDN)
    .then(() => loadScript(HC_3D_CDN))
    .then(() => {
      const HC = (window as any).Highcharts;
      HC._3dLoaded = true;
      return HC;
    })
    .catch((err) => {
      hcLoadPromise = null;
      throw err;
    });

  return hcLoadPromise;
}

// ──────────────────────────────────────────────
// Colors
// ──────────────────────────────────────────────
const PIE_COLORS = [
  "#8B5CF6", "#06B6D4", "#F43F5E", "#10B981", "#F59E0B",
  "#3B82F6", "#EC4899", "#14B8A6", "#6366F1", "#D946EF",
];

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────
export function PieChart3D({ data, themeMode = "dark", onItemClick }: PieChart3DProps) {
  const isLight = themeMode === "light";
  const textColor = isLight ? "#1e293b" : "#f1f5f9";
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [hcReady, setHcReady] = useState(false);
  const onClickRef = useRef(onItemClick);
  onClickRef.current = onItemClick;

  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...data].sort((a, b) => b.value - a.value).slice(0, 10);
  }, [data]);

  const totalValue = useMemo(() => {
    if (!data || data.length === 0) return 0;
    return data.reduce((s, d) => s + d.value, 0);
  }, [data]);

  const fmt = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  };

  // Load Highcharts on mount
  useEffect(() => {
    let alive = true;
    loadHighcharts()
      .then(() => { if (alive) setHcReady(true); })
      .catch((e) => console.error("Highcharts load error:", e));
    return () => { alive = false; };
  }, []);

  // Create / update chart
  useEffect(() => {
    if (!hcReady || !containerRef.current || sortedData.length === 0) return;

    const HC = (window as any).Highcharts;
    if (!HC) return;

    // Destroy old chart
    if (chartRef.current) {
      try { chartRef.current.destroy(); } catch (_) {}
      chartRef.current = null;
    }

    const series = sortedData.map((d, i) => ({
      name: d.name.length > 55 ? d.name.substring(0, 52) + "..." : d.name,
      fullName: d.name,
      y: d.value,
      color: PIE_COLORS[i % PIE_COLORS.length],
      cantidad: d.cantidad || 0,
      sliced: i === 0,   // pull out the largest slice
      selected: i === 0,
    }));

    chartRef.current = HC.chart(containerRef.current, {
      chart: {
        type: "pie",
        options3d: {
          enabled: true,
          alpha: 55,          // vertical tilt angle
          beta: 0,
        },
        backgroundColor: "transparent",
        style: { fontFamily: "'Inter','SF Pro Display',system-ui,sans-serif" },
        animation: { duration: 700, easing: "easeOutQuart" },
        reflow: true,
        spacing: [5, 5, 5, 5],
      },

      title: { text: null },
      credits: { enabled: false },

      // ── Legend ─────────────────────────────
      legend: {
        enabled: true,
        align: "right",
        verticalAlign: "middle",
        layout: "vertical",
        maxHeight: 420,
        itemStyle: {
          color: textColor,
          fontSize: "11px",
          fontWeight: "normal",
          fontFamily: "'Inter',system-ui",
        },
        itemHoverStyle: { color: "#8B5CF6" },
        backgroundColor: "transparent",
        borderWidth: 0,
        symbolRadius: 4,
        itemMarginBottom: 4,
        navigation: { activeColor: "#8B5CF6", style: { color: textColor } },
      },

      // ── Tooltip ────────────────────────────
      tooltip: {
        useHTML: true,
        formatter: function (): string {
          const p = this as any;
          return (
            `<div style="padding:4px 6px;font-family:'Inter',system-ui">` +
            `<b style="font-size:13px">${p.point.fullName || p.point.name}</b><br/>` +
            `Valor: <b>${fmt(p.y)}</b><br/>` +
            `Cantidad: <b>${(p.point.cantidad || 0).toLocaleString()}</b><br/>` +
            `Porcentaje: <b>${p.point.percentage.toFixed(1)}%</b></div>`
          );
        },
        backgroundColor: isLight ? "rgba(255,255,255,0.97)" : "rgba(15,15,40,0.97)",
        borderColor: "rgba(139,92,246,0.6)",
        borderWidth: 2,
        shadow: { color: "rgba(0,0,0,0.15)", offsetX: 0, offsetY: 4, width: 12 },
        style: { color: textColor, fontSize: "13px" },
      },

      // ── Plot options ───────────────────────
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: "pointer",
          depth: 50,                // ← 3D THICKNESS
          innerSize: "42%",         // donut hole
          size: "72%",              // smaller to leave room for labels
          slicedOffset: 28,         // how far the pulled slice sticks out
          edgeColor: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)",
          edgeWidth: 1,
          dataLabels: {
            enabled: true,
            useHTML: true,
            distance: 35,
            connectorWidth: 2,
            connectorColor: isLight ? "rgba(139,92,246,0.35)" : "rgba(139,92,246,0.5)",
            connectorShape: "crookedLine",
            crookDistance: "70%",
            softConnector: true,
            connectorPadding: 8,
            formatter: function (): string {
              const pt = this as any;
              const pct = pt.point.percentage.toFixed(1);
              const name: string = pt.point.fullName || pt.point.name || "";
              // Split name into max 2 lines (~30 chars per line)
              let line1 = name;
              let line2 = "";
              if (name.length > 30) {
                const mid = Math.min(30, Math.ceil(name.length / 2));
                const sp = name.lastIndexOf(" ", mid);
                if (sp > 8) {
                  line1 = name.substring(0, sp);
                  line2 = name.substring(sp + 1);
                  if (line2.length > 35) line2 = line2.substring(0, 32) + "...";
                } else {
                  line1 = name.substring(0, 30);
                  line2 = name.substring(30, 65);
                  if (line2.length > 35) line2 = line2.substring(0, 32) + "...";
                }
              }
              const nameColor = isLight ? "#334155" : "#cbd5e1";
              const pctColor = isLight ? "#6d28d9" : "#a78bfa";
              return (
                `<div style="text-align:center;line-height:1.3;font-family:'Inter',system-ui">` +
                `<span style="font-size:13px;font-weight:700;color:${pctColor}">${pct}%</span><br/>` +
                `<span style="font-size:10.5px;font-weight:500;color:${nameColor}">${line1}</span>` +
                (line2 ? `<br/><span style="font-size:10.5px;font-weight:400;color:${nameColor};opacity:0.85">${line2}</span>` : "") +
                `</div>`
              );
            },
            style: {
              textOutline: "none",
            },
          },
          states: {
            hover: {
              brightness: 0.1,
              halo: { size: 6, opacity: 0.2 },
            },
          },
          point: {
            events: {
              click: function () {
                const pt = this as any;
                const original = sortedData.find(
                  (d) =>
                    d.name === pt.fullName ||
                    d.name === pt.name ||
                    d.name.startsWith(pt.name.replace("...", ""))
                );
                if (original && onClickRef.current) {
                  onClickRef.current(original.name);
                }
              },
            },
          },
        },
      },

      series: [{ name: "Hallazgos", data: series }],
    });

    return () => {
      if (chartRef.current) {
        try { chartRef.current.destroy(); } catch (_) {}
        chartRef.current = null;
      }
    };
  }, [hcReady, sortedData, isLight, textColor]);

  // ── Resize observer ────────────────────────
  useEffect(() => {
    if (!containerRef.current || !chartRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(() => {
      if (chartRef.current) {
        try { chartRef.current.reflow(); } catch (_) {}
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [hcReady, sortedData]);

  // ── Empty state ────────────────────────────
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full text-lg ${isLight ? "text-gray-500" : "text-gray-400"}`}>
        No hay datos disponibles
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Highcharts container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Center total overlay */}
      {totalValue > 0 && (
        <div
          className="pointer-events-none"
          style={{
            position: "absolute",
            left: "39%",
            top: "58%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            zIndex: 10,
          }}
        >
          <div
            style={{
              background: isLight ? "rgba(255,255,255,0.88)" : "rgba(20,20,50,0.88)",
              borderRadius: "14px",
              padding: "8px 16px",
              border: `1.5px solid ${isLight ? "rgba(139,92,246,0.25)" : "rgba(139,92,246,0.35)"}`,
              backdropFilter: "blur(8px)",
              boxShadow: isLight
                ? "0 4px 16px rgba(0,0,0,0.08)"
                : "0 4px 20px rgba(139,92,246,0.15)",
            }}
          >
            <div style={{ fontSize: "11px", color: textColor, opacity: 0.6, fontFamily: "'Inter',system-ui" }}>
              Total
            </div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: textColor, fontFamily: "'Inter',system-ui" }}>
              {fmt(totalValue)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
