"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { ThemeMode } from "@/contexts/app-context";

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

// 3D sphere color palette
const SPHERE_COLORS = [
  { base: "#8B5CF6", light: "#e0d4ff", mid: "#a78bfa", dark: "#4c1d95", glow: "rgba(139,92,246,0.45)" },
  { base: "#06B6D4", light: "#cffafe", mid: "#67e8f9", dark: "#164e63", glow: "rgba(6,182,212,0.45)" },
  { base: "#F43F5E", light: "#ffe4e9", mid: "#fb7185", dark: "#881337", glow: "rgba(244,63,94,0.45)" },
  { base: "#10B981", light: "#d1fae5", mid: "#6ee7b7", dark: "#064e3b", glow: "rgba(16,185,129,0.45)" },
  { base: "#F59E0B", light: "#fef3c7", mid: "#fbbf24", dark: "#78350f", glow: "rgba(245,158,11,0.45)" },
  { base: "#3B82F6", light: "#dbeafe", mid: "#93c5fd", dark: "#1e3a8a", glow: "rgba(59,130,246,0.45)" },
  { base: "#EC4899", light: "#fce7f3", mid: "#f9a8d4", dark: "#831843", glow: "rgba(236,72,153,0.45)" },
  { base: "#14B8A6", light: "#ccfbf1", mid: "#5eead4", dark: "#134e4a", glow: "rgba(20,184,166,0.45)" },
  { base: "#6366F1", light: "#e0e7ff", mid: "#a5b4fc", dark: "#3730a3", glow: "rgba(99,102,241,0.45)" },
  { base: "#D946EF", light: "#fae8ff", mid: "#e879f9", dark: "#701a75", glow: "rgba(217,70,239,0.45)" },
];

const formatValue = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
};

export function SourceChart3D({ data, themeMode = "dark", onItemClick }: SourceChart3DProps) {
  const isLight = themeMode === "light";
  const textColor = isLight ? "#1e293b" : "#f1f5f9";
  const subtleColor = isLight ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.45)";
  const gridColor = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)";
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...data].sort((a, b) => b.valor_total - a.valor_total);
  }, [data]);

  // Observe container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setDims({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const maxValue = useMemo(() => Math.max(...sortedData.map((d) => d.valor_total), 1), [sortedData]);
  const maxMillions = maxValue / 1_000_000;

  // Y-axis ticks
  const yTicks = useMemo(() => {
    if (maxMillions <= 0) return [0];
    const rawStep = maxMillions / 5;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const nice = [1, 2, 5, 10].find((n) => n * mag >= rawStep) || 10;
    const step = nice * mag;
    const ticks: number[] = [];
    for (let v = 0; v <= maxMillions + step * 0.5; v += step) {
      ticks.push(Math.round(v * 100) / 100);
    }
    return ticks;
  }, [maxMillions]);

  const yMax = yTicks[yTicks.length - 1] || 1;

  // Padding for chart area
  const pad = { left: 75, right: 30, top: 50, bottom: 90 };
  const cw = dims.w - pad.left - pad.right;
  const ch = dims.h - pad.top - pad.bottom;

  // Sphere positions and sizes
  const spheres = useMemo(() => {
    if (cw <= 0 || ch <= 0 || sortedData.length === 0) return [];
    const n = sortedData.length;
    const slotWidth = cw / n;
    // Sphere size: proportional to value, min 45px, max determined by available space
    const maxSize = Math.min(180, slotWidth * 0.85, ch * 0.45);
    const minSize = Math.max(30, maxSize * 0.18);

    return sortedData.map((d, i) => {
      const xPct = ((i + 0.5) * slotWidth) / cw;
      const yPct = (d.valor_total / 1_000_000) / yMax;
      const sizeNorm = d.valor_total / maxValue;
      const size = minSize + sizeNorm * (maxSize - minSize);
      const c = SPHERE_COLORS[i % SPHERE_COLORS.length];
      return { ...d, xPct, yPct, size, color: c, index: i };
    });
  }, [sortedData, cw, ch, yMax, maxValue]);

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full text-lg ${isLight ? "text-gray-500" : "text-gray-400"}`}>
        No hay datos disponibles
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative select-none" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {dims.w > 0 && dims.h > 0 && (
        <>
          {/* ── Y-axis labels ── */}
          {yTicks.map((tick) => {
            const bottomPct = (tick / yMax) * 100;
            return (
              <div key={`yt-${tick}`} style={{ position: "absolute", left: 0, bottom: `${pad.bottom + (ch * tick) / yMax}px`, width: pad.left - 8, textAlign: "right", fontSize: "11px", color: subtleColor, transform: "translateY(50%)", lineHeight: 1 }}>
                {tick.toFixed(1)}M
              </div>
            );
          })}

          {/* ── Y-axis title ── */}
          <div style={{ position: "absolute", left: 4, top: pad.top + ch / 2, transform: "rotate(-90deg) translateX(-50%)", transformOrigin: "0 0", fontSize: "12px", fontWeight: 500, color: subtleColor, whiteSpace: "nowrap" }}>
            Valor (Millones $)
          </div>

          {/* ── Chart area ── */}
          <div style={{ position: "absolute", left: pad.left, right: pad.right, top: pad.top, bottom: pad.bottom, overflow: "visible" }}>
            {/* Grid lines */}
            {yTicks.map((tick) => (
              <div
                key={`gl-${tick}`}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: `${(tick / yMax) * 100}%`,
                  borderTop: `1px ${tick === 0 ? "solid" : "dotted"} ${tick === 0 ? (isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)") : gridColor}`,
                }}
              />
            ))}

            {/* ── Spheres ── */}
            {spheres.map((s, i) => {
              const isHovered = hoveredIdx === i;
              const c = s.color;
              return (
                <div
                  key={`sphere-${i}`}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => onItemClick?.(s.origen || "Sin origen")}
                  style={{
                    position: "absolute",
                    left: `${s.xPct * 100}%`,
                    bottom: `${s.yPct * 100}%`,
                    width: s.size,
                    height: s.size,
                    transform: `translate(-50%, 50%) ${isHovered ? "scale(1.4)" : "scale(1)"}`,
                    transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease",
                    borderRadius: "50%",
                    background: `radial-gradient(circle at 32% 28%, ${c.light}, ${c.mid} 35%, ${c.base} 60%, ${c.dark} 100%)`,
                    boxShadow: isHovered
                      ? `0 0 40px ${c.glow}, 0 12px 35px rgba(0,0,0,0.35), inset 0 -4px 12px rgba(0,0,0,0.2), inset 0 2px 6px rgba(255,255,255,0.25)`
                      : `0 8px 25px rgba(0,0,0,0.22), inset 0 -3px 10px rgba(0,0,0,0.15), inset 0 2px 6px rgba(255,255,255,0.2)`,
                    cursor: "pointer",
                    zIndex: isHovered ? 30 : 10,
                  }}
                >
                  {/* Glossy highlight overlay */}
                  <div
                    style={{
                      position: "absolute",
                      top: "10%",
                      left: "18%",
                      width: "42%",
                      height: "35%",
                      borderRadius: "50%",
                      background: "radial-gradient(ellipse at center, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 100%)",
                      transform: "rotate(-25deg)",
                      pointerEvents: "none",
                    }}
                  />
                </div>
              );
            })}

            {/* ── Value labels above spheres ── */}
            {spheres.map((s, i) => {
              const isHovered = hoveredIdx === i;
              return (
                <div
                  key={`lbl-${i}`}
                  style={{
                    position: "absolute",
                    left: `${s.xPct * 100}%`,
                    bottom: `${s.yPct * 100 + (s.size / ch) * 50 + 3}%`,
                    transform: `translateX(-50%) translateY(-${s.size * 0.5 + 8}px) ${isHovered ? "scale(1.1)" : "scale(1)"}`,
                    transition: "transform 0.3s ease, opacity 0.3s ease",
                    textAlign: "center",
                    pointerEvents: "none",
                    zIndex: isHovered ? 31 : 11,
                    opacity: isHovered ? 1 : 0.85,
                  }}
                >
                  <div style={{ fontSize: isHovered ? "13px" : "11px", fontWeight: 700, color: textColor, transition: "font-size 0.3s ease" }}>
                    {formatValue(s.valor_total)}
                  </div>
                  <div style={{ fontSize: "10px", color: subtleColor }}>
                    ({s.cantidad_hallazgos.toLocaleString()})
                  </div>
                </div>
              );
            })}

            {/* ── Hover tooltip (glassmorphism) ── */}
            {hoveredIdx !== null && spheres[hoveredIdx] && (
              <div
                style={{
                  position: "absolute",
                  left: `${spheres[hoveredIdx].xPct * 100}%`,
                  bottom: `${spheres[hoveredIdx].yPct * 100}%`,
                  transform: `translate(-50%, -${spheres[hoveredIdx].size * 0.7 + 60}px)`,
                  padding: "10px 16px",
                  background: isLight ? "rgba(255,255,255,0.7)" : "rgba(15,15,40,0.7)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  borderRadius: "12px",
                  border: `1px solid ${isLight ? "rgba(139,92,246,0.2)" : "rgba(139,92,246,0.35)"}`,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                  pointerEvents: "none",
                  zIndex: 50,
                  whiteSpace: "nowrap",
                  fontFamily: "'Inter', system-ui",
                }}
              >
                <div style={{ fontSize: "13px", fontWeight: 700, color: textColor, marginBottom: 4 }}>
                  {spheres[hoveredIdx].origen || "Sin origen"}
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: "11px", color: textColor, opacity: 0.85 }}>
                  <div>
                    <span style={{ opacity: 0.5 }}>Valor</span>
                    <br />
                    <b>{formatValue(spheres[hoveredIdx].valor_total)}</b>
                  </div>
                  <div>
                    <span style={{ opacity: 0.5 }}>Cantidad</span>
                    <br />
                    <b>{spheres[hoveredIdx].cantidad_hallazgos.toLocaleString()}</b>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── X-axis labels ── */}
          {spheres.map((s, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <div
                key={`xlabel-${i}`}
                style={{
                  position: "absolute",
                  left: pad.left + s.xPct * cw,
                  top: dims.h - pad.bottom + 12,
                  transform: "translateX(-50%) rotate(-30deg)",
                  transformOrigin: "top center",
                  fontSize: isHovered ? "12px" : "11px",
                  fontWeight: isHovered ? 600 : 400,
                  color: isHovered ? (isLight ? "#6d28d9" : "#a78bfa") : subtleColor,
                  transition: "all 0.3s ease",
                  whiteSpace: "nowrap",
                  maxWidth: "120px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {s.origen || "Sin origen"}
              </div>
            );
          })}

          {/* ── X-axis title ── */}
          <div style={{ position: "absolute", left: pad.left + cw / 2, bottom: 6, transform: "translateX(-50%)", fontSize: "12px", fontWeight: 500, color: subtleColor }}>
            Origen / Fuente
          </div>

          {/* ── Axis lines ── */}
          <div style={{ position: "absolute", left: pad.left, bottom: pad.bottom, width: cw, height: 1, background: isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)" }} />
          <div style={{ position: "absolute", left: pad.left, bottom: pad.bottom, width: 1, height: ch, background: isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)" }} />
        </>
      )}
    </div>
  );
}
