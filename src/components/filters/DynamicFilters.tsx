"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { format, subDays } from "date-fns";
import { Calendar, Filter, RotateCcw, Search, AlertCircle, CheckCircle, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import debounce from "lodash.debounce";
import { useAppContext, FilterValues } from "@/contexts/app-context";

interface DynamicFiltersProps {
  onFiltersChange: (filters: FilterValues) => void;
  showLoteFilter?: boolean;
}

export type { FilterValues };

export function DynamicFilters({ onFiltersChange, showLoteFilter = true }: DynamicFiltersProps) {
  const { data: session } = useSession();
  const { themeMode, filters: contextFilters, setFilters: setContextFilters } = useAppContext();
  const isAdmin = session?.user?.role === "ADMIN";

  const isLight = themeMode === "light";
  const textColor = isLight ? "text-gray-900" : "text-white";
  const subTextColor = isLight ? "text-gray-600" : "text-gray-400";
  const cardBg = isLight ? "bg-white border-gray-200" : "bg-[#12121a]/80 border-[#1e1e2e]";
  const inputBg = isLight ? "bg-white border-gray-300 text-gray-900" : "bg-[#1a1a2e] border-[#2a2a3e] text-white";
  const inputText = isLight ? "text-gray-900" : "text-white";
  const labelColor = isLight ? "text-gray-700" : "text-gray-400";

  const today = new Date();
  const thirtyDaysAgo = subDays(today, 30);

  // Initialize filters from context or use defaults
  const getDefaultFilters = (): FilterValues => ({
    fecha_inicio: format(thirtyDaysAgo, "yyyy-MM-dd"),
    fecha_fin: format(today, "yyyy-MM-dd"),
    tipo_envio: "Primera vez",
  });

  const [filters, setFilters] = useState<FilterValues>(() => {
    // If context has filters, use them; otherwise use defaults
    const hasContextFilters = Object.keys(contextFilters).length > 0;
    return hasContextFilters ? contextFilters : getDefaultFilters();
  });

  const [ipsSearch, setIpsSearch] = useState("");
  const [showIpsSuggestions, setShowIpsSuggestions] = useState(false);
  const [loteInput, setLoteInput] = useState("");
  const [loteValidation, setLoteValidation] = useState<{ checked: boolean; exists: boolean } | null>(null);
  const [isValidatingLote, setIsValidatingLote] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const { data: ipsSuggestions } = useQuery({
    queryKey: ["ips_suggestions", ipsSearch],
    queryFn: async () => {
      if (!ipsSearch || ipsSearch.length < 2) return [];
      const res = await fetch(`/api/ips?search=${encodeURIComponent(ipsSearch)}`);
      const json = await res.json();
      return (json.data || []) as string[];
    },
    enabled: ipsSearch.length >= 2 && isAdmin,
  });

  const { data: tiposValidacion } = useQuery({
    queryKey: ["tipos_validacion"],
    queryFn: async () => {
      const res = await fetch("/api/reportes?tipo=tipos_validacion");
      const json = await res.json();
      return (json.data || []) as string[];
    },
  });

  const { data: origenes } = useQuery({
    queryKey: ["origenes"],
    queryFn: async () => {
      const res = await fetch("/api/reportes?tipo=origenes");
      const json = await res.json();
      return (json.data || []) as string[];
    },
  });

  const { data: tiposEnvio } = useQuery({
    queryKey: ["tipos_envio"],
    queryFn: async () => {
      const res = await fetch("/api/reportes?tipo=tipos_envio");
      const json = await res.json();
      return (json.data || []) as string[];
    },
  });

  const validateLote = useCallback(
    debounce(async (lote: string) => {
      if (!lote || lote.length < 1) {
        setLoteValidation(null);
        return;
      }
      
      setIsValidatingLote(true);
      try {
        const res = await fetch(`/api/validar-lote?lote=${encodeURIComponent(lote)}`);
        const json = await res.json();
        setLoteValidation({ checked: true, exists: json.exists });
      } catch {
        setLoteValidation(null);
      } finally {
        setIsValidatingLote(false);
      }
    }, 500),
    []
  );

  const handleFilterChange = (key: keyof FilterValues, value: string) => {
    if ((key === "fecha_inicio" || key === "fecha_fin") && !isAdmin) {
      const newFilters = { ...filters, [key]: value };
      if (newFilters.fecha_inicio && newFilters.fecha_fin) {
        const start = new Date(newFilters.fecha_inicio);
        const end = new Date(newFilters.fecha_fin);
        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays > 93) {
          toast.error("El rango de fechas no puede exceder 3 meses");
          return;
        }
      }
    }
    const updatedFilters = { ...filters, [key]: value };
    setFilters(updatedFilters);
    // Update context immediately so filters persist across navigation
    setContextFilters(updatedFilters);
  };

  const handleIpsSelect = (ips: string) => {
    setIpsSearch(ips);
    const updatedFilters = { ...filters, nombre_ips: ips };
    setFilters(updatedFilters);
    setContextFilters(updatedFilters);
    setShowIpsSuggestions(false);
  };

  const handleLoteChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    setLoteInput(numericValue);
    const updatedFilters = { ...filters, lote_de_carga: numericValue };
    setFilters(updatedFilters);
    setContextFilters(updatedFilters);
    validateLote(numericValue);
  };

  const handleApplyFilters = () => {
    setContextFilters(filters);
    onFiltersChange(filters);
  };

  const handleReset = () => {
    const resetFilters: FilterValues = {
      fecha_inicio: format(thirtyDaysAgo, "yyyy-MM-dd"),
      fecha_fin: format(today, "yyyy-MM-dd"),
      tipo_envio: "Primera vez",
    };
    setFilters(resetFilters);
    setContextFilters(resetFilters);
    setIpsSearch("");
    setLoteInput("");
    setLoteValidation(null);
    onFiltersChange(resetFilters);
  };

  // Sync local state with context when context changes (e.g., when navigating back)
  useEffect(() => {
    const hasContextFilters = Object.keys(contextFilters).length > 0;
    if (hasContextFilters) {
      setFilters(contextFilters);
      // Update local state for inputs that depend on filters
      if (contextFilters.nombre_ips) {
        setIpsSearch(contextFilters.nombre_ips);
      }
      if (contextFilters.lote_de_carga) {
        setLoteInput(contextFilters.lote_de_carga);
      }
    }
  }, [contextFilters]);

  // Truncate text for display (max 60 chars, split in 2 lines if needed)
  const truncateText = (text: string, maxLen: number = 60) => {
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + "...";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`${cardBg} backdrop-blur-xl`}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-[#6B2D7B]" />
            <h3 className={`text-base font-semibold ${textColor}`}>Filtros Dinámicos</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Fecha Inicio */}
            <div className="space-y-2">
              <Label className={`text-sm font-medium ${labelColor}`}>Fecha Inicio</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  type="date"
                  value={filters.fecha_inicio || ""}
                  onChange={(e) => handleFilterChange("fecha_inicio", e.target.value)}
                  className={`pl-10 ${inputBg} ${inputText} text-sm h-9`}
                />
              </div>
            </div>

            {/* Fecha Fin */}
            <div className="space-y-2">
              <Label className={`text-sm font-medium ${labelColor}`}>Fecha Fin</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  type="date"
                  value={filters.fecha_fin || ""}
                  onChange={(e) => handleFilterChange("fecha_fin", e.target.value)}
                  className={`pl-10 ${inputBg} ${inputText} text-sm h-9`}
                />
              </div>
            </div>

            {/* Nombre Envío */}
            <div className="space-y-2">
              <Label className={`text-sm font-medium ${labelColor}`}>Nombre Envío</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Buscar envío..."
                  value={filters.nombre_envio || ""}
                  onChange={(e) => handleFilterChange("nombre_envio", e.target.value)}
                  className={`pl-10 ${inputBg} ${inputText} text-sm h-9 placeholder:text-gray-500`}
                />
              </div>
            </div>

            {/* Tipo Envío */}
            <div className="space-y-2">
              <Label className={`text-sm font-medium ${labelColor}`}>Tipo Envío</Label>
              <Select
                value={filters.tipo_envio || "Primera vez"}
                onValueChange={(value) => handleFilterChange("tipo_envio", value)}
              >
                <SelectTrigger className={`${inputBg} ${inputText} text-sm h-9`}>
                  <SelectValue placeholder="Primera vez" />
                </SelectTrigger>
                <SelectContent className={isLight ? "bg-white border-gray-200" : "bg-[#1a1a2e] border-[#2a2a3e]"}>
                  {tiposEnvio?.map((tipo) => (
                    <SelectItem key={tipo} value={tipo} className={`text-sm ${textColor}`}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Más Filtros - Desplegable */}
          <div className="mt-4">
            <button
              onClick={() => setShowMoreFilters(!showMoreFilters)}
              className={`flex items-center gap-2 text-sm font-medium ${labelColor} hover:${textColor} transition-colors`}
            >
              {showMoreFilters ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              Más filtros
            </button>
            
            {showMoreFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"
              >
                {/* Nombre IPS - Autocomplete (only for admin) */}
                {isAdmin && (
                  <div className="space-y-2 relative">
                    <Label className={`text-sm font-medium ${labelColor}`}>Nombre IPS</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        type="text"
                        placeholder="Buscar IPS..."
                        value={ipsSearch}
                        onChange={(e) => {
                          setIpsSearch(e.target.value);
                          setShowIpsSuggestions(true);
                        }}
                        onFocus={() => setShowIpsSuggestions(true)}
                        className={`pl-10 ${inputBg} ${inputText} text-sm h-9 placeholder:text-gray-500`}
                      />
                      
                      {showIpsSuggestions && ipsSuggestions && ipsSuggestions.length > 0 && (
                        <div className={`absolute z-50 w-full mt-1 ${isLight ? "bg-white border-gray-200" : "bg-[#1a1a2e] border-[#2a2a3e]"} border rounded-lg shadow-xl max-h-48 overflow-y-auto`}>
                          {ipsSuggestions.map((ips, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleIpsSelect(ips)}
                              className={`w-full px-4 py-3 text-left text-sm ${textColor} hover:bg-[#6B2D7B]/20 transition-colors`}
                            >
                              {truncateText(ips)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Código Habilitación (only for admin) */}
                {isAdmin && (
                  <div className="space-y-2">
                    <Label className={`text-sm font-medium ${labelColor}`}>Código Habilitación</Label>
                    <Input
                      type="text"
                      placeholder="Código..."
                      value={filters.codigo_habilitacion || ""}
                      onChange={(e) => handleFilterChange("codigo_habilitacion", e.target.value)}
                      className={`${inputBg} ${inputText} text-sm h-9 placeholder:text-gray-500`}
                    />
                  </div>
                )}

                {/* Tipo Validación */}
                <div className="space-y-2">
                  <Label className={`text-sm font-medium ${labelColor}`}>Tipo Validación</Label>
                  <Select
                    value={filters.tipo_validacion || "all"}
                    onValueChange={(value) => handleFilterChange("tipo_validacion", value === "all" ? "" : value)}
                  >
                    <SelectTrigger className={`${inputBg} ${inputText} text-sm h-9`}>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className={`${isLight ? "bg-white border-gray-200" : "bg-[#1a1a2e] border-[#2a2a3e]"} max-h-64`}>
                      <SelectItem value="all" className={`${textColor} text-sm`}>Todos</SelectItem>
                      {tiposValidacion?.map((tipo) => (
                        <SelectItem key={tipo} value={tipo} className={`text-sm ${textColor}`}>
                          <span className="block max-w-[300px]" title={tipo}>
                            {truncateText(tipo)}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Origen */}
                <div className="space-y-2">
                  <Label className={`text-sm font-medium ${labelColor}`}>Origen</Label>
                  <Select
                    value={filters.origen || "all"}
                    onValueChange={(value) => handleFilterChange("origen", value === "all" ? "" : value)}
                  >
                    <SelectTrigger className={`${inputBg} ${inputText} text-sm h-9`}>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className={isLight ? "bg-white border-gray-200" : "bg-[#1a1a2e] border-[#2a2a3e]"}>
                      <SelectItem value="all" className={`${textColor} text-sm`}>Todos</SelectItem>
                      {origenes?.map((origen) => (
                        <SelectItem key={origen} value={origen} className={`text-sm ${textColor}`}>
                          {origen}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Lote de Carga */}
                {showLoteFilter && (
                  <div className="space-y-2">
                    <Label className={`text-sm font-medium ${labelColor}`}>Lote de Carga (Envío)</Label>
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="Ej: 1234"
                        value={loteInput}
                        onChange={(e) => handleLoteChange(e.target.value)}
                        className={`${inputBg} ${inputText} text-sm h-9 placeholder:text-gray-500 pr-10 ${
                          loteValidation?.checked && !loteValidation.exists
                            ? "border-red-500/50 focus:border-red-500"
                            : loteValidation?.checked && loteValidation.exists
                            ? "border-green-500/50 focus:border-green-500"
                            : ""
                        }`}
                      />
                      {isValidatingLote && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      {!isValidatingLote && loteValidation?.checked && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {loteValidation.exists ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {loteValidation?.checked && !loteValidation.exists && loteInput && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        No existe el envío ingresado
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Action Buttons */}
          <div className={`flex items-center gap-3 mt-6 pt-4 border-t ${isLight ? "border-gray-200" : "border-[#1e1e2e]"}`}>
            <Button
              onClick={handleApplyFilters}
              className="bg-gradient-to-r from-[#6B2D7B] to-[#4CAF50] hover:from-[#5B1D6B] hover:to-[#3CA040] text-white text-sm h-9 px-5"
            >
              <Filter className="w-4 h-4 mr-2" />
              Aplicar Filtros
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              className={`text-sm h-9 ${isLight ? "border-gray-300 text-gray-700 hover:bg-gray-100" : "border-[#2a2a3e] text-gray-400 hover:text-white hover:bg-[#1a1a2e]"}`}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Limpiar
            </Button>
            {!isAdmin && (
              <span className="text-sm text-amber-500 ml-auto">
                * Rango máximo: 3 meses
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
