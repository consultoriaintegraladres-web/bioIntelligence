"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Download,
  Filter,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useAppContext } from "@/contexts/app-context";
import { exportToExcel } from "@/lib/excel-export";

interface Inconsistencia {
  inconsistencia_id: number;
  Numero_factura: string | null;
  Codigo_habilitacion_prestador_servicios_salud: string;
  IPS: string | null;
  origen: string | null;
  tipo_validacion: string | null;
  observacion: string | null;
  tipo_servicio: string | null;
  codigo_del_servicio: string | null;
  descripcion_servicio: string | null;
  cantidad: number | null;
  valor_unitario: string | null;
  valor_total: string | null;
  fecha: string | null;
  lote_de_carga: string | null;
  id_factura_furips1: string | null;
  usuario: string | null;
}

// Truncate text to max 60 chars
const truncateText = (text: string | null, maxLen: number = 60) => {
  if (!text) return "-";
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 3) + "...";
};

export default function DetallePage() {
  const { data: session } = useSession();
  const { filters, selectedIpsName, setSelectedIpsName, themeMode } = useAppContext();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<Inconsistencia | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const isLight = themeMode === "light";
  const textColor = isLight ? "text-gray-900" : "text-white";
  const subTextColor = isLight ? "text-gray-600" : "text-gray-400";
  const cardBg = isLight ? "bg-white border-gray-200" : "bg-[#12121a]/80 border-[#1e1e2e]";
  const inputBg = isLight ? "bg-white border-gray-300" : "bg-[#1a1a2e] border-[#2a2a3e]";
  const inputText = isLight ? "text-gray-900" : "text-white";
  const headerBg = isLight ? "bg-gray-100" : "bg-[#1a1a2e]/50";
  const hoverBg = isLight ? "hover:bg-gray-50" : "hover:bg-[#1a1a2e]/30";
  const borderColor = isLight ? "border-gray-200" : "border-[#1e1e2e]";

  useEffect(() => {
    if (session?.user?.role === "USER" && session?.user?.name) {
      setSelectedIpsName(session.user.name);
    }
  }, [session, setSelectedIpsName]);

  useEffect(() => {
    setPage(1);
  }, [filters, limit]);

  // Build query string using ALL shared filters from context
  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) params.set("search", search);
    if (filters.tipo_validacion) params.set("tipo_validacion", filters.tipo_validacion);
    if (filters.origen) params.set("origen", filters.origen);
    if (filters.codigo_habilitacion) params.set("codigo_habilitacion", filters.codigo_habilitacion);
    if (filters.lote_de_carga) params.set("lote_de_carga", filters.lote_de_carga);
    if (filters.fecha_inicio) params.set("fecha_inicio", filters.fecha_inicio);
    if (filters.fecha_fin) params.set("fecha_fin", filters.fecha_fin);
    if (filters.nombre_ips) params.set("nombre_ips", filters.nombre_ips);
    if (filters.nombre_envio) params.set("nombre_envio", filters.nombre_envio);
    if (filters.tipo_envio) params.set("tipo_envio", filters.tipo_envio);
    return params.toString();
  }, [page, limit, search, filters]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["inconsistencias_detalle", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/inconsistencias?${queryString}`);
      const json = await res.json();
      return json;
    },
  });

  const formatCurrency = (value: string | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(parseFloat(value));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "dd MMM yyyy", { locale: es });
    } catch {
      return dateString;
    }
  };

  const formatFactura = (factura: string | null) => {
    if (!factura) return "-";
    return factura.length > 12 ? factura.substring(0, 12) : factura;
  };

  // Export ALL records to Excel (not just current page)
  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Fetch ALL records with a high limit
      const exportParams = new URLSearchParams();
      exportParams.set("page", "1");
      exportParams.set("limit", "50000");
      if (search) exportParams.set("search", search);
      if (filters.tipo_validacion) exportParams.set("tipo_validacion", filters.tipo_validacion);
      if (filters.origen) exportParams.set("origen", filters.origen);
      if (filters.codigo_habilitacion) exportParams.set("codigo_habilitacion", filters.codigo_habilitacion);
      if (filters.lote_de_carga) exportParams.set("lote_de_carga", filters.lote_de_carga);
      if (filters.fecha_inicio) exportParams.set("fecha_inicio", filters.fecha_inicio);
      if (filters.fecha_fin) exportParams.set("fecha_fin", filters.fecha_fin);
      if (filters.nombre_ips) exportParams.set("nombre_ips", filters.nombre_ips);
      if (filters.nombre_envio) exportParams.set("nombre_envio", filters.nombre_envio);
      if (filters.tipo_envio) exportParams.set("tipo_envio", filters.tipo_envio);

      const res = await fetch(`/api/inconsistencias?${exportParams.toString()}`);
      const json = await res.json();

      if (!json?.data || json.data.length === 0) return;

      const headers = [
        "No. Factura",
        "IPS",
        "Origen",
        "Tipo Validación",
        "Tipo Servicio",
        "Código Servicio",
        "Descripción Servicio",
        "Cantidad",
        "Valor Unitario",
        "Valor Total",
        "Fecha",
        "Lote",
        "Observación",
      ];

      const rows = json.data.map((item: Inconsistencia) => [
        item.Numero_factura || "",
        item.IPS || "",
        item.origen || "",
        item.tipo_validacion || "",
        item.tipo_servicio || "",
        item.codigo_del_servicio || "",
        item.descripcion_servicio || "",
        item.cantidad || "",
        item.valor_unitario || "",
        item.valor_total || "",
        item.fecha || "",
        item.lote_de_carga || "",
        item.observacion || "",
      ]);

      exportToExcel({
        fileName: `hallazgos_detalle_${format(new Date(), "yyyy-MM-dd")}`,
        sheetName: "Detalle Hallazgos",
        headers,
        rows,
      });
    } catch (error) {
      console.error("Error exporting:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const activeFiltersCount = [
    filters.lote_de_carga,
    filters.tipo_validacion,
    filters.origen,
    filters.codigo_habilitacion,
    filters.nombre_ips,
    filters.fecha_inicio,
    filters.fecha_fin,
    filters.nombre_envio,
  ].filter(Boolean).length;

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
            Detalle Hallazgos
          </h1>
          <p className={`${subTextColor} mt-1 text-base`}>
            Listado completo de hallazgos detectados
          </p>
        </div>
        <Button
          onClick={handleExport}
          variant="outline"
          className={`text-base ${isLight ? "border-gray-300 text-gray-700 hover:bg-gray-100" : "border-[#9333EA]/50 text-[#10B981] hover:bg-[#9333EA]/10"}`}
          disabled={!data?.data?.length || isExporting}
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          {isExporting ? "Exportando..." : "Exportar Excel"}
        </Button>
      </motion.div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className={`${isLight ? "bg-[#9333EA]/5 border-[#9333EA]/20" : "bg-[#9333EA]/10 border-[#9333EA]/20"} backdrop-blur-xl`}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Filter className="w-5 h-5 text-[#9333EA]" />
                <p className={`text-base ${textColor}`}>
                  Los filtros se aplican desde la pestaña <strong className="text-[#10B981]">Dashboard</strong>
                  {activeFiltersCount > 0 && (
                    <span className={`ml-2 ${subTextColor}`}>
                      ({activeFiltersCount} filtro{activeFiltersCount > 1 ? "s" : ""} activo{activeFiltersCount > 1 ? "s" : ""})
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-base">
                {filters.fecha_inicio && filters.fecha_fin && (
                  <Badge variant="outline" className="border-blue-500/50 text-blue-500 text-sm">
                    {filters.fecha_inicio} - {filters.fecha_fin}
                  </Badge>
                )}
                {filters.lote_de_carga && (
                  <Badge variant="outline" className="border-[#10B981]/50 text-[#10B981] text-sm">
                    Lote: {filters.lote_de_carga}
                  </Badge>
                )}
                {filters.nombre_envio && (
                  <Badge variant="outline" className="border-cyan-500/50 text-cyan-500 text-sm">
                    Envío: {truncateText(filters.nombre_envio, 20)}
                  </Badge>
                )}
                <span className={`${subTextColor} text-sm`}>
                  {data?.pagination?.total?.toLocaleString() || 0} registros
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search + Page size */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card className={`${cardBg} backdrop-blur-xl`}>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input
                  placeholder="Buscar por factura, origen, tipo validación, descripción servicio..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className={`pl-11 ${inputBg} ${inputText} placeholder:text-gray-500 text-base h-12`}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${subTextColor} whitespace-nowrap`}>Registros:</span>
                <Select
                  value={limit.toString()}
                  onValueChange={(val) => setLimit(parseInt(val, 10))}
                >
                  <SelectTrigger className={`w-[80px] ${inputBg} ${inputText} h-12`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={isLight ? "bg-white border-gray-200" : "bg-[#1a1a2e] border-[#2a2a3e]"}>
                    <SelectItem value="10" className={`${textColor}`}>10</SelectItem>
                    <SelectItem value="20" className={`${textColor}`}>20</SelectItem>
                    <SelectItem value="50" className={`${textColor}`}>50</SelectItem>
                    <SelectItem value="100" className={`${textColor}`}>100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Data Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className={`${cardBg} backdrop-blur-xl overflow-hidden`}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className={`${headerBg} ${borderColor}`}>
                  <TableHead className={`${textColor} font-semibold text-base w-[130px] py-4`}>Factura</TableHead>
                  <TableHead className={`${textColor} font-semibold text-base py-4`}>IPS</TableHead>
                  <TableHead className={`${textColor} font-semibold text-base py-4`}>Tipo Validación</TableHead>
                  <TableHead className={`${textColor} font-semibold text-base py-4`}>Origen</TableHead>
                  <TableHead className={`${textColor} font-semibold text-base text-right py-4`}>Valor Total</TableHead>
                  <TableHead className={`${textColor} font-semibold text-base py-4`}>Fecha</TableHead>
                  <TableHead className={`${textColor} font-semibold text-base w-[90px] py-4`}>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j} className="py-4">
                          <Skeleton className={`h-5 w-full ${isLight ? "bg-gray-200" : "bg-[#1a1a2e]"}`} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : data?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className={`w-12 h-12 ${subTextColor}`} />
                        <p className={`${subTextColor} text-lg`}>No se encontraron registros</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.data?.map((item: Inconsistencia, index: number) => (
                    <motion.tr
                      key={item.inconsistencia_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className={`${borderColor} ${hoverBg} transition-colors`}
                    >
                      <TableCell className="font-mono text-base text-[#10B981] max-w-[130px] py-4">
                        {formatFactura(item.Numero_factura)}
                      </TableCell>
                      <TableCell className={`max-w-[220px] py-4 ${textColor}`} title={item.IPS || ""}>
                        <span className="text-base">{truncateText(item.IPS, 35)}</span>
                      </TableCell>
                      <TableCell className="max-w-[220px] py-4">
                        <Badge
                          variant="outline"
                          className="text-sm border-[#9333EA]/50 text-[#9333EA] bg-[#9333EA]/10"
                          title={item.tipo_validacion || ""}
                        >
                          {truncateText(item.tipo_validacion, 35)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge
                          variant="outline"
                          className="text-sm border-amber-500/50 text-amber-500 bg-amber-500/10"
                        >
                          {item.origen || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-[#10B981] text-base py-4">
                        {formatCurrency(item.valor_total)}
                      </TableCell>
                      <TableCell className={`${subTextColor} text-base py-4`}>
                        {formatDate(item.fecha)}
                      </TableCell>
                      <TableCell className="py-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedItem(item)}
                          className={`${isLight ? "hover:bg-gray-100" : "hover:bg-[#9333EA]/10"} hover:text-[#10B981]`}
                        >
                          <Eye className="w-5 h-5" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className={`flex items-center justify-between px-6 py-4 border-t ${borderColor}`}>
            <p className={`text-base ${subTextColor}`}>
              Mostrando {data?.data?.length || 0} de {data?.pagination?.total?.toLocaleString() || 0} registros
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isFetching}
                className={`${isLight ? "border-gray-300 text-gray-700" : "border-[#2a2a3e] text-gray-400"}`}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className={`text-base ${subTextColor} px-3`}>
                Página {page} de {data?.pagination?.totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= (data?.pagination?.totalPages || 1) || isFetching}
                className={`${isLight ? "border-gray-300 text-gray-700" : "border-[#2a2a3e] text-gray-400"}`}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Detail Modal */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className={`${isLight ? "bg-white border-gray-200" : "bg-[#12121a] border-[#1e1e2e]"} max-w-3xl max-h-[85vh] overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 text-xl ${textColor}`}>
              <FileText className="w-6 h-6 text-[#10B981]" />
              Detalle de Hallazgo
            </DialogTitle>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className={`text-sm ${subTextColor} uppercase tracking-wider`}>Factura</p>
                  <p className="font-mono text-[#10B981] text-lg">{formatFactura(selectedItem.Numero_factura)}</p>
                </div>
                <div className="space-y-1">
                  <p className={`text-sm ${subTextColor} uppercase tracking-wider`}>IPS</p>
                  <p className={`${textColor} text-base`}>{truncateText(selectedItem.IPS, 40)}</p>
                </div>
                <div className="space-y-1">
                  <p className={`text-sm ${subTextColor} uppercase tracking-wider`}>Código Habilitación</p>
                  <p className={`font-mono ${subTextColor} text-base`}>
                    {selectedItem.Codigo_habilitacion_prestador_servicios_salud}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className={`text-sm ${subTextColor} uppercase tracking-wider`}>Origen</p>
                  <Badge variant="outline" className="border-amber-500/50 text-amber-500 bg-amber-500/10">
                    {selectedItem.origen || "-"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className={`text-sm ${subTextColor} uppercase tracking-wider`}>Fecha</p>
                  <p className={`${textColor} text-base`}>{formatDate(selectedItem.fecha)}</p>
                </div>
                <div className="space-y-1">
                  <p className={`text-sm ${subTextColor} uppercase tracking-wider`}>Lote</p>
                  <p className={`${subTextColor} text-base`}>{selectedItem.lote_de_carga || "-"}</p>
                </div>
              </div>

              <div className={`space-y-2 p-4 ${isLight ? "bg-gray-100" : "bg-[#1a1a2e]"} rounded-xl`}>
                <p className={`text-sm ${subTextColor} uppercase tracking-wider`}>Tipo de Validación</p>
                <p className={`${textColor} text-base leading-relaxed`}>{selectedItem.tipo_validacion || "-"}</p>
              </div>

              <div className={`grid grid-cols-3 gap-4 p-4 ${isLight ? "bg-gray-50" : "bg-gradient-to-r from-[#9333EA]/5 to-[#10B981]/5"} rounded-xl border ${isLight ? "border-gray-200" : "border-[#9333EA]/20"}`}>
                <div className="text-center">
                  <p className={`text-sm ${subTextColor} uppercase tracking-wider`}>Cantidad</p>
                  <p className={`text-2xl font-bold ${textColor} mt-1`}>
                    {selectedItem.cantidad?.toLocaleString() || "-"}
                  </p>
                </div>
                <div className="text-center">
                  <p className={`text-sm ${subTextColor} uppercase tracking-wider`}>Valor Unitario</p>
                  <p className="text-xl font-mono text-[#10B981] mt-1">
                    {formatCurrency(selectedItem.valor_unitario)}
                  </p>
                </div>
                <div className="text-center">
                  <p className={`text-sm ${subTextColor} uppercase tracking-wider`}>Valor Total</p>
                  <p className="text-2xl font-bold font-mono text-[#10B981] mt-1">
                    {formatCurrency(selectedItem.valor_total)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className={`text-sm ${subTextColor} uppercase tracking-wider`}>Observación</p>
                <p className={`text-base ${textColor} p-4 ${isLight ? "bg-gray-100" : "bg-[#1a1a2e]"} rounded-lg border ${isLight ? "border-gray-200" : "border-[#2a2a3e]"} leading-relaxed`}>
                  {selectedItem.observacion || "Sin observación"}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
