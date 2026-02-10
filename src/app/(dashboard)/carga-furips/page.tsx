"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { 
  Upload, 
  FileText, 
  FileArchive,
  Sparkles,
  Shield,
  AlertTriangle
} from "lucide-react";
import FuripsUploader from "@/components/upload/FuripsUploader";
import ZipUploader from "@/components/upload/ZipUploader";
import { useAppContext } from "@/contexts/app-context";

interface FilesContent {
  furips1: { name: string; content: string };
  furips2: { name: string; content: string };
  furtran: { name: string; content: string } | null;
}

interface FurtranData {
  cantidadRegistros: number;
  valorTotal: number;
}

interface FuripsData {
  idEnvio: string;
  codigoHabilitacion: string;
  nombreIps: string;
  cantidadFacturas: number;
  cantidadItems: number;
  valorTotal: number;
  furtran?: FurtranData | null;
  filesContent: FilesContent;
}

export default function CargaFuripsPage() {
  const { data: session } = useSession();
  const { themeMode } = useAppContext();
  const [furipsData, setFuripsData] = useState<FuripsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const userRole = (session?.user as any)?.role;
  const isAnalyst = userRole === "ANALYST";
  const isCoordinador = userRole === "COORDINADOR";
  const isRestricted = isAnalyst || isCoordinador;

  // Colores dinámicos según el tema
  const textColor = themeMode === "light" ? "text-gray-900" : "text-white";
  const subTextColor = themeMode === "light" ? "text-gray-600" : "text-gray-400";
  const cardBg = themeMode === "light" 
    ? "bg-white/80 border-gray-200" 
    : "bg-gray-900/50 border-gray-700/50";

  const handleValidationComplete = (data: FuripsData) => {
    setFuripsData(data);
    setError(null);
  };

  const handleUploadComplete = (result: any) => {
    setUploadComplete(true);
    setError(null);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleReset = () => {
    // Limpiar todo el estado completamente
    setFuripsData(null);
    setUploadComplete(false);
    setError(null);
    setIsUploading(false);
    // Limpiar también el estado del navegador si hay algo almacenado
    if (typeof window !== 'undefined') {
      // Forzar recarga para limpiar completamente todos los componentes
      window.location.reload();
    }
  };

  // Si es analista o coordinador, mostrar mensaje de solo lectura
  if (isRestricted) {
    return (
      <div className="min-h-screen p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`max-w-4xl mx-auto p-8 rounded-2xl border ${cardBg} backdrop-blur-xl`}
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-yellow-500/20 rounded-full">
              <Shield className="w-10 h-10 text-yellow-400" />
            </div>
            <div>
              <h1 className={`text-3xl font-bold ${textColor}`}>
                Acceso Restringido
              </h1>
              <p className={subTextColor}>
                {isCoordinador 
                  ? "Los coordinadores no pueden cargar archivos FURIPS"
                  : "Los analistas no pueden cargar archivos FURIPS"}
              </p>
            </div>
          </div>
          <p className={`${subTextColor} text-lg`}>
            Esta funcionalidad está disponible únicamente para usuarios IPS y administradores.
            Puede consultar los envíos existentes en la pestaña "Validación de Envíos".
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/25">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className={`text-3xl font-bold ${textColor}`}>
              Carga de Archivos FURIPS
            </h1>
            <p className={subTextColor}>
              Valide y envíe sus archivos de facturación
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

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Paso 1: Validación de archivos FURIPS - Ocupa 2 columnas */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className={`lg:col-span-2 p-6 rounded-2xl border ${cardBg} backdrop-blur-xl`}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-400 font-bold">
              1
            </div>
            <div>
              <h2 className={`text-xl font-bold ${textColor}`}>
                Validar Archivos FURIPS
              </h2>
              <p className={`text-sm ${subTextColor}`}>
                Cargue FURIPS1 (102 campos) y FURIPS2 (9 campos)
              </p>
            </div>
            <FileText className="w-6 h-6 text-cyan-400 ml-auto" />
          </div>

          <FuripsUploader
            onValidationComplete={handleValidationComplete}
            onError={handleError}
            onReset={handleReset}
            isUploading={isUploading}
          />
        </motion.div>

        {/* Paso 2: Carga de archivo ZIP - Ocupa 1 columna */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className={`p-6 rounded-2xl border ${cardBg} backdrop-blur-xl h-fit`}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className={`
              flex items-center justify-center w-10 h-10 rounded-full font-bold
              ${furipsData 
                ? "bg-purple-500/20 text-purple-400" 
                : "bg-gray-700/50 text-gray-500"
              }
            `}>
              2
            </div>
            <div>
              <h2 className={`text-lg font-bold ${furipsData ? textColor : "text-gray-500"}`}>
                Enviar ZIP
              </h2>
              <p className={`text-xs ${furipsData ? subTextColor : "text-gray-600"}`}>
                Soportes documentales
              </p>
            </div>
            <FileArchive className={`w-5 h-5 ml-auto ${furipsData ? "text-purple-400" : "text-gray-600"}`} />
          </div>

          <ZipUploader
            furipsData={furipsData}
            onUploadComplete={handleUploadComplete}
            onError={handleError}
            onUploadStateChange={setIsUploading}
          />
        </motion.div>
      </div>


      {/* Información adicional */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={`mt-8 p-6 rounded-2xl border ${cardBg} backdrop-blur-xl`}
      >
        <h3 className={`text-lg font-bold ${textColor} mb-4`}>
          Información Importante
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-cyan-500/10 rounded-xl">
            <h4 className={`${themeMode === "light" ? "text-cyan-700" : "text-cyan-300"} font-medium mb-2`}>FURIPS1</h4>
            <p className={`text-sm ${subTextColor}`}>
              Archivo de facturas con 102 campos. El campo 5 contiene el código de habilitación.
            </p>
          </div>
          <div className="p-4 bg-purple-500/10 rounded-xl">
            <h4 className={`${themeMode === "light" ? "text-purple-700" : "text-purple-300"} font-medium mb-2`}>FURIPS2</h4>
            <p className={`text-sm ${subTextColor}`}>
              Detalle de items con 9 campos. Contiene los servicios facturados.
            </p>
          </div>
          <div className="p-4 bg-amber-500/10 rounded-xl">
            <h4 className={`${themeMode === "light" ? "text-amber-700" : "text-amber-300"} font-medium mb-2`}>FURTRAN (Opcional)</h4>
            <p className={`text-sm ${subTextColor}`}>
              Archivo de transportes con 46 campos. El campo 45 contiene el valor.
            </p>
          </div>
          <div className="p-4 bg-green-500/10 rounded-xl">
            <h4 className={`${themeMode === "light" ? "text-green-700" : "text-green-300"} font-medium mb-2`}>Archivo ZIP</h4>
            <p className={`text-sm ${subTextColor}`}>
              Soportes documentales (historias clínicas, FURIPS, etc.)
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
