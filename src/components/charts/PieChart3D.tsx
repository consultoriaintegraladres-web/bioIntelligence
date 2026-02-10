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
// Gradient color pairs: [base, lighter] for 3D shine
// ──────────────────────────────────────────────
const PIE_GRADIENTS: Array<{ base: string; light: string; hex: string }> = [
  { hex: "#8B5CF6", base: "rgba(139,92,246,1)",  light: "rgba(192,168,255,1)" },
  { hex: "#06B6D4", base: "rgba(6,182,212,1)",   light: "rgba(127,234,252,1)" },
  { hex: "#F43F5E", base: "rgba(244,63,94,1)",   light: "rgba(255,153,170,1)" },
  { hex: "#10B981", base: "rgba(16,185,129,1)",   light: "rgba(128,236,199,1)" },
  { hex: "#F59E0B", base: "rgba(245,158,11,1)",   light: "rgba(253,212,112,1)" },
  { hex: "#3B82F6", base: "rgba(59,130,246,1)",   light: "rgba(155,194,255,1)" },
  { hex: "#EC4899", base: "rgba(236,72,153,1)",   light: "rgba(252,162,210,1)" },
  { hex: "#14B8A6", base: "rgba(20,184,166,1)",   light: "rgba(118,232,218,1)" },
  { hex: "#6366F1", base: "rgba(99,102,241,1)",   light: "rgba(176,178,255,1)" },
  { hex: "#D946EF", base: "rgba(217,70,239,1)",   light: "rgba(242,168,255,1)" },
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

  // Load Highcharts
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

    if (chartRef.current) {
      try { chartRef.current.destroy(); } catch (_) {}
      chartRef.current = null;
    }

    // Build radial gradient colors for each segment (gives 3D shine)
    const seriesData = sortedData.map((d, i) => {
      const g = PIE_GRADIENTS[i % PIE_GRADIENTS.length];
      return {
        name: d.name.length > 55 ? d.name.substring(0, 52) + "..." : d.name,
        fullName: d.name,
        y: d.value,
        color: {
          radialGradient: { cx: 0.4, cy: 0.35, r: 0.65 },
          stops: [
            [0, g.light],   // highlight center
            [1, g.base],    // darker edge
          ],
        },
        borderColor: g.light,
        cantidad: d.cantidad || 0,
        sliced: i === 0,
        selected: i === 0,
      };
    });

    chartRef.current = HC.chart(containerRef.current, {
      chart: {
        type: "pie",
        options3d: {
          enabled: true,
          alpha: 50,          // tilt angle - balanced for depth visibility
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

      // ── Tooltip (Glassmorphism) ────────────
      tooltip: {
        useHTML: true,
        formatter: function (): string {
          const p = this as any;
          const bg = isLight
            ? "rgba(255,255,255,0.65)"
            : "rgba(15,15,40,0.65)";
          return (
            `<div style="padding:10px 14px;font-family:'Inter',system-ui;` +
            `background:${bg};backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);` +
            `border-radius:12px;border:1px solid rgba(139,92,246,0.3);` +
            `box-shadow:0 8px 32px rgba(0,0,0,0.18)">` +
            `<div style="font-size:14px;font-weight:700;margin-bottom:6px;color:${textColor}">${p.point.fullName || p.point.name}</div>` +
            `<div style="display:flex;gap:16px;font-size:12px;color:${textColor};opacity:0.85">` +
            `<div><span style="opacity:0.6">Valor</span><br/><b>${fmt(p.y)}</b></div>` +
            `<div><span style="opacity:0.6">Cantidad</span><br/><b>${(p.point.cantidad || 0).toLocaleString()}</b></div>` +
            `<div><span style="opacity:0.6">%</span><br/><b>${p.point.percentage.toFixed(1)}%</b></div>` +
            `</div></div>`
          );
        },
        backgroundColor: "transparent",
        borderWidth: 0,
        shadow: false,
        outside: true,
        style: { color: textColor, fontSize: "13px" },
      },

      // ── Plot options ───────────────────────
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: "pointer",
          depth: 55,                // 3D thickness
          innerSize: "42%",
          size: "72%",
          slicedOffset: 30,
          edgeColor: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)",
          edgeWidth: 1,
          borderWidth: 1.5,
          borderColor: isLight ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.12)",
          dataLabels: {
            enabled: true,
            useHTML: true,
            distance: 35,
            connectorWidth: 2,
            connectorColor: isLight ? "rgba(139,92,246,0.3)" : "rgba(139,92,246,0.45)",
            connectorShape: "crookedLine",
            crookDistance: "70%",
            softConnector: true,
            connectorPadding: 8,
            formatter: function (): string {
              const pt = this as any;
              const pct = pt.point.percentage.toFixed(1);
              const name: string = pt.point.fullName || pt.point.name || "";
              let line1 = name;
              let line2 = "";
              if (name.length > 28) {
                const mid = Math.min(28, Math.ceil(name.length / 2));
                const sp = name.lastIndexOf(" ", mid);
                if (sp > 8) {
                  line1 = name.substring(0, sp);
                  line2 = name.substring(sp + 1);
                  if (line2.length > 32) line2 = line2.substring(0, 29) + "...";
                } else {
                  line1 = name.substring(0, 28);
                  line2 = name.substring(28, 60);
                  if (line2.length > 32) line2 = line2.substring(0, 29) + "...";
                }
              }
              const nameColor = isLight ? "#334155" : "#cbd5e1";
              const pctColor = isLight ? "#6d28d9" : "#a78bfa";
              return (
                `<div style="text-align:center;line-height:1.35;font-family:'Inter',system-ui">` +
                `<span style="font-size:13px;font-weight:700;color:${pctColor}">${pct}%</span><br/>` +
                `<span style="font-size:10px;font-weight:500;color:${nameColor}">${line1}</span>` +
                (line2 ? `<br/><span style="font-size:10px;font-weight:400;color:${nameColor};opacity:0.8">${line2}</span>` : "") +
                `</div>`
              );
            },
            style: { textOutline: "none" },
          },
          // ── Hover: segments expand slightly ──
          states: {
            hover: {
              brightness: 0.12,
              halo: {
                size: 10,
                opacity: 0.15,
                attributes: {
                  fill: isLight ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.12)",
                  "stroke-width": 0,
                },
              },
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
              // Expand segment slightly on hover
              mouseOver: function () {
                const pt = this as any;
                if (!pt.sliced) {
                  pt.slice(true);
                }
              },
              mouseOut: function () {
                const pt = this as any;
                // Keep first slice (largest) always sliced, retract others
                const idx = pt.index;
                if (idx !== 0 && pt.sliced) {
                  pt.slice(false);
                }
              },
            },
          },
        },
      },

      series: [{ name: "Hallazgos", data: seriesData }],
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
      <div ref={containerRef} className="w-full h-full" />

      {/* ── Glassmorphism center total ── */}
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
              background: isLight
                ? "rgba(255,255,255,0.45)"
                : "rgba(20,20,55,0.45)",
              borderRadius: "16px",
              padding: "10px 18px",
              border: `1px solid ${isLight ? "rgba(139,92,246,0.2)" : "rgba(139,92,246,0.3)"}`,
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: isLight
                ? "0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)"
                : "0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ fontSize: "10px", color: textColor, opacity: 0.5, fontFamily: "'Inter',system-ui", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Total
            </div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: textColor, fontFamily: "'Inter',system-ui", lineHeight: 1.2 }}>
              {fmt(totalValue)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
