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

// 3D bar color palette with gradient stops
const BAR_COLORS = [
  { light: "#e0d4ff", mid: "#a78bfa", base: "#8B5CF6", dark: "#4c1d95", glow: "rgba(139,92,246,0.4)" },
  { light: "#cffafe", mid: "#67e8f9", base: "#06B6D4", dark: "#164e63", glow: "rgba(6,182,212,0.4)" },
  { light: "#ffe4e9", mid: "#fb7185", base: "#F43F5E", dark: "#881337", glow: "rgba(244,63,94,0.4)" },
  { light: "#d1fae5", mid: "#6ee7b7", base: "#10B981", dark: "#064e3b", glow: "rgba(16,185,129,0.4)" },
  { light: "#fef3c7", mid: "#fbbf24", base: "#F59E0B", dark: "#78350f", glow: "rgba(245,158,11,0.4)" },
  { light: "#dbeafe", mid: "#93c5fd", base: "#3B82F6", dark: "#1e3a8a", glow: "rgba(59,130,246,0.4)" },
  { light: "#fce7f3", mid: "#f9a8d4", base: "#EC4899", dark: "#831843", glow: "rgba(236,72,153,0.4)" },
  { light: "#ccfbf1", mid: "#5eead4", base: "#14B8A6", dark: "#134e4a", glow: "rgba(20,184,166,0.4)" },
  { light: "#e0e7ff", mid: "#a5b4fc", base: "#6366F1", dark: "#3730a3", glow: "rgba(99,102,241,0.4)" },
  { light: "#ffe4e4", mid: "#fca5a5", base: "#EF4444", dark: "#7f1d1d", glow: "rgba(239,68,68,0.4)" },
  { light: "#fae8ff", mid: "#e879f9", base: "#D946EF", dark: "#701a75", glow: "rgba(217,70,239,0.4)" },
  { light: "#dcfce7", mid: "#86efac", base: "#22C55E", dark: "#14532d", glow: "rgba(34,197,94,0.4)" },
];

const formatValue = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
};

// 3D depth offsets (in px)
const DEPTH_X = 10;
const DEPTH_Y = 6;

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

  // Chart area padding
  const pad = { left: 75, right: 30, top: 45, bottom: 160 };
  const cw = dims.w - pad.left - pad.right;
  const ch = dims.h - pad.top - pad.bottom;

  // Bar dimensions
  const bars = useMemo(() => {
    if (cw <= 0 || ch <= 0 || sortedData.length === 0) return [];
    const n = sortedData.length;
    const slotWidth = cw / n;
    const barWidth = Math.min(slotWidth * 0.55, 65);

    return sortedData.map((d, i) => {
      const centerX = (i + 0.5) * slotWidth;
      const heightPct = (d.valor / 1_000_000) / yMax;
      const barHeight = heightPct * ch;
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

            {/* ── 3D Bars ── */}
            {bars.map((b, i) => {
              const isHovered = hoveredIdx === i;
              const c = b.color;
              const barLeft = b.centerX - b.barWidth / 2;

              return (
                <div
                  key={`bar-group-${i}`}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => onItemClick?.(b.name)}
                  style={{
                    position: "absolute",
                    left: barLeft,
                    bottom: 0,
                    width: b.barWidth,
                    height: b.barHeight,
                    cursor: "pointer",
                    transform: isHovered ? "scaleX(1.15) scaleY(1.02)" : "scaleX(1) scaleY(1)",
                    transformOrigin: "bottom center",
                    transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s ease",
                    zIndex: isHovered ? 20 : 10,
                    filter: isHovered ? `drop-shadow(0 0 20px ${c.glow})` : "none",
                  }}
                >
                  {/* Front face - main gradient bar */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "3px 3px 0 0",
                      background: `linear-gradient(180deg, ${c.light} 0%, ${c.mid} 25%, ${c.base} 55%, ${c.dark} 100%)`,
                      border: `1px solid ${isLight ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.15)"}`,
                      borderBottom: "none",
                    }}
                  />

                  {/* Glossy highlight overlay */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: "10%",
                      width: "40%",
                      height: Math.min(b.barHeight * 0.4, 60),
                      borderRadius: "0 0 50% 50%",
                      background: "linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 100%)",
                      pointerEvents: "none",
                    }}
                  />

                  {/* Top face (3D parallelogram) */}
                  <div
                    style={{
                      position: "absolute",
                      top: -DEPTH_Y,
                      left: 0,
                      width: b.barWidth,
                      height: DEPTH_Y + 1,
                      background: `linear-gradient(90deg, ${c.light}, ${c.mid})`,
                      clipPath: `polygon(0% 100%, 100% 100%, calc(100% + ${DEPTH_X}px) 0%, ${DEPTH_X}px 0%)`,
                      borderTop: `1px solid rgba(255,255,255,0.3)`,
                      pointerEvents: "none",
                    }}
                  />

                  {/* Right side face (3D parallelogram) */}
                  <div
                    style={{
                      position: "absolute",
                      top: -DEPTH_Y,
                      right: -DEPTH_X,
                      width: DEPTH_X + 1,
                      height: b.barHeight + DEPTH_Y,
                      background: `linear-gradient(180deg, ${c.dark}, ${c.dark})`,
                      clipPath: `polygon(0% ${DEPTH_Y}px, 100% 0%, 100% calc(100% - ${DEPTH_Y}px), 0% 100%)`,
                      opacity: 0.7,
                      pointerEvents: "none",
                    }}
                  />
                </div>
              );
            })}

            {/* ── Value labels above bars ── */}
            {bars.map((b, i) => {
              const isHovered = hoveredIdx === i;
              return (
                <div
                  key={`val-${i}`}
                  style={{
                    position: "absolute",
                    left: b.centerX,
                    bottom: b.barHeight + DEPTH_Y + 6,
                    transform: `translateX(-50%) ${isHovered ? "scale(1.1)" : "scale(1)"}`,
                    transition: "transform 0.3s ease",
                    textAlign: "center",
                    pointerEvents: "none",
                    zIndex: isHovered ? 21 : 11,
                  }}
                >
                  <div style={{ fontSize: isHovered ? "12px" : "11px", fontWeight: 700, color: textColor, transition: "font-size 0.3s ease", whiteSpace: "nowrap" }}>
                    {formatValue(b.valor)}
                  </div>
                  <div style={{ fontSize: "9px", color: subtleColor }}>
                    ({b.cantidad.toLocaleString()})
                  </div>
                </div>
              );
            })}

            {/* ── Hover tooltip (glassmorphism) ── */}
            {hoveredIdx !== null && bars[hoveredIdx] && (
              <div
                style={{
                  position: "absolute",
                  left: bars[hoveredIdx].centerX,
                  bottom: bars[hoveredIdx].barHeight + DEPTH_Y + 50,
                  transform: "translateX(-50%)",
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
                }}
              >
                <div style={{ fontSize: "13px", fontWeight: 700, color: textColor, marginBottom: 4, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {bars[hoveredIdx].name}
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: "11px", color: textColor, opacity: 0.85 }}>
                  <div>
                    <span style={{ opacity: 0.5 }}>Valor</span>
                    <br />
                    <b>{formatValue(bars[hoveredIdx].valor)}</b>
                  </div>
                  <div>
                    <span style={{ opacity: 0.5 }}>Cantidad</span>
                    <br />
                    <b>{bars[hoveredIdx].cantidad.toLocaleString()}</b>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── X-axis labels (2-line, centered) ── */}
          {bars.map((b, i) => {
            const isHovered = hoveredIdx === i;
            // Split name into 2 lines
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
              <div
                key={`xlabel-${i}`}
                style={{
                  position: "absolute",
                  left: pad.left + b.centerX,
                  top: dims.h - pad.bottom + 8,
                  transform: "translateX(-50%) rotate(-40deg)",
                  transformOrigin: "top center",
                  fontSize: isHovered ? "11px" : "10px",
                  fontWeight: isHovered ? 600 : 400,
                  color: isHovered ? (isLight ? "#6d28d9" : "#a78bfa") : subtleColor,
                  transition: "all 0.3s ease",
                  lineHeight: 1.3,
                  textAlign: "left",
                  width: "max-content",
                  maxWidth: "160px",
                }}
              >
                <div>{line1}</div>
                {line2 && <div style={{ opacity: 0.75 }}>{line2}</div>}
              </div>
            );
          })}

          {/* ── X-axis line ── */}
          <div style={{ position: "absolute", left: pad.left, bottom: pad.bottom, width: cw, height: 1, background: isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)" }} />
          <div style={{ position: "absolute", left: pad.left, bottom: pad.bottom, width: 1, height: ch, background: isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)" }} />
        </>
      )}
    </div>
  );
}
