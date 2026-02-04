"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export type ThemeMode = "dark" | "light" | "futuristic";

export interface FilterValues {
  numero_lote?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  nombre_ips?: string;
  codigo_habilitacion?: string;
  nombre_envio?: string;
  tipo_validacion?: string;
  origen?: string;
  lote_de_carga?: string;
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
  const [filters, setFilters] = useState<FilterValues>({});
  const [selectedIpsName, setSelectedIpsName] = useState("");
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Load theme and sidebar state from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("bioretail-theme") as ThemeMode;
    if (savedTheme && ["dark", "light", "futuristic"].includes(savedTheme)) {
      setThemeMode(savedTheme);
    }
    
    const savedSidebar = localStorage.getItem("bioretail-sidebar-collapsed");
    if (savedSidebar) {
      setSidebarCollapsed(savedSidebar === "true");
    }
  }, []);

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
