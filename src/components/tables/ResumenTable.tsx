"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Bot, Lightbulb, Download, Eye, FileText, X } from "lucide-react";
import { ThemeMode, FilterValues } from "@/contexts/app-context";
import { exportToExcel } from "@/lib/excel-export";
import { format } from "date-fns";

interface ResumenData {
  tipo_validacion: string;
  cantidad_registros: number;
  valor_total: number;
  Recomendacion: string | null;
  Tipo_robot: string | null;
}

interface HallazgoDetalle {
  inconsistencia_id: number;
  Numero_factura: string | null;
  IPS: string | null;
  origen: string | null;
  tipo_validacion: string | null;
  observacion: string | null;
  descripcion_servicio: string | null;
  cantidad: number | null;
  valor_unitario: string | null;
  valor_total: string | null;
  fecha: string | null;
  lote_de_carga: string | null;
}

interface ResumenTableProps {
  data: ResumenData[];
  isLoading: boolean;
  themeMode?: ThemeMode;
  filters?: FilterValues;
}

const truncateText = (text: string, maxLen: number = 60) => {
  if (!text) return "-";
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 3) + "...";
};

export function ResumenTable({ data, isLoading, themeMode = "dark", filters = {} }: ResumenTableProps) {
  const isLight = themeMode === "light";
  const textColor = isLight ? "text-gray-900" : "text-white";
  const subTextColor = isLight ? "text-gray-600" : "text-gray-400";
  const headerBg = isLight ? "bg-gray-100" : "bg-[#1a1a2e]/50";
  const borderColor = isLight ? "border-gray-200" : "border-[#1e1e2e]";
  const hoverBg = isLight ? "hover:bg-gray-50" : "hover:bg-[#1a1a2e]/30";
  const skeletonBg = isLight ? "bg-gray-200" : "bg-[#1a1a2e]";

  const [selectedTipoValidacion, setSelectedTipoValidacion] = useState<string | null>(null);

  // Build query string for hallazgos modal
  const hallazgosQueryString = (() => {
    if (!selectedTipoValidacion) return "";
    const params = new URLSearchParams({ limit: "5000", page: "1" });
    params.set("tipo_validacion", selectedTipoValidacion);
    if (filters.codigo_habilitacion) params.set("codigo_habilitacion", filters.codigo_habilitacion);
    if (filters.lote_de_carga) params.set("lote_de_carga", filters.lote_de_carga);
    if (filters.fecha_inicio) params.set("fecha_inicio", filters.fecha_inicio);
    if (filters.fecha_fin) params.set("fecha_fin", filters.fecha_fin);
    if (filters.nombre_ips) params.set("nombre_ips", filters.nombre_ips);
    if (filters.nombre_envio) params.set("nombre_envio", filters.nombre_envio);
    if (filters.tipo_envio) params.set("tipo_envio", filters.tipo_envio);
    if (filters.origen) params.set("origen", filters.origen);
    return params.toString();
  })();

  const { data: hallazgosData, isLoading: loadingHallazgos } = useQuery({
    queryKey: ["hallazgos_por_tipo", hallazgosQueryString],
    queryFn: async () => {
      const res = await fetch(`/api/inconsistencias?${hallazgosQueryString}`);
      const json = await res.json();
      return json;
    },
    enabled: !!selectedTipoValidacion,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyStr = (value: string | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(parseFloat(value));
  };

  const handleExportResumen = () => {
    if (!data || data.length === 0) return;
    const headers = ["Tipo de Validación", "Cantidad", "Valor Total", "Robot", "Recomendación"];
    const rows = data.map((row) => [
      row.tipo_validacion,
      row.cantidad_registros,
      row.valor_total,
      row.Tipo_robot || "",
      row.Recomendacion || "",
    ]);
    exportToExcel({
      fileName: `resumen_validacion_${format(new Date(), "yyyy-MM-dd")}`,
      sheetName: "Resumen Validación",
      headers,
      rows,
    });
  };

  const handleExportHallazgos = () => {
    if (!hallazgosData?.data || hallazgosData.data.length === 0) return;
    const headers = [
      "No. Factura", "IPS", "Origen", "Tipo Validación",
      "Descripción Servicio", "Cantidad", "Valor Unitario", "Valor Total",
      "Fecha", "Lote", "Observación",
    ];
    const rows = hallazgosData.data.map((item: HallazgoDetalle) => [
      item.Numero_factura || "",
      item.IPS || "",
      item.origen || "",
      item.tipo_validacion || "",
      item.descripcion_servicio || "",
      item.cantidad || "",
      item.valor_unitario || "",
      item.valor_total || "",
      item.fecha || "",
      item.lote_de_carga || "",
      item.observacion || "",
    ]);
    const tipoClean = (selectedTipoValidacion || "hallazgos").substring(0, 30).replace(/[^a-zA-Z0-9]/g, "_");
    exportToExcel({
      fileName: `hallazgos_${tipoClean}_${format(new Date(), "yyyy-MM-dd")}`,
      sheetName: "Hallazgos",
      headers,
      rows,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className={`h-14 w-full ${skeletonBg}`} />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-48 text-lg ${subTextColor}`}>
        No hay datos disponibles. Aplique filtros para ver información.
      </div>
    );
  }

  return (
    <TooltipProvider>
      {/* Export button */}
      <div className="flex justify-end mb-3">
        <Button
          onClick={handleExportResumen}
          variant="outline"
          size="sm"
          className={`text-sm ${isLight ? "border-gray-300 text-gray-700 hover:bg-gray-100" : "border-[#9333EA]/50 text-[#10B981] hover:bg-[#9333EA]/10"}`}
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar Excel
        </Button>
      </div>

      <div className={`rounded-xl border ${borderColor} overflow-hidden`}>
        <Table>
          <TableHeader>
            <TableRow className={`${headerBg} ${borderColor}`}>
              <TableHead className={`${textColor} font-semibold text-base py-4`}>Tipo de Validación</TableHead>
              <TableHead className={`${textColor} font-semibold text-base text-center py-4`}>Cantidad</TableHead>
              <TableHead className={`${textColor} font-semibold text-base text-right py-4`}>Valor Total</TableHead>
              <TableHead className={`${textColor} font-semibold text-base py-4`}>Robot</TableHead>
              <TableHead className={`${textColor} font-semibold text-base py-4`}>Recomendación</TableHead>
              <TableHead className={`${textColor} font-semibold text-base text-center py-4 w-[80px]`}>Ver</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <motion.tr
                key={row.tipo_validacion + index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`border-b ${borderColor} ${hoverBg} transition-colors cursor-pointer`}
                onClick={() => setSelectedTipoValidacion(row.tipo_validacion)}
              >
                <TableCell className="max-w-[350px] py-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={`text-base ${textColor} cursor-help leading-relaxed block`}>
                        {truncateText(row.tipo_validacion, 60)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className={`max-w-lg p-3 ${isLight ? "bg-white border-gray-200 text-gray-900" : "bg-[#1e1e2e] border-[#2a2a3e] text-white"}`}
                    >
                      <p className="text-sm leading-relaxed">{row.tipo_validacion}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-center py-4">
                  <Badge
                    variant="outline"
                    className="border-[#10B981]/50 text-[#10B981] bg-[#10B981]/10 font-mono text-base px-3 py-1"
                  >
                    {row.cantidad_registros.toLocaleString()}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-[#10B981] font-semibold text-base py-4">
                  {formatCurrency(row.valor_total)}
                </TableCell>
                <TableCell className="py-4">
                  {row.Tipo_robot ? (
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-[#9333EA]" />
                      <span className="text-sm text-[#9333EA] font-medium">{row.Tipo_robot}</span>
                    </div>
                  ) : (
                    <span className={`text-sm ${subTextColor}`}>-</span>
                  )}
                </TableCell>
                <TableCell className="max-w-[280px] py-4">
                  {row.Recomendacion ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 cursor-help">
                          <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <span className={`text-base ${textColor} leading-relaxed`}>
                            {truncateText(row.Recomendacion, 50)}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="left"
                        className={`max-w-md p-3 ${isLight ? "bg-white border-gray-200 text-gray-900" : "bg-[#1e1e2e] border-[#2a2a3e] text-white"}`}
                      >
                        <p className="text-sm leading-relaxed">{row.Recomendacion}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className={`text-sm ${subTextColor}`}>Sin recomendación</span>
                  )}
                </TableCell>
                <TableCell className="text-center py-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTipoValidacion(row.tipo_validacion);
                    }}
                    className={`${isLight ? "hover:bg-gray-100" : "hover:bg-[#9333EA]/10"} hover:text-[#10B981]`}
                  >
                    <Eye className="w-5 h-5" />
                  </Button>
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Modal: Hallazgos por tipo de validación */}
      <Dialog open={!!selectedTipoValidacion} onOpenChange={() => setSelectedTipoValidacion(null)}>
        <DialogContent className={`${isLight ? "bg-white border-gray-200" : "bg-[#12121a] border-[#1e1e2e]"} max-w-6xl max-h-[85vh] overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 text-lg ${textColor}`}>
              <FileText className="w-5 h-5 text-[#10B981]" />
              <span className="truncate">Hallazgos: {truncateText(selectedTipoValidacion || "", 60)}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex justify-between items-center mt-2">
            <p className={`text-sm ${subTextColor}`}>
              {hallazgosData?.data?.length || 0} registros encontrados
            </p>
            <Button
              onClick={handleExportHallazgos}
              variant="outline"
              size="sm"
              disabled={!hallazgosData?.data?.length}
              className={`text-sm ${isLight ? "border-gray-300 text-gray-700 hover:bg-gray-100" : "border-[#9333EA]/50 text-[#10B981] hover:bg-[#9333EA]/10"}`}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
          </div>

          <div className="overflow-x-auto mt-3">
            {loadingHallazgos ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className={`h-12 w-full ${skeletonBg}`} />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className={`${headerBg} ${borderColor}`}>
                    <TableHead className={`${textColor} font-semibold text-sm py-3`}>Factura</TableHead>
                    <TableHead className={`${textColor} font-semibold text-sm py-3`}>IPS</TableHead>
                    <TableHead className={`${textColor} font-semibold text-sm py-3`}>Origen</TableHead>
                    <TableHead className={`${textColor} font-semibold text-sm py-3`}>Descripción</TableHead>
                    <TableHead className={`${textColor} font-semibold text-sm text-right py-3`}>Valor Total</TableHead>
                    <TableHead className={`${textColor} font-semibold text-sm py-3`}>Fecha</TableHead>
                    <TableHead className={`${textColor} font-semibold text-sm py-3`}>Observación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hallazgosData?.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className={`text-center py-8 ${subTextColor}`}>
                        No se encontraron hallazgos para este tipo de validación
                      </TableCell>
                    </TableRow>
                  ) : (
                    hallazgosData?.data?.map((item: HallazgoDetalle) => (
                      <TableRow key={item.inconsistencia_id} className={`${borderColor} ${hoverBg}`}>
                        <TableCell className="font-mono text-sm text-[#10B981] py-3">
                          {item.Numero_factura || "-"}
                        </TableCell>
                        <TableCell className={`text-sm ${textColor} max-w-[150px] py-3`} title={item.IPS || ""}>
                          {truncateText(item.IPS || "", 25)}
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-500 bg-amber-500/10">
                            {item.origen || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-sm ${textColor} max-w-[200px] py-3`} title={item.descripcion_servicio || ""}>
                          {truncateText(item.descripcion_servicio || "", 35)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-[#10B981] text-sm py-3">
                          {formatCurrencyStr(item.valor_total)}
                        </TableCell>
                        <TableCell className={`text-sm ${subTextColor} py-3`}>
                          {item.fecha || "-"}
                        </TableCell>
                        <TableCell className={`text-sm ${textColor} max-w-[200px] py-3`} title={item.observacion || ""}>
                          {truncateText(item.observacion || "", 35)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
