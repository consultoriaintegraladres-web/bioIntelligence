"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Download, FileText, ArrowUpDown, ArrowUp, ArrowDown, Brain } from "lucide-react";
import { ThemeMode, FilterValues } from "@/contexts/app-context";
import { exportToExcel } from "@/lib/excel-export";
import { format } from "date-fns";
import { AISummaryModal } from "./AISummaryModal";

interface HallazgoDetalle {
  inconsistencia_id: number;
  Numero_factura: string | null;
  origen: string | null;
  tipo_validacion: string | null;
  observacion: string | null;
  descripcion_servicio: string | null;
  cantidad: number | null;
  valor_unitario: string | null;
  valor_total: string | null;
}

interface HallazgosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterType: "tipo_validacion" | "origen";
  filterValue: string;
  filters?: FilterValues;
  themeMode?: ThemeMode;
}

type SortField = "Numero_factura" | "origen" | "tipo_validacion" | "descripcion_servicio" | "valor_total" | "observacion" | "cantidad";
type SortDirection = "asc" | "desc" | null;

export function HallazgosModal({
  open,
  onOpenChange,
  filterType,
  filterValue,
  filters = {},
  themeMode = "dark",
}: HallazgosModalProps) {
  const isLight = themeMode === "light";
  const textColor = isLight ? "text-gray-900" : "text-white";
  const subTextColor = isLight ? "text-gray-600" : "text-gray-400";
  const headerBg = isLight ? "bg-gray-100" : "bg-[#1a1a2e]/50";
  const borderColor = isLight ? "border-gray-200" : "border-[#1e1e2e]";
  const hoverBg = isLight ? "hover:bg-gray-50" : "hover:bg-[#1a1a2e]/30";
  const skeletonBg = isLight ? "bg-gray-200" : "bg-[#1a1a2e]";

  const [modalSize, setModalSize] = useState({ width: 1024, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [modalSortField, setModalSortField] = useState<SortField | null>(null);
  const [modalSortDirection, setModalSortDirection] = useState<SortDirection>(null);
  const [showAISummary, setShowAISummary] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // Build query string for hallazgos modal
  const hallazgosQueryString = useMemo(() => {
    if (!filterValue) return "";
    const params = new URLSearchParams({ limit: "5000", page: "1" });
    params.set(filterType, filterValue);
    if (filters.codigo_habilitacion) params.set("codigo_habilitacion", filters.codigo_habilitacion);
    if (filters.lote_de_carga) params.set("lote_de_carga", filters.lote_de_carga);
    if (filters.fecha_inicio) params.set("fecha_inicio", filters.fecha_inicio);
    if (filters.fecha_fin) params.set("fecha_fin", filters.fecha_fin);
    if (filters.nombre_ips) params.set("nombre_ips", filters.nombre_ips);
    if (filters.nombre_envio) params.set("nombre_envio", filters.nombre_envio);
    if (filters.tipo_envio) params.set("tipo_envio", filters.tipo_envio);
    if (filters.origen && filterType !== "origen") params.set("origen", filters.origen);
    if (filters.tipo_validacion && filterType !== "tipo_validacion") params.set("tipo_validacion", filters.tipo_validacion);
    return params.toString();
  }, [filterValue, filterType, filters]);

  const { data: hallazgosData, isLoading: loadingHallazgos } = useQuery({
    queryKey: ["hallazgos_modal", hallazgosQueryString],
    queryFn: async () => {
      const res = await fetch(`/api/inconsistencias?${hallazgosQueryString}`);
      const json = await res.json();
      return json;
    },
    enabled: open && !!filterValue,
  });

  // Sort modal table data
  const sortedHallazgos = useMemo(() => {
    if (!hallazgosData?.data) return [];
    if (!modalSortField || !modalSortDirection) return hallazgosData.data;
    
    return [...hallazgosData.data].sort((a: HallazgoDetalle, b: HallazgoDetalle) => {
      let aVal: string | number = "";
      let bVal: string | number = "";
      
      if (modalSortField === "valor_total") {
        aVal = parseFloat(a.valor_total || "0");
        bVal = parseFloat(b.valor_total || "0");
      } else if (modalSortField === "cantidad") {
        aVal = a.cantidad || 0;
        bVal = b.cantidad || 0;
      } else {
        aVal = (a[modalSortField] || "").toString().toLowerCase();
        bVal = (b[modalSortField] || "").toString().toLowerCase();
      }
      
      if (aVal < bVal) return modalSortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return modalSortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [hallazgosData?.data, modalSortField, modalSortDirection]);

  const handleModalSort = (field: SortField) => {
    if (modalSortField === field) {
      if (modalSortDirection === "asc") {
        setModalSortDirection("desc");
      } else if (modalSortDirection === "desc") {
        setModalSortField(null);
        setModalSortDirection(null);
      } else {
        setModalSortDirection("asc");
      }
    } else {
      setModalSortField(field);
      setModalSortDirection("asc");
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    setModalSize((prev) => ({
      width: Math.max(600, Math.min(1920, prev.width + deltaX)),
      height: Math.max(400, Math.min(1080, prev.height + deltaY)),
    }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  const formatCurrencyStr = (value: string | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(parseFloat(value));
  };

  const handleExportHallazgos = () => {
    const dataToExport = sortedHallazgos.length > 0 ? sortedHallazgos : (hallazgosData?.data || []);
    if (dataToExport.length === 0) return;
    const headers = [
      "No. Factura", "Origen", "Tipo Validación", "Descripción Servicio",
      "Observación", "Cantidad", "Valor Unitario", "Valor Total",
    ];
    const rows = dataToExport.map((item: HallazgoDetalle) => [
      item.Numero_factura || "",
      item.origen || "",
      item.tipo_validacion || "",
      item.descripcion_servicio || "",
      item.observacion || "",
      item.cantidad || "",
      item.valor_unitario || "",
      item.valor_total || "",
    ]);
    const filterClean = filterValue.substring(0, 30).replace(/[^a-zA-Z0-9]/g, "_");
    exportToExcel({
      fileName: `hallazgos_${filterType}_${filterClean}_${format(new Date(), "yyyy-MM-dd")}`,
      sheetName: "Hallazgos",
      headers,
      rows,
    });
  };

  const handleExplainWithAI = async () => {
    const hallazgosToAnalyze = sortedHallazgos.length > 0 ? sortedHallazgos : (hallazgosData?.data || []);
    
    if (hallazgosToAnalyze.length === 0) {
      return;
    }

    setIsLoadingAI(true);
    setShowAISummary(true);
    setAiSummary(null);

    try {
      const response = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hallazgos: hallazgosToAnalyze,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(errorData.error || "Error al generar el resumen");
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setAiSummary(data.summary || "No se pudo generar el resumen");
    } catch (error: any) {
      console.error("Error al obtener resumen de IA:", error);
      const errorMessage = error.message || "Error al generar el resumen. Por favor, intente nuevamente.";
      
      // Mensaje más amigable si falta la API key
      if (errorMessage.includes("API key") || errorMessage.includes("no configurada")) {
        setAiSummary("⚠️ Error: La API key de Gemini no está configurada. Por favor, agregue GEMINI_API_KEY en el archivo .env.local");
      } else {
        setAiSummary(`❌ Error: ${errorMessage}`);
      }
    } finally {
      setIsLoadingAI(false);
    }
  };

  const ModalSortIcon = ({ field }: { field: SortField }) => {
    if (modalSortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
    if (modalSortDirection === "asc") return <ArrowUp className="w-3 h-3 ml-1 text-[#10B981]" />;
    return <ArrowDown className="w-3 h-3 ml-1 text-[#10B981]" />;
  };

  const truncateText = (text: string, maxLen: number = 60) => {
    if (!text) return "-";
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen - 3) + "...";
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`${isLight ? "bg-white border-gray-200" : "bg-[#12121a] border-[#1e1e2e]"} overflow-hidden p-0`}
        style={{ 
          width: `${modalSize.width}px`, 
          height: `${modalSize.height}px`,
          maxWidth: "95vw",
          maxHeight: "95vh",
        }}
      >
        {/* Resize handle */}
        <div
          className={`absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize ${isLight ? "bg-gray-200" : "bg-[#2a2a3e]"} border-t border-l ${borderColor} rounded-tl-lg`}
          onMouseDown={handleMouseDown}
          style={{ zIndex: 10 }}
        >
          <div className="w-full h-full flex items-center justify-center">
            <div className={`w-2 h-2 ${isLight ? "bg-gray-400" : "bg-gray-500"} rounded-full`} />
          </div>
        </div>

        <DialogHeader className="px-6 pt-6 pb-4 border-b border-[#1e1e2e]">
          <DialogTitle className={`flex items-center gap-2 text-lg ${textColor}`}>
            <FileText className="w-5 h-5 text-[#10B981]" />
            <span className="truncate">Hallazgos: {truncateText(filterValue, 60)}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex justify-between items-center px-6 py-3 border-b border-[#1e1e2e]">
          <p className={`text-sm ${subTextColor}`}>
            {(sortedHallazgos.length > 0 ? sortedHallazgos : hallazgosData?.data || []).length} registros encontrados
          </p>
          <div className="flex gap-2">
            <Button
              onClick={handleExplainWithAI}
              variant="outline"
              size="sm"
              disabled={!hallazgosData?.data?.length || isLoadingAI}
              className={`text-sm ${isLight ? "border-purple-300 text-purple-700 hover:bg-purple-100" : "border-purple-500/50 text-purple-400 hover:bg-purple-500/10"}`}
            >
              <Brain className="w-4 h-4 mr-2" />
              Explícamelo
            </Button>
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
        </div>

        <div className="overflow-auto flex-1 px-6 py-4" style={{ maxHeight: `${modalSize.height - 150}px` }}>
          {loadingHallazgos ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className={`h-12 w-full ${skeletonBg}`} />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow className={`${headerBg} ${borderColor}`}>
                  <TableHead 
                    className={`${textColor} font-semibold text-sm py-3 cursor-pointer select-none hover:bg-opacity-80 ${hoverBg}`}
                    onClick={() => handleModalSort("Numero_factura")}
                  >
                    <div className="flex items-center">
                      Factura
                      <ModalSortIcon field="Numero_factura" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className={`${textColor} font-semibold text-sm py-3 cursor-pointer select-none hover:bg-opacity-80 ${hoverBg}`}
                    onClick={() => handleModalSort("origen")}
                  >
                    <div className="flex items-center">
                      Origen
                      <ModalSortIcon field="origen" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className={`${textColor} font-semibold text-sm py-3 cursor-pointer select-none hover:bg-opacity-80 ${hoverBg}`}
                    onClick={() => handleModalSort("tipo_validacion")}
                  >
                    <div className="flex items-center">
                      Tipo Validación
                      <ModalSortIcon field="tipo_validacion" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className={`${textColor} font-semibold text-sm py-3 cursor-pointer select-none hover:bg-opacity-80 ${hoverBg}`}
                    onClick={() => handleModalSort("descripcion_servicio")}
                  >
                    <div className="flex items-center">
                      Descripción
                      <ModalSortIcon field="descripcion_servicio" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className={`${textColor} font-semibold text-sm text-right py-3 cursor-pointer select-none hover:bg-opacity-80 ${hoverBg}`}
                    onClick={() => handleModalSort("valor_total")}
                  >
                    <div className="flex items-center justify-end">
                      Valor Total
                      <ModalSortIcon field="valor_total" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className={`${textColor} font-semibold text-sm py-3 cursor-pointer select-none hover:bg-opacity-80 ${hoverBg}`}
                    onClick={() => handleModalSort("observacion")}
                  >
                    <div className="flex items-center">
                      Observación
                      <ModalSortIcon field="observacion" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const displayData = sortedHallazgos.length > 0 ? sortedHallazgos : (hallazgosData?.data || []);
                  if (displayData.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={6} className={`text-center py-8 ${subTextColor}`}>
                          No se encontraron hallazgos
                        </TableCell>
                      </TableRow>
                    );
                  }
                  return displayData.map((item: HallazgoDetalle) => (
                    <TableRow key={item.inconsistencia_id} className={`${borderColor} ${hoverBg}`}>
                      <TableCell className="font-mono text-sm text-[#10B981] py-3">
                        {item.Numero_factura || "-"}
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-500 bg-amber-500/10">
                          {item.origen || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-sm ${textColor} max-w-[200px] py-3`}>
                        <span className="whitespace-normal break-words block">{item.tipo_validacion || "-"}</span>
                      </TableCell>
                      <TableCell className={`text-sm ${textColor} max-w-[200px] py-3`}>
                        <span className="whitespace-normal break-words block">{item.descripcion_servicio || "-"}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-[#10B981] text-sm py-3">
                        {formatCurrencyStr(item.valor_total)}
                      </TableCell>
                      <TableCell className={`text-sm ${textColor} max-w-[200px] py-3`}>
                        <span className="whitespace-normal break-words block">{item.observacion || "-"}</span>
                      </TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* AI Summary Modal */}
    <AISummaryModal
      open={showAISummary}
      onOpenChange={setShowAISummary}
      summary={aiSummary}
      isLoading={isLoadingAI}
      totalHallazgos={(sortedHallazgos.length > 0 ? sortedHallazgos : hallazgosData?.data || []).length}
      resumidos={Math.min(10, (sortedHallazgos.length > 0 ? sortedHallazgos : hallazgosData?.data || []).length)}
      themeMode={themeMode}
    />
    </>
  );
}
