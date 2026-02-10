"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";
import type { ThemeMode } from "@/contexts/app-context";

interface EnviosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: Record<string, string>;
  themeMode?: ThemeMode;
}

interface EnvioRow {
  numero_lote: number;
  nombre_envio: string;
  tipo_envio: string;
  fecha_creacion: string | null;
  nombre_ips: string;
  cantidad_facturas: number;
  valor_reclamado: number;
}

export function EnviosModal({ open, onOpenChange, filters, themeMode = "dark" }: EnviosModalProps) {
  const isLight = themeMode === "light";

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("tipo", "envios_detalle");
    if (filters.codigo_habilitacion) params.set("codigo_habilitacion", filters.codigo_habilitacion);
    if (filters.nombre_ips) params.set("nombre_ips", filters.nombre_ips);
    if (filters.fecha_inicio) params.set("fecha_inicio", filters.fecha_inicio);
    if (filters.fecha_fin) params.set("fecha_fin", filters.fecha_fin);
    if (filters.nombre_envio) params.set("nombre_envio", filters.nombre_envio);
    if (filters.tipo_envio) params.set("tipo_envio", filters.tipo_envio);
    return params.toString();
  }, [filters]);

  const { data: response, isLoading } = useQuery({
    queryKey: ["envios_detalle", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/reportes?${queryString}`);
      return res.json();
    },
    enabled: open,
  });

  const envios: EnvioRow[] = response?.data || [];

  const totals = useMemo(() => {
    return envios.reduce(
      (acc, e) => ({
        facturas: acc.facturas + e.cantidad_facturas,
        valor: acc.valor + e.valor_reclamado,
      }),
      { facturas: 0, valor: 0 }
    );
  }, [envios]);

  const formatCurrency = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v.toLocaleString()}`;
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return d;
    }
  };

  const bg = isLight ? "bg-white" : "bg-[#0a0a1a]";
  const headerBg = isLight ? "bg-gray-50" : "bg-[#111128]";
  const borderColor = isLight ? "border-gray-200" : "border-white/10";
  const textColor = isLight ? "text-gray-900" : "text-gray-100";
  const subText = isLight ? "text-gray-500" : "text-gray-400";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${bg} ${borderColor} border max-w-4xl w-[90vw]`}
        style={{ maxHeight: "80vh" }}
      >
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${textColor}`}>
            <Package className="w-5 h-5 text-purple-500" />
            Envios Realizados
            {!isLoading && (
              <span className={`text-sm font-normal ${subText} ml-2`}>
                ({envios.length} {envios.length === 1 ? "envio" : "envios"})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-auto" style={{ maxHeight: "calc(80vh - 100px)" }}>
          <Table>
            <TableHeader className={`sticky top-0 z-10 ${headerBg}`}>
              <TableRow className={borderColor}>
                <TableHead className={`${textColor} font-semibold`}>#</TableHead>
                <TableHead className={`${textColor} font-semibold`}>Nombre Envio</TableHead>
                <TableHead className={`${textColor} font-semibold`}>Tipo</TableHead>
                <TableHead className={`${textColor} font-semibold`}>Fecha</TableHead>
                <TableHead className={`${textColor} font-semibold`}>IPS</TableHead>
                <TableHead className={`${textColor} font-semibold text-right`}>Facturas</TableHead>
                <TableHead className={`${textColor} font-semibold text-right`}>Valor Reclamado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className={borderColor}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className={`h-5 w-full ${isLight ? "bg-gray-200" : "bg-[#1a1a2e]"}`} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : envios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className={`text-center py-8 ${subText}`}>
                    No hay envios para los filtros seleccionados
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {envios.map((envio, i) => (
                    <TableRow key={`${envio.numero_lote}-${i}`} className={`${borderColor} hover:${isLight ? "bg-gray-50" : "bg-white/5"}`}>
                      <TableCell className={subText}>{envio.numero_lote}</TableCell>
                      <TableCell className={`${textColor} font-medium`}>
                        {envio.nombre_envio.length > 40
                          ? envio.nombre_envio.substring(0, 38) + "..."
                          : envio.nombre_envio}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          envio.tipo_envio === "Primera vez"
                            ? "bg-green-500/15 text-green-500"
                            : envio.tipo_envio === "Revalidacion"
                            ? "bg-amber-500/15 text-amber-500"
                            : "bg-purple-500/15 text-purple-500"
                        }`}>
                          {envio.tipo_envio || "-"}
                        </span>
                      </TableCell>
                      <TableCell className={subText}>{formatDate(envio.fecha_creacion)}</TableCell>
                      <TableCell className={`${textColor} text-sm`}>
                        {envio.nombre_ips.length > 25
                          ? envio.nombre_ips.substring(0, 23) + "..."
                          : envio.nombre_ips}
                      </TableCell>
                      <TableCell className={`${textColor} text-right font-mono`}>
                        {envio.cantidad_facturas.toLocaleString()}
                      </TableCell>
                      <TableCell className={`${textColor} text-right font-mono font-semibold`}>
                        {formatCurrency(envio.valor_reclamado)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className={`${headerBg} ${borderColor} font-bold`}>
                    <TableCell colSpan={5} className={`${textColor} text-right font-semibold`}>
                      TOTAL
                    </TableCell>
                    <TableCell className={`${textColor} text-right font-mono font-bold`}>
                      {totals.facturas.toLocaleString()}
                    </TableCell>
                    <TableCell className={`text-right font-mono font-bold text-purple-500`}>
                      {formatCurrency(totals.valor)}
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
