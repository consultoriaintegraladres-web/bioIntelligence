"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ClipboardCheck, 
  TrendingUp,
  FileArchive,
  DollarSign,
  Building2,
  AlertTriangle
} from "lucide-react";
import EnviosTable from "@/components/tables/EnviosTable";
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

async function fetchEnvios(): Promise<Envio[]> {
  const response = await fetch("/api/envios");
  if (!response.ok) {
    throw new Error("Error al cargar los envíos");
  }
  const data = await response.json();
  return data.data || [];
}

async function updateEnvioStatus(id: number, estado: string): Promise<void> {
  const response = await fetch(`/api/envios/${id}/estado`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ estado }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Error al actualizar el estado");
  }
}

export default function ValidacionEnviosPage() {
  const { data: session } = useSession();
  const { themeMode } = useAppContext();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === "ADMIN";

  const textColor = themeMode === "light" ? "text-gray-900" : "text-white";
  const subTextColor = themeMode === "light" ? "text-gray-600" : "text-gray-400";
  const cardBg = themeMode === "light" 
    ? "bg-white/80 border-gray-200" 
    : "bg-gray-900/50 border-gray-700/50";

  const { data: envios = [], isLoading, refetch } = useQuery({
    queryKey: ["envios"],
    queryFn: fetchEnvios,
  });

  const mutation = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) => 
      updateEnvioStatus(id, estado),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["envios"] });
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleStatusChange = useCallback(async (id: number, estado: "EN_PROCESO" | "FINALIZADO") => {
    await mutation.mutateAsync({ id, estado });
  }, [mutation]);

  // Calcular estadísticas
  const stats = {
    total: envios.length,
    enProceso: envios.filter(e => e.estado === "EN_PROCESO").length,
    finalizados: envios.filter(e => e.estado === "FINALIZADO").length,
    valorTotal: envios.reduce((sum, e) => sum + e.valorTotal, 0),
    totalFacturas: envios.reduce((sum, e) => sum + e.cantidadFacturas, 0),
    totalItems: envios.reduce((sum, e) => sum + e.cantidadItems, 0),
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg shadow-purple-500/25">
            <ClipboardCheck className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className={`text-3xl font-bold ${textColor}`}>
              Validación de Envíos
            </h1>
            <p className={subTextColor}>
              Seguimiento y estado de los envíos registrados
            </p>
          </div>
        </div>
      </motion.div>

      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3"
        >
          <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
          <p className="text-red-300">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`p-4 rounded-xl border ${cardBg} backdrop-blur-xl`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <FileArchive className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${textColor}`}>{stats.total}</p>
              <p className={`text-xs ${subTextColor}`}>Total Envíos</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={`p-4 rounded-xl border ${cardBg} backdrop-blur-xl`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold text-yellow-400`}>{stats.enProceso}</p>
              <p className={`text-xs ${subTextColor}`}>En Proceso</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`p-4 rounded-xl border ${cardBg} backdrop-blur-xl`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <ClipboardCheck className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold text-green-400`}>{stats.finalizados}</p>
              <p className={`text-xs ${subTextColor}`}>Finalizados</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className={`p-4 rounded-xl border ${cardBg} backdrop-blur-xl`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Building2 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${textColor}`}>{stats.totalFacturas}</p>
              <p className={`text-xs ${subTextColor}`}>Total Facturas</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`p-4 rounded-xl border ${cardBg} backdrop-blur-xl`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <FileArchive className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${textColor}`}>{stats.totalItems}</p>
              <p className={`text-xs ${subTextColor}`}>Total Items</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className={`p-4 rounded-xl border ${cardBg} backdrop-blur-xl`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className={`text-lg font-bold text-emerald-400 truncate`}>
                {formatCurrency(stats.valorTotal)}
              </p>
              <p className={`text-xs ${subTextColor}`}>Valor Total</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tabla de envíos */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className={`p-6 rounded-2xl border ${cardBg} backdrop-blur-xl`}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-bold ${textColor}`}>
            Listado de Envíos
          </h2>
          {isAdmin && (
            <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-sm">
              Modo Administrador
            </span>
          )}
        </div>

        <EnviosTable
          envios={envios}
          isLoading={isLoading}
          isAdmin={isAdmin}
          onStatusChange={handleStatusChange}
          onRefresh={() => refetch()}
        />
      </motion.div>

      {/* Información para admin */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl"
        >
          <p className="text-cyan-300 text-sm">
            <strong>Nota:</strong> Como administrador, puede cambiar el estado de los envíos 
            haciendo clic en el botón "Finalizar" o "Reabrir". Los usuarios IPS solo pueden 
            ver sus propios envíos.
          </p>
        </motion.div>
      )}
    </div>
  );
}
