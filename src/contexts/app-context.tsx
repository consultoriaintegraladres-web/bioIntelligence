"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export type ThemeMode = "dark" | "light" | "futuristic";

export interface FilterValues {
  numero_lote?: string;
  numero_factura?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  nombre_ips?: string;
  codigo_habilitacion?: string;
  nombre_envio?: string;
  tipo_validacion?: string;
  origen?: string;
  lote_de_carga?: string;
  tipo_envio?: string;
}

interface AppContextType {
  filters: FilterValues;
  setFilters: (filters: FilterValues) => void;
  selectedIpsName: string;
  setSelectedIpsName: (name: string) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({ children }: { children: ReactNode }) {
  // Always initialize with empty values to match server-rendered HTML (avoid hydration mismatch)
  const [filters, setFiltersState] = useState<FilterValues>({});
  const [selectedIpsName, setSelectedIpsName] = useState("");
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // #region agent log
  if (typeof window !== 'undefined') { fetch('http://127.0.0.1:7242/ingest/660cc560-af41-44a9-be17-cf7d8435b0ac',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app-context.tsx:init',message:'AppContext state init (post-fix)',data:{filtersKeys:Object.keys(filters).filter(k=>(filters as any)[k]),hasWindow:typeof window!=='undefined',filterValues:filters},timestamp:Date.now(),hypothesisId:'A-B',runId:'post-fix'})}).catch(()=>{}); }
  // #endregion

  // Load ALL client-side state from localStorage AFTER hydration (in useEffect)
  useEffect(() => {
    // Load saved filters
    try {
      const savedFilters = localStorage.getItem("bioretail-filters");
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters);
        setFiltersState(parsed);
      }
    } catch (e) {
      console.error("Error loading filters from localStorage:", e);
    }

    // Load saved theme
    const savedTheme = localStorage.getItem("bioretail-theme") as ThemeMode;
    if (savedTheme && ["dark", "light", "futuristic"].includes(savedTheme)) {
      setThemeMode(savedTheme);
    }

    // Load saved sidebar state
    const savedSidebar = localStorage.getItem("bioretail-sidebar-collapsed");
    if (savedSidebar) {
      setSidebarCollapsed(savedSidebar === "true");
    }
  }, []);

  // Save filters to localStorage whenever they change
  const setFilters = (newFilters: FilterValues) => {
    setFiltersState(newFilters);
    try {
      localStorage.setItem("bioretail-filters", JSON.stringify(newFilters));
    } catch (e) {
      console.error("Error saving filters to localStorage:", e);
    }
  };

  // Save theme to localStorage
  const handleSetThemeMode = (mode: ThemeMode) => {
    setThemeMode(mode);
    localStorage.setItem("bioretail-theme", mode);
  };

  // Save sidebar state to localStorage
  const handleSetSidebarCollapsed = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    localStorage.setItem("bioretail-sidebar-collapsed", String(collapsed));
  };

  return (
    <AppContext.Provider
      value={{
        filters,
        setFilters,
        selectedIpsName,
        setSelectedIpsName,
        themeMode,
        setThemeMode: handleSetThemeMode,
        sidebarCollapsed,
        setSidebarCollapsed: handleSetSidebarCollapsed,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppContextProvider");
  }
  return context;
}
