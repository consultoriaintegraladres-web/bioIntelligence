"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { ThemeMode } from "@/contexts/app-context";

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

// Vivid color palette inspired by the reference (green, pink, blue, orange, purple, red…)
const BAR_COLORS = [
  { light: "#a3f77b", mid: "#5dd827", base: "#3bb800", dark: "#1a6e00", glow: "rgba(59,184,0,0.5)" },
  { light: "#ff8ec6", mid: "#f74fa0", base: "#e91e8c", dark: "#8e0050", glow: "rgba(233,30,140,0.5)" },
  { light: "#7dd8ff", mid: "#45b8ea", base: "#0ea5e9", dark: "#075985", glow: "rgba(14,165,233,0.5)" },
  { light: "#ffd966", mid: "#f5b731", base: "#f59e0b", dark: "#a15e00", glow: "rgba(245,158,11,0.5)" },
  { light: "#c4b5fd", mid: "#a78bfa", base: "#8b5cf6", dark: "#4c1d95", glow: "rgba(139,92,246,0.5)" },
  { light: "#fca5a5", mid: "#f87171", base: "#ef4444", dark: "#991b1b", glow: "rgba(239,68,68,0.5)" },
  { light: "#6ee7b7", mid: "#34d399", base: "#10b981", dark: "#064e3b", glow: "rgba(16,185,129,0.5)" },
  { light: "#93c5fd", mid: "#60a5fa", base: "#3b82f6", dark: "#1e3a8a", glow: "rgba(59,130,246,0.5)" },
  { light: "#e879f9", mid: "#d946ef", base: "#c026d3", dark: "#701a75", glow: "rgba(192,38,211,0.5)" },
  { light: "#5eead4", mid: "#2dd4bf", base: "#14b8a6", dark: "#134e4a", glow: "rgba(20,184,166,0.5)" },
  { light: "#fde68a", mid: "#fbbf24", base: "#eab308", dark: "#854d0e", glow: "rgba(234,179,8,0.5)" },
  { light: "#c084fc", mid: "#a855f7", base: "#9333ea", dark: "#581c87", glow: "rgba(147,51,234,0.5)" },
];

const formatValue = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
};

// 3D geometry
const PEAK_H = 14;
const DEPTH_X = 16;
const DEPTH_Y = 10;
const BASE_BAND_H = 7;
const REFLECTION_H = 28;

export function BarChart3D({ data, themeMode = "dark", onItemClick }: BarChart3DProps) {
  const isLight = themeMode === "light";
  const textColor = isLight ? "#1e293b" : "#f1f5f9";
  const subtleColor = isLight ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.45)";
  const gridColor = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)";
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...data].sort((a, b) => b.valor - a.valor).slice(0, 12);
  }, [data]);

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

  const maxValue = useMemo(() => Math.max(...sortedData.map((d) => d.valor), 1), [sortedData]);
  const maxMillions = maxValue / 1_000_000;

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

  const pad = { left: 75, right: 30, top: 55, bottom: 160 };
  const cw = dims.w - pad.left - pad.right;
  const ch = dims.h - pad.top - pad.bottom;

  const bars = useMemo(() => {
    if (cw <= 0 || ch <= 0 || sortedData.length === 0) return [];
    const n = sortedData.length;
    const slotWidth = cw / n;
    const barWidth = Math.min(slotWidth * 0.55, 70);

    return sortedData.map((d, i) => {
      const centerX = (i + 0.5) * slotWidth;
      const heightPct = (d.valor / 1_000_000) / yMax;
      const barHeight = Math.max(heightPct * ch, 24);
      const c = BAR_COLORS[i % BAR_COLORS.length];
      return { ...d, centerX, barWidth, barHeight, heightPct, color: c, index: i };
    });
  }, [sortedData, cw, ch, yMax]);

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
          {yTicks.map((tick) => (
            <div key={`yt-${tick}`} style={{ position: "absolute", left: 0, bottom: `${pad.bottom + (ch * tick) / yMax}px`, width: pad.left - 10, textAlign: "right", fontSize: "11px", color: subtleColor, transform: "translateY(50%)", lineHeight: 1 }}>
              {tick.toFixed(1)}M
            </div>
          ))}

          {/* ── Y-axis title ── */}
          <div style={{ position: "absolute", left: 4, top: pad.top + ch / 2, transform: "rotate(-90deg) translateX(-50%)", transformOrigin: "0 0", fontSize: "12px", fontWeight: 500, color: subtleColor, whiteSpace: "nowrap" }}>
            Valor (Millones $)
          </div>

          {/* ── Chart area ── */}
          <div style={{ position: "absolute", left: pad.left, right: pad.right, top: pad.top, bottom: pad.bottom, overflow: "visible" }}>
            {/* Grid lines */}
            {yTicks.map((tick) => (
              <div key={`gl-${tick}`} style={{
                position: "absolute", left: 0, right: 0,
                bottom: `${(tick / yMax) * 100}%`,
                borderTop: `1px ${tick === 0 ? "solid" : "dotted"} ${tick === 0 ? (isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)") : gridColor}`,
              }} />
            ))}

            {/* ── Reflections (rendered first, behind bars) ── */}
            {bars.map((b, i) => {
              const c = b.color;
              const barLeft = b.centerX - b.barWidth / 2;
              return (
                <div key={`ref-${i}`} style={{
                  position: "absolute",
                  left: barLeft,
                  bottom: -REFLECTION_H,
                  width: b.barWidth,
                  height: REFLECTION_H,
                  background: `linear-gradient(180deg, ${c.dark} 0%, transparent 100%)`,
                  opacity: isLight ? 0.12 : 0.22,
                  pointerEvents: "none",
                  zIndex: 1,
                }} />
              );
            })}

            {/* ── 3D Pentagonal Bars ── */}
            {bars.map((b, i) => {
              const isHovered = hoveredIdx === i;
              const c = b.color;
              const barLeft = b.centerX - b.barWidth / 2;
              const totalH = b.barHeight + PEAK_H;
              const peakPct = ((PEAK_H / totalH) * 100).toFixed(1);
              const bw = b.barWidth;
              const halfBw = bw / 2;

              return (
                <div
                  key={`bar-${i}`}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => onItemClick?.(b.name)}
                  style={{
                    position: "absolute",
                    left: barLeft,
                    bottom: 0,
                    width: bw + DEPTH_X,
                    height: totalH + DEPTH_Y,
                    cursor: "pointer",
                    transformOrigin: "bottom center",
                    transform: isHovered ? "scaleX(1.12) scaleY(1.04)" : "scaleX(1) scaleY(1)",
                    transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s ease",
                    zIndex: isHovered ? 20 : 10,
                    filter: isHovered ? `drop-shadow(0 0 28px ${c.glow})` : "none",
                  }}
                >
                  {/* ▸ Front face — pentagon shape */}
                  <div style={{
                    position: "absolute",
                    left: 0,
                    bottom: 0,
                    width: bw,
                    height: totalH,
                    clipPath: `polygon(0% 100%, 0% ${peakPct}%, 50% 0%, 100% ${peakPct}%, 100% 100%)`,
                    background: `linear-gradient(180deg, ${c.light} 0%, ${c.mid} 20%, ${c.base} 55%, ${c.dark} 100%)`,
                  }} />

                  {/* ▸ Glossy vertical highlight strip */}
                  <div style={{
                    position: "absolute",
                    left: bw * 0.1,
                    bottom: BASE_BAND_H,
                    width: bw * 0.22,
                    height: b.barHeight - BASE_BAND_H,
                    background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.32) 40%, rgba(255,255,255,0.36) 55%, rgba(255,255,255,0) 100%)`,
                    pointerEvents: "none",
                  }} />

                  {/* ▸ Subtle edge highlight (right edge of front face) */}
                  <div style={{
                    position: "absolute",
                    right: DEPTH_X + 1,
                    bottom: BASE_BAND_H,
                    width: 2,
                    height: b.barHeight - BASE_BAND_H,
                    background: `linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)`,
                    pointerEvents: "none",
                  }} />

                  {/* ▸ Dark base pedestal band */}
                  <div style={{
                    position: "absolute",
                    left: 0,
                    bottom: 0,
                    width: bw + DEPTH_X,
                    height: BASE_BAND_H,
                    background: isLight
                      ? `linear-gradient(90deg, ${c.dark} 0%, rgba(0,0,0,0.7) 100%)`
                      : `linear-gradient(90deg, ${c.dark} 0%, rgba(0,0,0,0.85) 100%)`,
                    borderRadius: "0 2px 2px 0",
                  }} />

                  {/* ▸ Right side face (parallelogram) */}
                  <div style={{
                    position: "absolute",
                    left: bw,
                    top: PEAK_H,
                    width: DEPTH_X,
                    height: b.barHeight + DEPTH_Y,
                    clipPath: `polygon(0px ${DEPTH_Y}px, ${DEPTH_X}px 0px, ${DEPTH_X}px ${b.barHeight}px, 0px ${b.barHeight + DEPTH_Y}px)`,
                    background: `linear-gradient(180deg, ${c.dark} 0%, rgba(0,0,0,0.65) 100%)`,
                    opacity: 0.75,
                    pointerEvents: "none",
                  }} />

                  {/* ▸ Top-right roof face (from peak going back-right) */}
                  <div style={{
                    position: "absolute",
                    left: halfBw,
                    top: 0,
                    width: halfBw + DEPTH_X,
                    height: PEAK_H + DEPTH_Y,
                    clipPath: `polygon(0px ${DEPTH_Y}px, ${halfBw}px ${PEAK_H + DEPTH_Y}px, ${halfBw + DEPTH_X}px ${PEAK_H}px, ${DEPTH_X}px 0px)`,
                    background: `linear-gradient(135deg, ${c.mid} 0%, ${c.base} 100%)`,
                    opacity: 0.85,
                    pointerEvents: "none",
                  }} />

                  {/* ▸ Top-left roof face (lighter, facing light) */}
                  <div style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: halfBw + DEPTH_X,
                    height: PEAK_H + DEPTH_Y,
                    clipPath: `polygon(${halfBw}px ${DEPTH_Y}px, 0px ${PEAK_H + DEPTH_Y}px, ${DEPTH_X}px ${PEAK_H}px, ${halfBw + DEPTH_X}px 0px)`,
                    background: `linear-gradient(135deg, ${c.light} 0%, ${c.mid} 100%)`,
                    opacity: 0.7,
                    pointerEvents: "none",
                  }} />

                  {/* ▸ Ranking number on front face */}
                  <div style={{
                    position: "absolute",
                    left: 0,
                    bottom: BASE_BAND_H,
                    width: bw,
                    height: b.barHeight - BASE_BAND_H,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                  }}>
                    <span style={{
                      fontSize: Math.min(bw * 0.55, b.barHeight * 0.35, 50),
                      fontWeight: 900,
                      color: "rgba(255,255,255,0.18)",
                      textShadow: "0 2px 12px rgba(0,0,0,0.25)",
                      lineHeight: 1,
                      userSelect: "none",
                    }}>
                      {i + 1}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* ── Value labels above bars ── */}
            {bars.map((b, i) => {
              const isHovered = hoveredIdx === i;
              const c = b.color;
              return (
                <div key={`val-${i}`} style={{
                  position: "absolute",
                  left: b.centerX,
                  bottom: b.barHeight + PEAK_H + DEPTH_Y + 6,
                  transform: `translateX(-50%) ${isHovered ? "scale(1.08)" : "scale(1)"}`,
                  transition: "transform 0.3s ease, opacity 0.3s ease",
                  textAlign: "center",
                  pointerEvents: "none",
                  zIndex: isHovered ? 25 : 15,
                  opacity: isHovered ? 1 : 0.9,
                }}>
                  <div style={{
                    padding: "3px 10px",
                    borderRadius: "8px",
                    background: isHovered
                      ? (isLight ? "rgba(255,255,255,0.85)" : "rgba(15,15,40,0.7)")
                      : "transparent",
                    backdropFilter: isHovered ? "blur(8px)" : "none",
                    border: isHovered ? `1px solid ${c.base}55` : "1px solid transparent",
                    transition: "all 0.3s ease",
                  }}>
                    <div style={{
                      fontSize: isHovered ? "13px" : "11px",
                      fontWeight: 700,
                      color: isHovered ? c.base : textColor,
                      transition: "all 0.3s ease",
                      whiteSpace: "nowrap",
                    }}>
                      {formatValue(b.valor)}
                    </div>
                    <div style={{ fontSize: "9px", color: subtleColor }}>
                      ({b.cantidad.toLocaleString()})
                    </div>
                  </div>
                </div>
              );
            })}

            {/* ── Hover tooltip (glassmorphism + colored underline) ── */}
            {hoveredIdx !== null && bars[hoveredIdx] && (() => {
              const b = bars[hoveredIdx];
              const c = b.color;
              return (
                <div style={{
                  position: "absolute",
                  left: b.centerX,
                  bottom: b.barHeight + PEAK_H + DEPTH_Y + 58,
                  transform: "translateX(-50%)",
                  padding: "10px 16px",
                  background: isLight ? "rgba(255,255,255,0.8)" : "rgba(15,15,40,0.78)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  borderRadius: "12px",
                  border: `1px solid ${c.base}45`,
                  boxShadow: `0 8px 32px rgba(0,0,0,0.2), 0 0 0 1px ${c.base}15`,
                  pointerEvents: "none",
                  zIndex: 50,
                  whiteSpace: "nowrap",
                }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: c.base, marginBottom: 3 }}>
                    {b.name}
                  </div>
                  <div style={{ width: "100%", height: 2, background: `linear-gradient(90deg, ${c.base}, transparent)`, marginBottom: 7, borderRadius: 1 }} />
                  <div style={{ display: "flex", gap: 16, fontSize: "11px", color: textColor, opacity: 0.85 }}>
                    <div>
                      <span style={{ opacity: 0.5 }}>Valor</span><br />
                      <b>{formatValue(b.valor)}</b>
                    </div>
                    <div>
                      <span style={{ opacity: 0.5 }}>Cantidad</span><br />
                      <b>{b.cantidad.toLocaleString()}</b>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ── X-axis labels (2-line split) ── */}
          {bars.map((b, i) => {
            const isHovered = hoveredIdx === i;
            const c = b.color;
            const name = b.name;
            let line1 = name;
            let line2 = "";
            const maxLineLen = Math.max(18, Math.floor((b.barWidth * 2) / 6));
            if (name.length > maxLineLen) {
              const mid = Math.min(maxLineLen, Math.ceil(name.length / 2));
              const sp = name.lastIndexOf(" ", mid);
              if (sp > 5) {
                line1 = name.substring(0, sp);
                line2 = name.substring(sp + 1);
                if (line2.length > maxLineLen + 5) line2 = line2.substring(0, maxLineLen + 2) + "...";
              } else {
                line1 = name.substring(0, maxLineLen);
                line2 = name.substring(maxLineLen);
                if (line2.length > maxLineLen + 5) line2 = line2.substring(0, maxLineLen + 2) + "...";
              }
            }
            return (
              <div key={`xlabel-${i}`} style={{
                position: "absolute",
                left: pad.left + b.centerX,
                top: dims.h - pad.bottom + 12,
                transform: "translateX(-50%) rotate(-35deg)",
                transformOrigin: "top center",
                fontSize: isHovered ? "11px" : "10px",
                fontWeight: isHovered ? 700 : 500,
                color: isHovered ? c.base : subtleColor,
                transition: "all 0.3s ease",
                lineHeight: 1.3,
                textAlign: "left",
                width: "max-content",
                maxWidth: "160px",
              }}>
                <div>{line1}</div>
                {line2 && <div style={{ opacity: 0.75 }}>{line2}</div>}
              </div>
            );
          })}

          {/* ── Connecting baseline (gradient purple line) ── */}
          <div style={{
            position: "absolute",
            left: pad.left,
            bottom: pad.bottom,
            width: cw,
            height: 2,
            background: `linear-gradient(90deg, transparent 0%, ${isLight ? "rgba(139,92,246,0.25)" : "rgba(139,92,246,0.2)"} 15%, ${isLight ? "rgba(139,92,246,0.25)" : "rgba(139,92,246,0.2)"} 85%, transparent 100%)`,
            borderRadius: 1,
          }} />

          {/* ── Y-axis line ── */}
          <div style={{ position: "absolute", left: pad.left, bottom: pad.bottom, width: 1, height: ch, background: isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)" }} />
        </>
      )}
    </div>
  );
}
