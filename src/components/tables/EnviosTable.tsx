"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, 
  CheckCircle2, 
  FileArchive, 
  Calendar,
  Building2,
  Hash,
  DollarSign,
  FileText,
  Loader2,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { useAppContext } from "@/contexts/app-context";

interface Envio {
  id: number;
  codigoHabilitacion: string;
  nombreIps: string;
  nombreArchivo: string;
  cantidadFacturas: number;
  cantidadItems: number;
  valorTotal: number;
  rutaDrive: string | null;
  estado: "EN_PROCESO" | "FINALIZADO";
  fechaCarga: string;
  fechaProcesado: string | null;
  procesadoPor: string | null;
}

interface EnviosTableProps {
  envios: Envio[];
  isLoading: boolean;
  isAdmin: boolean;
  onStatusChange: (id: number, estado: "EN_PROCESO" | "FINALIZADO") => Promise<void>;
  onRefresh: () => void;
}

export default function EnviosTable({ 
  envios, 
  isLoading, 
  isAdmin, 
  onStatusChange,
  onRefresh 
}: EnviosTableProps) {
  const { themeMode } = useAppContext();
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const textColor = themeMode === "light" ? "text-gray-900" : "text-white";
  const subTextColor = themeMode === "light" ? "text-gray-600" : "text-gray-400";
  const rowBg = themeMode === "light" 
    ? "bg-white/60 hover:bg-white/80" 
    : "bg-gray-800/40 hover:bg-gray-800/60";
  const headerBg = themeMode === "light" 
    ? "bg-gray-100" 
    : "bg-gray-900/60";

  const handleStatusToggle = async (envio: Envio) => {
    if (!isAdmin || updatingId) return;
    
    setUpdatingId(envio.id);
    const newStatus = envio.estado === "EN_PROCESO" ? "FINALIZADO" : "EN_PROCESO";
    
    try {
      await onStatusChange(envio.id, newStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (envios.length === 0) {
    return (
      <div className="text-center py-20">
        <FileArchive className="w-16 h-16 text-gray-500 mx-auto mb-4" />
        <h3 className={`text-xl font-medium ${textColor}`}>
          No hay envíos registrados
        </h3>
        <p className={subTextColor}>
          Los envíos aparecerán aquí una vez sean cargados
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Botón de refrescar */}
      <div className="flex justify-end">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-lg text-cyan-300 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </motion.button>
      </div>

      {/* Tabla responsiva */}
      <div className="overflow-x-auto rounded-xl border border-gray-700/50">
        <table className="w-full">
          <thead className={headerBg}>
            <tr>
              <th className={`px-4 py-4 text-left ${textColor} font-semibold`}>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  Archivo
                </div>
              </th>
              <th className={`px-4 py-4 text-left ${textColor} font-semibold`}>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-400" />
                  IPS
                </div>
              </th>
              <th className={`px-4 py-4 text-center ${textColor} font-semibold`}>
                <div className="flex items-center justify-center gap-2">
                  <Hash className="w-4 h-4 text-green-400" />
                  Facturas
                </div>
              </th>
              <th className={`px-4 py-4 text-center ${textColor} font-semibold`}>
                <div className="flex items-center justify-center gap-2">
                  <Hash className="w-4 h-4 text-blue-400" />
                  Items
                </div>
              </th>
              <th className={`px-4 py-4 text-right ${textColor} font-semibold`}>
                <div className="flex items-center justify-end gap-2">
                  <DollarSign className="w-4 h-4 text-yellow-400" />
                  Valor
                </div>
              </th>
              <th className={`px-4 py-4 text-center ${textColor} font-semibold`}>
                <div className="flex items-center justify-center gap-2">
                  <Calendar className="w-4 h-4 text-pink-400" />
                  Fecha Carga
                </div>
              </th>
              <th className={`px-4 py-4 text-center ${textColor} font-semibold`}>
                Estado
              </th>
              {isAdmin && (
                <th className={`px-4 py-4 text-center ${textColor} font-semibold`}>
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/30">
            <AnimatePresence>
              {envios.map((envio, index) => (
                <motion.tr
                  key={envio.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                  className={`${rowBg} transition-colors`}
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-cyan-500/20 rounded-lg">
                        <FileArchive className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <p className={`font-medium ${textColor} text-sm truncate max-w-[200px]`}>
                          {envio.nombreArchivo}
                        </p>
                        <p className={`text-xs ${subTextColor}`}>
                          {envio.codigoHabilitacion}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className={`${textColor} text-sm truncate max-w-[180px]`}>
                      {envio.nombreIps}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-medium">
                      {envio.cantidadFacturas}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium">
                      {envio.cantidadItems}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={`font-medium ${textColor}`}>
                      {formatCurrency(envio.valorTotal)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`text-sm ${subTextColor}`}>
                      {formatDate(envio.fechaCarga)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`
                      inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
                      ${envio.estado === "FINALIZADO" 
                        ? "bg-green-500/20 text-green-300" 
                        : "bg-yellow-500/20 text-yellow-300"
                      }
                    `}>
                      {envio.estado === "FINALIZADO" ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Finalizado
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 animate-pulse" />
                          En Proceso
                        </>
                      )}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleStatusToggle(envio)}
                          disabled={updatingId === envio.id}
                          className={`
                            px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                            ${envio.estado === "EN_PROCESO"
                              ? "bg-green-500/20 hover:bg-green-500/30 text-green-300"
                              : "bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300"
                            }
                            ${updatingId === envio.id ? "opacity-50 cursor-not-allowed" : ""}
                          `}
                        >
                          {updatingId === envio.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : envio.estado === "EN_PROCESO" ? (
                            "Finalizar"
                          ) : (
                            "Reabrir"
                          )}
                        </motion.button>
                        {envio.rutaDrive && (
                          <a
                            href={envio.rutaDrive}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-blue-300 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  )}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <span className={`text-sm ${subTextColor}`}>En Proceso</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-400"></div>
          <span className={`text-sm ${subTextColor}`}>Finalizado</span>
        </div>
      </div>
    </div>
  );
}
