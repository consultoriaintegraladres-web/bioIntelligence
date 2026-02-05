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
  // Initialize filters from localStorage or default values
  const getInitialFilters = (): FilterValues => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem("bioretail-filters");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed;
      }
    } catch (e) {
      console.error("Error loading filters from localStorage:", e);
    }
    return {};
  };

  const [filters, setFiltersState] = useState<FilterValues>(getInitialFilters);
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
