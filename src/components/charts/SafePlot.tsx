"use client";

import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";

/**
 * SafePlot - A custom Plotly wrapper that loads Plotly.js from CDN.
 *
 * Why CDN? Because:
 * 1. react-plotly.js had a componentWillUnmount bug with Plotly.purge() in React 19 strict mode
 * 2. plotly.js source requires Node.js polyfills (buffer/) incompatible with Turbopack
 * 3. plotly.js-dist-min uses `self` which fails during SSR
 *
 * CDN loading completely bypasses all bundling issues while keeping full Plotly functionality.
 */

const PLOTLY_CDN = "https://cdn.plot.ly/plotly-2.35.2.min.js";

// Singleton promise for loading Plotly
let plotlyLoadPromise: Promise<any> | null = null;

function loadPlotlyCDN(): Promise<any> {
  // Already loaded?
  if (typeof window !== "undefined" && (window as any).Plotly) {
    return Promise.resolve((window as any).Plotly);
  }

  if (plotlyLoadPromise) return plotlyLoadPromise;

  plotlyLoadPromise = new Promise((resolve, reject) => {
    // Check if script tag already exists
    const existingScript = document.querySelector(`script[src="${PLOTLY_CDN}"]`) as HTMLScriptElement | null;
    if (existingScript) {
      // Script tag exists - wait for load or check if already loaded
      if ((window as any).Plotly) {
        resolve((window as any).Plotly);
        return;
      }
      const onLoad = () => {
        existingScript.removeEventListener("load", onLoad);
        resolve((window as any).Plotly);
      };
      const onError = (err: Event) => {
        existingScript.removeEventListener("error", onError);
        plotlyLoadPromise = null;
        reject(err);
      };
      existingScript.addEventListener("load", onLoad);
      existingScript.addEventListener("error", onError);
      return;
    }

    const script = document.createElement("script");
    script.src = PLOTLY_CDN;
    script.async = true;
    script.onload = () => {
      resolve((window as any).Plotly);
    };
    script.onerror = (err) => {
      plotlyLoadPromise = null; // Allow retry
      reject(err);
    };
    document.head.appendChild(script);
  });

  return plotlyLoadPromise;
}

interface SafePlotProps {
  data: any[];
  layout?: any;
  config?: any;
  style?: React.CSSProperties;
  className?: string;
}

const SafePlot = forwardRef<HTMLDivElement, SafePlotProps>(function SafePlot(
  { data, layout, config, style, className },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotlyRef = useRef<any>(null);
  const [plotlyLoaded, setPlotlyLoaded] = useState(false);
  const isInitializedRef = useRef(false);
  const isMountedRef = useRef(true);
  const renderCountRef = useRef(0);

  // Expose the container div as the forwarded ref
  useImperativeHandle(ref, () => containerRef.current as HTMLDivElement, []);

  // Effect 1: Load Plotly.js from CDN and handle cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    renderCountRef.current += 1;

    loadPlotlyCDN()
      .then((Plotly) => {
        if (isMountedRef.current) {
          plotlyRef.current = Plotly;
          setPlotlyLoaded(true);
        }
      })
      .catch((err) => {
        console.error("SafePlot: Failed to load Plotly from CDN", err);
      });

    return () => {
      isMountedRef.current = false;
      const el = containerRef.current;
      const Plotly = plotlyRef.current;
      if (el && Plotly && isInitializedRef.current) {
        try {
          Plotly.purge(el);
        } catch (_e) {
          // Safely ignore Plotly.purge errors during React strict mode double-invoke
        }
      }
      isInitializedRef.current = false;
    };
  }, []);

  // Effect 2: Render/update the plot when Plotly is loaded and data/layout/config change
  useEffect(() => {
    if (!plotlyLoaded || !plotlyRef.current || !isMountedRef.current) return;

    const el = containerRef.current;
    if (!el) return;

    const Plotly = plotlyRef.current;

    // Merge autosize into layout
    const finalLayout = { autosize: true, ...layout };

    const doRender = () => {
      if (!isMountedRef.current || !containerRef.current) return;

      try {
        if (isInitializedRef.current) {
          Plotly.react(el, data || [], finalLayout, config || {});
        } else {
          Plotly.newPlot(el, data || [], finalLayout, config || {});
          isInitializedRef.current = true;
        }

        // Force a relayout to ensure proper sizing after animation frames settle
        requestAnimationFrame(() => {
          if (isMountedRef.current && isInitializedRef.current && containerRef.current) {
            try {
              Plotly.Plots.resize(containerRef.current);
            } catch (_e) {
              // Ignore resize errors
            }
          }
        });
      } catch (e) {
        console.error("SafePlot: Error rendering plot", e);
        // Retry with newPlot
        try {
          isInitializedRef.current = false;
          Plotly.newPlot(el, data || [], finalLayout, config || {});
          isInitializedRef.current = true;
        } catch (e2) {
          console.error("SafePlot: Error rendering plot (retry)", e2);
        }
      }
    };

    // Use requestAnimationFrame to ensure the container is painted and has dimensions
    requestAnimationFrame(doRender);
  }, [plotlyLoaded, data, layout, config]);

  // Effect 3: Handle window resize for responsive behavior
  useEffect(() => {
    if (!plotlyLoaded || !containerRef.current || !plotlyRef.current) return;

    const el = containerRef.current;
    const Plotly = plotlyRef.current;

    const handleResize = () => {
      if (el && isInitializedRef.current && isMountedRef.current) {
        try {
          Plotly.Plots.resize(el);
        } catch (_e) {
          // Ignore resize errors
        }
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
    };
  }, [plotlyLoaded]);

  return (
    <div
      ref={containerRef}
      style={{ minHeight: "100px", ...style }}
      className={className}
    />
  );
});

SafePlot.displayName = "SafePlot";

export default SafePlot;
