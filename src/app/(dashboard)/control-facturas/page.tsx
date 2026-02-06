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
  CheckCircle2,
  Eye,
  FileText,
  Download,
  Filter,
  AlertCircle,
  Loader2,
  FileWarning,
  DollarSign,
  FileCheck,
  BarChart3,
} from "lucide-react";
import { useAppContext } from "@/contexts/app-context";
import { exportToExcel } from "@/lib/excel-export";
import { FilterValues } from "@/contexts/app-context";
import { HallazgosModal } from "@/components/HallazgosModal";

interface RevisionFactura {
  numero_lote: number | null;
  Numero_factura: string | null;
  Primera_revision: string | null;
  segunda_revision: string | null;
  Total_reclamado_por_amparo_gastos_medicos_quirurgicos: number | string | null;
}

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

export default function ControlFacturasPage() {
  const { data: session } = useSession();
  const { filters, selectedIpsName, setSelectedIpsName, themeMode } = useAppContext();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [showHallazgosModal, setShowHallazgosModal] = useState(false);
  const [modalTipoEnvio, setModalTipoEnvio] = useState<"Primera vez" | "Revalidacion">("Primera vez");
  const [selectedFactura, setSelectedFactura] = useState<RevisionFactura | null>(null);

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

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  // Build query string from filters
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", limit.toString());
    if (filters.codigo_habilitacion) params.set("codigo_habilitacion", filters.codigo_habilitacion);
    if (filters.lote_de_carga) params.set("numero_lote", filters.lote_de_carga);
    if (filters.nombre_ips) params.set("nombre_ips", filters.nombre_ips);
    if (filters.fecha_inicio) params.set("fecha_inicio", filters.fecha_inicio);
    if (filters.fecha_fin) params.set("fecha_fin", filters.fecha_fin);
    if (filters.nombre_envio) params.set("nombre_envio", filters.nombre_envio);
    if (filters.tipo_envio) params.set("tipo_envio", filters.tipo_envio);
    if (search) params.set("search", search);
    return params.toString();
  }, [page, limit, filters, search]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["revision_facturas", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/revision-facturas?${queryString}`);
      if (!res.ok) throw new Error("Error al obtener datos");
      return res.json();
    },
  });


  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50000");
      params.set("page", "1");
      if (filters.codigo_habilitacion) params.set("codigo_habilitacion", filters.codigo_habilitacion);
      if (filters.lote_de_carga) params.set("numero_lote", filters.lote_de_carga);
      if (filters.nombre_ips) params.set("nombre_ips", filters.nombre_ips);
      if (filters.fecha_inicio) params.set("fecha_inicio", filters.fecha_inicio);
      if (filters.fecha_fin) params.set("fecha_fin", filters.fecha_fin);
      if (filters.nombre_envio) params.set("nombre_envio", filters.nombre_envio);
      if (filters.tipo_envio) params.set("tipo_envio", filters.tipo_envio);
      if (search) params.set("search", search);

      const res = await fetch(`/api/revision-facturas?${params.toString()}`);
      const json = await res.json();
      const allData = json.data || [];

      const headers = ["Número Lote", "Número Factura", "Valor Reclamado", "Primera Revisión", "Segunda Revisión"];
      const rows = allData.map((item: RevisionFactura) => [
        item.numero_lote || "",
        item.Numero_factura || "",
        item.Total_reclamado_por_amparo_gastos_medicos_quirurgicos
          ? new Intl.NumberFormat("es-CO", {
              style: "currency",
              currency: "COP",
              minimumFractionDigits: 0,
            }).format(Number(item.Total_reclamado_por_amparo_gastos_medicos_quirurgicos))
          : "",
        item.Primera_revision || "",
        item.segunda_revision || "",
      ]);

      exportToExcel({
        fileName: `Control_Facturas_${format(new Date(), "yyyy-MM-dd")}`,
        sheetName: "Control Facturas",
        headers,
        rows,
      });
    } catch (error) {
      console.error("Error exporting:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleVerHallazgos = (factura: RevisionFactura, tipoRevision: "primera" | "segunda") => {
    setSelectedFactura(factura);
    if (tipoRevision === "primera") {
      setModalTipoEnvio("Primera vez");
    } else {
      setModalTipoEnvio("Revalidacion");
    }
    setShowHallazgosModal(true);
  };

  const renderRevisionCell = (
    value: string | null,
    factura: RevisionFactura,
    tipoRevision: "primera" | "segunda"
  ) => {
    if (!value) return <span className={subTextColor}>-</span>;

    const okValues = ["Ok sin hallazgos", "Ok Sin hallazgos", "No requiere segunda revisión", "No fue reenviada"];
    if (okValues.some(v => value.toLowerCase() === v.toLowerCase())) {
      return (
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <span className={textColor}>{value}</span>
        </div>
      );
    }

    if (value.toLowerCase().includes("ver hallazgos")) {
      return (
        <button
          onClick={() => handleVerHallazgos(factura, tipoRevision)}
          className={`flex items-center gap-2 ${textColor} hover:text-[#4CAF50] transition-colors cursor-pointer`}
        >
          <Eye className="w-5 h-5" />
          <span className="underline">{value}</span>
        </button>
      );
    }

    return <span className={textColor}>{value}</span>;
  };

  return (
    <div className="min-h-screen p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-[1800px] mx-auto"
      >
        {/* Header */}
        <div className="mb-6">
          <h1 className={`text-3xl font-bold ${textColor} mb-2`}>
            Tablero de Control Facturas
          </h1>
          <p className={subTextColor}>
            Gestión y seguimiento de revisiones de facturas
          </p>
        </div>

        {/* Info Banner - Los filtros se aplican desde el Dashboard */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card className={`${isLight ? "bg-blue-50 border-blue-200" : "bg-blue-900/20 border-blue-800/30"} backdrop-blur-xl`}>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Filter className="w-5 h-5 text-blue-500" />
                <p className={`text-sm ${textColor}`}>
                  Los filtros se aplican desde la pestaña <strong className="text-blue-500">Dashboard</strong>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* KPI Summary Cards - Primera Revisión */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        >
          {/* Total Facturas */}
          <Card className={`${cardBg} backdrop-blur-xl`}>
            <CardContent className="py-4 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wider ${subTextColor}`}>Total Facturas</p>
                  <div className={`text-2xl font-bold mt-1 ${textColor}`}>
                    {isLoading ? <Skeleton className={`h-7 w-16 ${isLight ? "bg-gray-200" : "bg-[#1a1a2e]"}`} /> : (data?.summary?.total_facturas ?? 0).toLocaleString("es-CO")}
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${isLight ? "bg-blue-100" : "bg-blue-500/15"}`}>
                  <BarChart3 className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Facturas Con Hallazgos */}
          <Card className={`${cardBg} backdrop-blur-xl`}>
            <CardContent className="py-4 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wider ${subTextColor}`}>Con Hallazgos</p>
                  <div className={`text-2xl font-bold mt-1 text-amber-500`}>
                    {isLoading ? <Skeleton className={`h-7 w-16 ${isLight ? "bg-gray-200" : "bg-[#1a1a2e]"}`} /> : (data?.summary?.facturas_con_hallazgos ?? 0).toLocaleString("es-CO")}
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${isLight ? "bg-amber-100" : "bg-amber-500/15"}`}>
                  <FileWarning className="w-6 h-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Valor Facturas Con Hallazgos */}
          <Card className={`${cardBg} backdrop-blur-xl`}>
            <CardContent className="py-4 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wider ${subTextColor}`}>Valor Con Hallazgos</p>
                  <div className={`text-xl font-bold mt-1 text-red-500`}>
                    {isLoading ? (
                      <Skeleton className={`h-7 w-28 ${isLight ? "bg-gray-200" : "bg-[#1a1a2e]"}`} />
                    ) : (
                      new Intl.NumberFormat("es-CO", {
                        style: "currency",
                        currency: "COP",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(data?.summary?.valor_facturas_con_hallazgos ?? 0)
                    )}
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${isLight ? "bg-red-100" : "bg-red-500/15"}`}>
                  <DollarSign className="w-6 h-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Facturas Ok Sin Hallazgos */}
          <Card className={`${cardBg} backdrop-blur-xl`}>
            <CardContent className="py-4 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wider ${subTextColor}`}>Ok Sin Hallazgos</p>
                  <div className={`text-2xl font-bold mt-1 text-emerald-500`}>
                    {isLoading ? <Skeleton className={`h-7 w-16 ${isLight ? "bg-gray-200" : "bg-[#1a1a2e]"}`} /> : (data?.summary?.facturas_ok ?? 0).toLocaleString("es-CO")}
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${isLight ? "bg-emerald-100" : "bg-emerald-500/15"}`}>
                  <FileCheck className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Table Card */}
        <Card className={cardBg}>
          <CardContent className="p-6">
            {/* Table Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${subTextColor}`} />
                  <Input
                    placeholder="Buscar por número de factura o lote..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className={`pl-10 ${inputBg} ${inputText} border ${borderColor}`}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleExport}
                  disabled={isExporting || !data?.data?.length}
                  className="bg-[#4CAF50] hover:bg-[#45a049] text-white"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Exportar Excel
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className={headerBg}>
                    <TableHead className={textColor}>Número Lote</TableHead>
                    <TableHead className={textColor}>Número Factura</TableHead>
                    <TableHead className={textColor}>Valor Reclamado</TableHead>
                    <TableHead className={textColor}>Primera Revisión</TableHead>
                    <TableHead className={textColor}>Segunda Revisión</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading || isFetching ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className={`h-4 w-24 ${isLight ? "bg-gray-200" : "bg-[#1a1a2e]"}`} />
                        </TableCell>
                        <TableCell>
                          <Skeleton className={`h-4 w-32 ${isLight ? "bg-gray-200" : "bg-[#1a1a2e]"}`} />
                        </TableCell>
                        <TableCell>
                          <Skeleton className={`h-4 w-32 ${isLight ? "bg-gray-200" : "bg-[#1a1a2e]"}`} />
                        </TableCell>
                        <TableCell>
                          <Skeleton className={`h-4 w-40 ${isLight ? "bg-gray-200" : "bg-[#1a1a2e]"}`} />
                        </TableCell>
                        <TableCell>
                          <Skeleton className={`h-4 w-40 ${isLight ? "bg-gray-200" : "bg-[#1a1a2e]"}`} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : !data?.data?.length ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <AlertCircle className={`w-8 h-8 ${subTextColor}`} />
                          <p className={subTextColor}>No se encontraron registros</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.data.map((item: RevisionFactura, index: number) => (
                      <TableRow
                        key={`${item.numero_lote}-${item.Numero_factura}-${index}`}
                        className={hoverBg}
                      >
                        <TableCell className={textColor}>
                          {item.numero_lote || "-"}
                        </TableCell>
                        <TableCell className={textColor}>
                          {item.Numero_factura || "-"}
                        </TableCell>
                        <TableCell className={textColor}>
                          {item.Total_reclamado_por_amparo_gastos_medicos_quirurgicos
                            ? new Intl.NumberFormat("es-CO", {
                                style: "currency",
                                currency: "COP",
                                minimumFractionDigits: 0,
                              }).format(Number(item.Total_reclamado_por_amparo_gastos_medicos_quirurgicos))
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {renderRevisionCell(item.Primera_revision, item, "primera")}
                        </TableCell>
                        <TableCell>
                          {renderRevisionCell(item.segunda_revision, item, "segunda")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {data?.pagination && data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className={subTextColor}>
                  Mostrando {((page - 1) * limit) + 1} - {Math.min(page * limit, data.pagination.total)} de{" "}
                  {data.pagination.total} registros
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={borderColor}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className={textColor}>
                    Página {page} de {data.pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                    disabled={page >= data.pagination.totalPages}
                    className={borderColor}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Pagination Limit */}
            <div className="flex items-center gap-2 mt-4">
              <span className={subTextColor}>Registros por página:</span>
              <Select
                value={limit.toString()}
                onValueChange={(value) => {
                  setLimit(parseInt(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className={`w-24 ${inputBg} ${inputText} border ${borderColor}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Hallazgos Modal */}
      {showHallazgosModal && selectedFactura && (
        <HallazgosModal
          open={showHallazgosModal}
          onOpenChange={setShowHallazgosModal}
          filterType="tipo_validacion"
          filterValue=""
          filters={{
            ...filters,
            tipo_envio: modalTipoEnvio,
            lote_de_carga: selectedFactura.numero_lote?.toString() || "",
            numero_lote: selectedFactura.numero_lote?.toString() || "",
            numero_factura: selectedFactura.Numero_factura || "",
          }}
          themeMode={themeMode}
          tipoEnvioFilter={modalTipoEnvio}
        />
      )}
    </div>
  );
}
