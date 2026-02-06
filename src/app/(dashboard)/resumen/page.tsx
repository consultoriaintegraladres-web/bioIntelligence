"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  AlertTriangle,
  DollarSign,
  Package,
  TrendingUp,
  Bot,
} from "lucide-react";
import dynamic from "next/dynamic";
import type { FilterValues } from "@/components/filters/DynamicFilters";

// Dynamic import with ssr: false to avoid hydration mismatch
// (Radix Select generates random aria-controls IDs that differ between server and client)
const DynamicFilters = dynamic(
  () => import("@/components/filters/DynamicFilters").then((mod) => mod.DynamicFilters),
  { ssr: false }
);
import { BarChart3D } from "@/components/charts/BarChart3D";
import { PieChart3D } from "@/components/charts/PieChart3D";
import { SourceChart3D } from "@/components/charts/SourceChart3D";
import { ResumenTable } from "@/components/tables/ResumenTable";
import { useAppContext } from "@/contexts/app-context";

interface KPIsData {
  totalLotes: number;
  totalFacturas: number;
  valorTotalReclamado: number;
  totalInconsistencias: number;
  valorTotalInconsistencias: number;
}

interface ResumenValidacion {
  tipo_validacion: string;
  cantidad_registros: number;
  valor_total: number;
  Recomendacion: string | null;
  Tipo_robot: string | null;
}

interface ResumenOrigen {
  origen: string;
  cantidad_hallazgos: number;
  valor_total: number;
}

export default function ResumenPage() {
  const { data: session } = useSession();
  const { filters, setFilters, setSelectedIpsName, themeMode } = useAppContext();

  const isLight = themeMode === "light";
  const textColor = isLight ? "text-gray-900" : "text-white";
  const subTextColor = isLight ? "text-gray-600" : "text-gray-400";
  const cardBg = isLight ? "bg-white border-gray-200" : "bg-[#12121a]/80 border-[#1e1e2e]";

  useEffect(() => {
    if (session?.user?.role === "USER" && session?.user?.name) {
      setSelectedIpsName(session.user.name);
    }
  }, [session, setSelectedIpsName]);

  const handleFiltersChange = (newFilters: FilterValues) => {
    setFilters(newFilters);
    if (newFilters.nombre_ips) {
      setSelectedIpsName(newFilters.nombre_ips);
    }
  };

  // Build query string from ALL filters including nombre_envio and tipo_envio
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.codigo_habilitacion) params.set("codigo_habilitacion", filters.codigo_habilitacion);
    if (filters.lote_de_carga) params.set("lote_de_carga", filters.lote_de_carga);
    if (filters.nombre_ips) params.set("nombre_ips", filters.nombre_ips);
    if (filters.fecha_inicio) params.set("fecha_inicio", filters.fecha_inicio);
    if (filters.fecha_fin) params.set("fecha_fin", filters.fecha_fin);
    if (filters.tipo_validacion) params.set("tipo_validacion", filters.tipo_validacion);
    if (filters.origen) params.set("origen", filters.origen);
    if (filters.nombre_envio) params.set("nombre_envio", filters.nombre_envio);
    if (filters.tipo_envio) params.set("tipo_envio", filters.tipo_envio);
    return params.toString();
  }, [filters]);

  const { data: kpisResponse, isLoading: loadingKPIs } = useQuery({
    queryKey: ["kpis", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/reportes?tipo=kpis&${queryString}`);
      const json = await res.json();
      return json;
    },
  });

  const kpis: KPIsData = kpisResponse?.data || {
    totalLotes: 0,
    totalFacturas: 0,
    valorTotalReclamado: 0,
    totalInconsistencias: 0,
    valorTotalInconsistencias: 0,
  };

  const { data: validacionResponse, isLoading: loadingValidacion } = useQuery({
    queryKey: ["resumen_validacion", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/reportes?tipo=resumen_validacion&${queryString}`);
      const json = await res.json();
      return json;
    },
  });

  const resumenValidacion: ResumenValidacion[] = validacionResponse?.data || [];

  const { data: origenResponse, isLoading: loadingOrigen } = useQuery({
    queryKey: ["resumen_origen", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/reportes?tipo=resumen_origen&${queryString}`);
      const json = await res.json();
      return json;
    },
  });

  const resumenOrigen: ResumenOrigen[] = origenResponse?.data || [];

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(1)}B`;
    }
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${value.toLocaleString()}`;
  };

  const kpiCards = [
    {
      title: "Total Lotes",
      value: kpis.totalLotes || 0,
      icon: Package,
      gradient: "from-[#9333EA] to-[#7C3AED]",
    },
    {
      title: "Total Facturas",
      value: kpis.totalFacturas || 0,
      icon: FileText,
      gradient: "from-[#10B981] to-[#059669]",
    },
    {
      title: "Valor Reclamado",
      value: formatCurrency(kpis.valorTotalReclamado || 0),
      icon: DollarSign,
      gradient: "from-[#9333EA] to-[#10B981]",
      isValue: true,
    },
    {
      title: "Hallazgos",
      value: kpis.totalInconsistencias || 0,
      icon: AlertTriangle,
      gradient: "from-[#F59E0B] to-[#D97706]",
    },
    {
      title: "Valor Hallazgos",
      value: formatCurrency(kpis.valorTotalInconsistencias || 0),
      icon: TrendingUp,
      gradient: "from-[#EC4899] to-[#DB2777]",
      isValue: true,
    },
  ];

  const barChartData = resumenValidacion.map((item) => ({
    name: item.tipo_validacion,
    cantidad: item.cantidad_registros,
    valor: item.valor_total,
  }));

  const pieChartData = resumenValidacion.map((item) => ({
    name: item.tipo_validacion,
    value: item.valor_total,
    cantidad: item.cantidad_registros,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className={`text-3xl font-bold ${textColor}`}>
            Dashboard de Hallazgos
          </h1>
          <p className={`${subTextColor} mt-1 text-base`}>
            Análisis de hallazgos detectados por IA
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-[#9333EA]/50 text-[#10B981] bg-[#9333EA]/10 px-4 py-2 text-sm"
        >
          <Bot className="w-4 h-4 mr-2" />
          Powered by AI
        </Badge>
      </motion.div>

      {/* Filters */}
      <DynamicFilters onFiltersChange={handleFiltersChange} showLoteFilter={true} />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi, index) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`${cardBg} backdrop-blur-xl hover:border-[#9333EA]/30 transition-all duration-300 group`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${subTextColor} uppercase tracking-wider font-medium`}>
                      {kpi.title}
                    </p>
                    {loadingKPIs ? (
                      <Skeleton className={`h-9 w-28 mt-1 ${isLight ? "bg-gray-200" : "bg-[#1a1a2e]"}`} />
                    ) : (
                      <p className={`text-2xl font-bold mt-1 ${kpi.isValue ? "font-mono" : ""} ${textColor}`}>
                        {typeof kpi.value === "number" ? kpi.value.toLocaleString() : kpi.value}
                      </p>
                    )}
                  </div>
                  <div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${kpi.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}
                  >
                    <kpi.icon className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts - ONE PER ROW */}
      <div className="space-y-6">
        {/* Bar Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className={`${cardBg} backdrop-blur-xl h-[550px]`}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-lg font-semibold ${textColor}`}>
                Distribución por Tipo de Validación
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[480px]">
              {loadingValidacion ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className={`h-64 w-64 rounded-full ${isLight ? "bg-gray-200" : "bg-[#1a1a2e]"}`} />
                </div>
              ) : (
                <BarChart3D data={barChartData} themeMode={themeMode} />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Pie Chart - BIGGER (30% of viewport height) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card className={`${cardBg} backdrop-blur-xl`} style={{ height: "calc(30vh + 200px)", minHeight: "550px" }}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-lg font-semibold ${textColor}`}>
                Proporción de Hallazgos
              </CardTitle>
            </CardHeader>
            <CardContent style={{ height: "calc(100% - 60px)" }}>
              {loadingValidacion ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className={`h-80 w-80 rounded-full ${isLight ? "bg-gray-200" : "bg-[#1a1a2e]"}`} />
                </div>
              ) : (
                <PieChart3D data={pieChartData} themeMode={themeMode} />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Source Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Card className={`${cardBg} backdrop-blur-xl h-[550px]`}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-lg font-semibold ${textColor}`}>
                Análisis por Origen/Fuente
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[480px]">
              {loadingOrigen ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className={`h-64 w-64 rounded-full ${isLight ? "bg-gray-200" : "bg-[#1a1a2e]"}`} />
                </div>
              ) : (
                <SourceChart3D data={resumenOrigen} themeMode={themeMode} />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Summary Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className={`${cardBg} backdrop-blur-xl`}>
          <CardHeader>
            <CardTitle className={`text-lg font-semibold ${textColor} flex items-center gap-2`}>
              <TrendingUp className="w-5 h-5 text-[#10B981]" />
              Resumen Consolidado por Tipo de Validación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResumenTable data={resumenValidacion} isLoading={loadingValidacion} themeMode={themeMode} filters={filters} />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
