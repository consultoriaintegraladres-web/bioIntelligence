"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, 
  FileArchive, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Cloud,
  FolderOpen,
  Sparkles,
  FileText
} from "lucide-react";
import { useAppContext } from "@/contexts/app-context";
import ProgressBar from "./ProgressBar";

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

interface ZipUploaderProps {
  furipsData: FuripsData | null;
  onUploadComplete: (result: any) => void;
  onError: (error: string) => void;
  onUploadStateChange?: (isUploading: boolean) => void;
}

export default function ZipUploader({ furipsData, onUploadComplete, onError, onUploadStateChange }: ZipUploaderProps) {
  const { themeMode } = useAppContext();
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  
  // Estados para barra de progreso
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Limpiar estado cuando furipsData se resetea
  useEffect(() => {
    if (!furipsData) {
      setZipFile(null);
      setUploadResult(null);
      setUploadError(null);
      setUploadProgress(0);
      setUploadStage("");
      setUploadMessage("");
    }
  }, [furipsData]);

  // Prevenir desmontaje durante carga
  useEffect(() => {
    if (isUploading) {
      // Prevenir navegación durante carga
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = "¿Está seguro de que desea salir? La carga está en progreso.";
        return e.returnValue;
      };
      
      window.addEventListener("beforeunload", handleBeforeUnload);
      
      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    }
  }, [isUploading]);

  // Colores dinámicos según el tema
  const isLight = themeMode === "light";
  const textColor = isLight ? "text-gray-900" : "text-white";
  const subTextColor = isLight ? "text-gray-600" : "text-gray-400";
  const borderColor = isLight ? "border-gray-300" : "border-gray-600";
  const bgUpload = isLight ? "bg-gray-100" : "bg-gray-800/50";
  const bgUploadHover = isLight ? "hover:bg-gray-200" : "hover:bg-gray-700/50";

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar estrictamente que sea .ZIP
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith(".zip")) {
        onError("El archivo debe ser de formato .ZIP. Por favor seleccione un archivo ZIP válido.");
        event.target.value = ""; // Limpiar el input
        return;
      }
      
      // Informar sobre archivos grandes
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 500) {
        console.log(`⚠️ Archivo grande detectado: ${fileSizeMB.toFixed(2)} MB. El proceso puede tardar varios minutos.`);
      }
      
      setZipFile(file);
      setUploadResult(null);
    }
  }, [onError]);

  const handleUpload = async () => {
    if (!zipFile || !furipsData) {
      onError("Debe seleccionar el archivo ZIP y validar los archivos FURIPS primero");
      return;
    }

    setIsUploading(true);
    setUploadResult(null);
    setUploadError(null);
    setUploadProgress(0);
    setUploadStage("Iniciando...");
    setUploadMessage("Preparando archivos para subir");

    try {
      const fileSizeMB = zipFile.size / (1024 * 1024);
      console.log(`🚀 Iniciando carga de archivo: ${zipFile.name} (${fileSizeMB.toFixed(2)} MB)`);
      
      // Validar tamaño del archivo
      if (fileSizeMB > 5000) { // Más de 5GB
        throw new Error("El archivo es demasiado grande (máximo 5GB).");
      }

      // ====== SUBIDA EN CHUNKS ======
      // Dividir archivo en chunks de 5MB para evitar límite de body size
      const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB por chunk
      const totalChunks = Math.ceil(zipFile.size / CHUNK_SIZE);
      const uploadId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;

      console.log(`📦 Dividiendo archivo en ${totalChunks} chunks de 5MB...`);

      // ====== PASO 1: Subir chunks ======
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, zipFile.size);
        const chunk = zipFile.slice(start, end);

        // Calcular progreso (0-70% para chunks)
        const chunkProgress = ((chunkIndex + 1) / totalChunks) * 70;
        setUploadProgress(Math.round(chunkProgress));
        setUploadStage(`Subiendo archivo`);
        setUploadMessage(`Subiendo a servidores de seguridad Bio - Chunk ${chunkIndex + 1}/${totalChunks} - ${((chunkIndex + 1) / totalChunks * 100).toFixed(0)}% (${(end / (1024 * 1024)).toFixed(1)} / ${fileSizeMB.toFixed(1)} MB)`);

        const formData = new FormData();
        formData.append("chunk", chunk);
        formData.append("chunkIndex", chunkIndex.toString());
        formData.append("totalChunks", totalChunks.toString());
        formData.append("fileName", zipFile.name);
        formData.append("uploadId", uploadId);

        const chunkResponse = await fetch("/api/upload-chunk", {
          method: "POST",
          body: formData,
        });

        if (!chunkResponse.ok) {
          const error = await chunkResponse.json();
          throw new Error(error.error || `Error al subir chunk ${chunkIndex + 1}`);
        }

        console.log(`✅ Chunk ${chunkIndex + 1}/${totalChunks} subido`);
      }

      // ====== PASO 2: Completar el proceso ======
      setUploadProgress(75);
      setUploadStage("Procesando archivos");
      setUploadMessage("Ensamblando archivo y subiendo a servidores de seguridad Bio...");

      console.log("📊 Completando upload y procesando datos...");
      
      const completeResponse = await fetch("/api/complete-chunked-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId,
          fileName: zipFile.name,
          totalChunks,
          idEnvio: furipsData.idEnvio,
          codigoHabilitacion: furipsData.codigoHabilitacion,
          nombreIps: furipsData.nombreIps,
          cantidadFacturas: furipsData.cantidadFacturas,
          cantidadItems: furipsData.cantidadItems,
          valorTotal: furipsData.valorTotal,
          furtranCantidad: furipsData.furtran?.cantidadRegistros || 0,
          furtranValor: furipsData.furtran?.valorTotal || 0,
          // Contenido de archivos FURIPS (son pequeños)
          furips1Content: furipsData.filesContent?.furips1?.content,
          furips1Name: furipsData.filesContent?.furips1?.name,
          furips2Content: furipsData.filesContent?.furips2?.content,
          furips2Name: furipsData.filesContent?.furips2?.name,
          furtranContent: furipsData.filesContent?.furtran?.content,
          furtranName: furipsData.filesContent?.furtran?.name,
        }),
      });

      const result = await completeResponse.json();

      if (!completeResponse.ok) {
        throw new Error(result.error || "Error al completar el proceso");
      }

      // ====== ÉXITO ======
      setUploadProgress(100);
      setUploadStage("¡Completado!");
      setUploadMessage(result.data?.dataInsertSuccess 
        ? `Insertados: ${result.data.processResult?.recordsProcessed?.furips1 || 0} FURIPS1, ${result.data.processResult?.recordsProcessed?.furips2 || 0} FURIPS2` 
        : "Archivos subidos (revise advertencias)"
      );

      console.log("✅ Proceso completado exitosamente");
      setUploadResult(result);
      onUploadComplete(result);

    } catch (error: any) {
      console.error("❌ Error durante la carga:", error);
      
      const errorMessage = error?.message || "Error desconocido durante la carga";
      
      setUploadProgress(0);
      setUploadStage("Error");
      setUploadMessage(errorMessage);
      setUploadError(errorMessage);
      
      onError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const isDisabled = !furipsData || !zipFile || isUploading;
  
  // Notificar al componente padre sobre el estado de carga
  useEffect(() => {
    onUploadStateChange?.(isUploading);
  }, [isUploading, onUploadStateChange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-4">
      {/* Mensaje si no hay datos FURIPS */}
      {!furipsData && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-center">
          <p className={`text-sm ${isLight ? "text-yellow-700" : "text-yellow-300"}`}>
            Primero valide los archivos FURIPS
          </p>
        </div>
      )}

      {/* Info del envío si está validado */}
      {furipsData && (
        <div className={`p-3 rounded-xl border ${isLight ? "bg-cyan-50 border-cyan-200" : "bg-cyan-500/10 border-cyan-500/30"}`}>
          <p className={`text-xs ${isLight ? "text-cyan-700" : "text-cyan-300"} font-medium`}>
            Envío: {furipsData.idEnvio}
          </p>
          <p className={`text-xs ${subTextColor}`}>
            {furipsData.nombreIps}
          </p>
        </div>
      )}

      {/* Input de archivo ZIP */}
      <div className="relative">
        <label
          htmlFor="zip-input"
          className={`
            flex flex-col items-center justify-center w-full h-28 
            border-2 border-dashed rounded-xl cursor-pointer
            transition-all duration-300
            ${!furipsData || isUploading ? "opacity-50 cursor-not-allowed" : ""}
            ${zipFile 
              ? "border-purple-500/50 bg-purple-500/10" 
              : `${borderColor} ${bgUpload} ${!isUploading ? bgUploadHover : ""} ${!isUploading ? "hover:border-purple-400" : ""}`
            }
          `}
        >
          <div className="flex flex-col items-center justify-center py-3">
            {zipFile ? (
              <>
                <FileArchive className="w-7 h-7 mb-1 text-purple-400" />
                <p className="text-xs text-purple-300 font-medium truncate max-w-full px-2">{zipFile.name}</p>
                <p className={`text-xs ${subTextColor}`}>
                  {(zipFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </>
            ) : (
              <>
                <Upload className={`w-7 h-7 mb-1 ${subTextColor}`} />
                <p className={`text-xs ${textColor} font-semibold`}>
                  Archivo ZIP
                </p>
              </>
            )}
          </div>
          <input
            id="zip-input"
            type="file"
            className="hidden"
            accept=".zip,.ZIP"
            onChange={handleFileChange}
            disabled={!furipsData || isUploading}
          />
        </label>
        {zipFile && !isUploading && (
          <button
            onClick={() => {
              setZipFile(null);
              setUploadResult(null);
            }}
            className="absolute top-2 right-2 p-1 rounded-full bg-red-500/20 hover:bg-red-500/40 transition-colors"
          >
            <XCircle className="w-4 h-4 text-red-400" />
          </button>
        )}
      </div>

      {/* Archivos que se subirán */}
      {furipsData && zipFile && (
        <div className={`p-3 rounded-xl border ${isLight ? "bg-gray-50 border-gray-200" : "bg-gray-800/30 border-gray-700/50"}`}>
          <p className={`text-xs font-medium ${textColor} mb-2`}>Archivos a subir:</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <FileText className="w-3 h-3 text-cyan-400" />
              <span className={subTextColor}>{furipsData.filesContent?.furips1?.name}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <FileText className="w-3 h-3 text-purple-400" />
              <span className={subTextColor}>{furipsData.filesContent?.furips2?.name}</span>
            </div>
            {furipsData.filesContent?.furtran && (
              <div className="flex items-center gap-2 text-xs">
                <FileText className="w-3 h-3 text-amber-400" />
                <span className={subTextColor}>{furipsData.filesContent.furtran.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs">
              <FileArchive className="w-3 h-3 text-green-400" />
              <span className={subTextColor}>{zipFile.name}</span>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Progreso - Siempre visible durante carga */}
      {(isUploading || uploadError) && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative z-50"
          >
            <ProgressBar
              currentStep={{
                stage: uploadError ? "Error" : uploadStage,
                message: uploadError || uploadMessage,
                progress: uploadError ? 0 : uploadProgress,
              }}
              isComplete={uploadProgress === 100 && !uploadError}
            />
            {uploadError && (
              <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">{uploadError}</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Botón de carga */}
      <motion.button
        whileHover={{ scale: isDisabled ? 1 : 1.02 }}
        whileTap={{ scale: isDisabled ? 1 : 0.98 }}
        onClick={handleUpload}
        disabled={isDisabled}
        className={`
          w-full py-3 rounded-xl font-bold text-sm
          flex items-center justify-center gap-2
          transition-all duration-300
          ${!isDisabled
            ? "bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white shadow-lg shadow-purple-500/25"
            : "bg-gray-700 text-gray-400 cursor-not-allowed"
          }
        `}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Subiendo...
          </>
        ) : (
          <>
            <Cloud className="w-5 h-5" />
            CARGAR .ZIP
          </>
        )}
      </motion.button>

      {/* Resultado de carga */}
      <AnimatePresence>
        {uploadResult && uploadResult.success && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-6 h-6 text-green-400" />
              <div>
                <h3 className="text-lg font-bold text-green-300">
                  ¡Envío Exitoso!
                </h3>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-cyan-400" />
                <span className={subTextColor}>Carpeta:</span>
                <span className={`${textColor} font-medium truncate`}>
                  {uploadResult.data?.folderPath}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-yellow-400" />
                <span className={subTextColor}>Estado:</span>
                <span className="text-yellow-300 font-medium">
                  En Proceso
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg text-center">
                <p className="text-lg font-bold text-cyan-300">
                  {uploadResult.data?.cantidadFacturas}
                </p>
                <p className="text-xs text-cyan-200/70">Facturas</p>
              </div>
              <div className="p-2 bg-purple-500/10 rounded-lg text-center">
                <p className="text-lg font-bold text-purple-300">
                  {uploadResult.data?.cantidadItems}
                </p>
                <p className="text-xs text-purple-200/70">Items</p>
              </div>
              <div className="p-2 bg-green-500/10 rounded-lg text-center">
                <p className="text-sm font-bold text-green-300">
                  {formatCurrency(uploadResult.data?.valorTotal || 0)}
                </p>
                <p className="text-xs text-green-200/70">Valor</p>
              </div>
            </div>

            {uploadResult.data?.uploadedFiles && (
              <div className="mt-3 p-2 bg-blue-500/10 rounded-lg">
                <p className="text-blue-300 text-xs flex items-center gap-1">
                  <Cloud className="w-3 h-3" />
                  {uploadResult.data.uploadedFiles.length} archivos almacenados en servidores de seguridad Bio
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
