"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2,
  FileWarning,
  Shield,
  User,
  Package,
  Truck,
  Hash
} from "lucide-react";
import { useAppContext } from "@/contexts/app-context";

interface ValidationError {
  line: number;
  expectedFields: number;
  actualFields: number;
  preview: string;
}

interface FileValidation {
  fileName: string;
  isValid: boolean;
  errors: ValidationError[];
  totalLines: number;
  validLines: number;
}

interface ResumenItem {
  codigo: string;
  descripcion: string;
  cantidad: number;
  valor: number;
  porcentaje: number;
}

interface FurtranData {
  cantidadRegistros: number;
  valorTotal: number;
  fileName?: string;
}

interface FilesContent {
  furips1: { name: string; content: string };
  furips2: { name: string; content: string };
  furtran: { name: string; content: string } | null;
}

interface FuripsData {
  idEnvio: string;
  codigoHabilitacion: string;
  nombreIps: string;
  cantidadFacturas: number;
  cantidadItems: number;
  valorTotal: number;
  resumenEstadoAseguramiento?: ResumenItem[];
  resumenCondicionVictima?: ResumenItem[];
  resumenTipoServicio?: ResumenItem[];
  furtran?: FurtranData | null;
  validation: {
    furips1: FileValidation;
    furips2: FileValidation;
    furtran?: FileValidation;
  };
  filesContent: FilesContent;
}

interface FuripsUploaderProps {
  onValidationComplete: (data: FuripsData) => void;
  onError: (error: string) => void;
  onReset?: () => void;
  isUploading?: boolean;
}

export default function FuripsUploader({ onValidationComplete, onError, onReset, isUploading = false }: FuripsUploaderProps) {
  const { themeMode } = useAppContext();
  const [idEnvio, setIdEnvio] = useState("");
  const [furips1File, setFurips1File] = useState<File | null>(null);
  const [furips2File, setFurips2File] = useState<File | null>(null);
  const [furtranFile, setFurtranFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    success: boolean;
    data?: FuripsData;
    validation?: {
      furips1: FileValidation;
      furips2: FileValidation;
      furtran?: FileValidation;
    };
  } | null>(null);

  // Colores dinámicos según el tema
  const isLight = themeMode === "light";
  const textColor = isLight ? "text-gray-900" : "text-white";
  const subTextColor = isLight ? "text-gray-600" : "text-gray-400";
  const borderColor = isLight ? "border-gray-300" : "border-gray-600";
  const bgUpload = isLight ? "bg-gray-100" : "bg-gray-800/50";
  const bgUploadHover = isLight ? "hover:bg-gray-200" : "hover:bg-gray-700/50";
  const tableBorder = isLight ? "border-gray-200" : "border-gray-700/50";
  const tableRowHover = isLight ? "hover:bg-gray-100" : "hover:bg-gray-800/30";
  const inputBg = isLight ? "bg-white border-gray-300" : "bg-gray-800 border-gray-600";
  const inputText = isLight ? "text-gray-900" : "text-white";

  const handleFileChange = useCallback((
    event: React.ChangeEvent<HTMLInputElement>,
    setFile: (file: File | null) => void
  ) => {
    // Desactivar durante carga
    if (isUploading) {
      event.target.value = "";
      return;
    }
    
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith(".txt")) {
        onError("El archivo debe ser de formato .txt");
        event.target.value = "";
        return;
      }
      setFile(file);
      setValidationResult(null);
    }
  }, [onError, isUploading]);

  // Determinar si se puede validar
  // FURTRAN puede validarse solo, o FURIPS1+FURIPS2 juntos (con o sin FURTRAN)
  const canValidateFurips = furips1File && furips2File;
  const canValidateFurtranOnly = furtranFile && !furips1File && !furips2File;
  const canValidate = (canValidateFurips || canValidateFurtranOnly) && idEnvio.trim();

  const handleValidate = async () => {
    if (!idEnvio.trim()) {
      onError("Debe ingresar el ID/Nombre del Envío");
      return;
    }

    // Validar que tenga FURIPS1+FURIPS2, o solo FURTRAN
    const hasFurips = furips1File && furips2File;
    const hasFurtranOnly = furtranFile && !furips1File && !furips2File;

    if (!hasFurips && !hasFurtranOnly) {
      onError("Debe seleccionar FURIPS1 y FURIPS2 juntos, o solo FURTRAN");
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      // Si es solo FURTRAN, usar endpoint diferente
      if (hasFurtranOnly) {
        const formData = new FormData();
        formData.append("furtran", furtranFile!);
        formData.append("idEnvio", idEnvio.trim());

        const response = await fetch("/api/upload-furtran", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          onError(result.error || "Error al validar FURTRAN");
          setIsValidating(false);
          return;
        }

        // Crear datos compatibles para el flujo de FURTRAN solo
        const furtranOnlyData: FuripsData = {
          idEnvio: idEnvio.trim(),
          codigoHabilitacion: result.data?.codigoHabilitacion || "",
          nombreIps: result.data?.nombreIps || "",
          cantidadFacturas: 0,
          cantidadItems: 0,
          valorTotal: 0,
          furtran: {
            cantidadRegistros: result.data?.cantidadRegistros || 0,
            valorTotal: result.data?.valorTotal || 0,
            fileName: furtranFile!.name,
          },
          validation: {
            furips1: { fileName: "", isValid: true, errors: [], totalLines: 0, validLines: 0 },
            furips2: { fileName: "", isValid: true, errors: [], totalLines: 0, validLines: 0 },
            furtran: result.data?.validation,
          },
          filesContent: {
            furips1: { name: "", content: "" },
            furips2: { name: "", content: "" },
            furtran: { name: furtranFile!.name, content: await furtranFile!.text() },
          },
        };

        setValidationResult({ success: true, data: furtranOnlyData });
        onValidationComplete(furtranOnlyData);
        setIsValidating(false);
        return;
      }

      // Validación normal de FURIPS1 + FURIPS2 (+ opcional FURTRAN)
      const formData = new FormData();
      formData.append("furips1", furips1File!);
      formData.append("furips2", furips2File!);
      formData.append("idEnvio", idEnvio.trim());
      
      if (furtranFile) {
        formData.append("furtran", furtranFile);
      }

      const response = await fetch("/api/upload-furips", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        onError(result.error || "Error al validar los archivos");
        return;
      }

      setValidationResult(result);

      if (result.success && result.data) {
        onValidationComplete(result.data);
      }
    } catch (error) {
      onError("Error de conexión al validar los archivos");
    } finally {
      setIsValidating(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const renderFileInput = (
    label: string,
    expectedFields: number,
    file: File | null,
    setFile: (file: File | null) => void,
    inputId: string,
    isOptional: boolean = false,
    colorAccent: string = "cyan"
  ) => (
    <div className="relative">
      <label
        htmlFor={inputId}
        className={`
          flex flex-col items-center justify-center w-full h-36 
          border-2 border-dashed rounded-xl transition-all duration-300
          ${isUploading 
            ? "opacity-50 cursor-not-allowed" 
            : "cursor-pointer"
          }
          ${file 
            ? `border-${colorAccent}-500/50 bg-${colorAccent}-500/10` 
            : `${borderColor} ${bgUpload} ${!isUploading ? bgUploadHover : ""} ${!isUploading ? `hover:border-${colorAccent}-400` : ""}`
          }
        `}
      >
        <div className="flex flex-col items-center justify-center pt-4 pb-4">
          {file ? (
            <>
              <FileText className={`w-8 h-8 mb-2 text-${colorAccent}-400`} />
              <p className={`text-sm text-${colorAccent}-300 font-medium truncate max-w-full px-2`}>{file.name}</p>
              <p className={`text-xs ${subTextColor} mt-1`}>
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </>
          ) : (
            <>
              <Upload className={`w-8 h-8 mb-2 ${subTextColor}`} />
              <p className={`mb-1 text-sm ${textColor} text-center px-2`}>
                <span className="font-semibold">{label}</span>
                {isOptional && <span className="text-xs ml-1">(Opcional)</span>}
              </p>
              <p className={`text-xs ${subTextColor}`}>
                TXT con {expectedFields} campos
              </p>
            </>
          )}
        </div>
        <input
          id={inputId}
          type="file"
          className="hidden"
          accept=".txt"
          onChange={(e) => handleFileChange(e, setFile)}
          disabled={isUploading}
        />
      </label>
      {file && (
        <button
          onClick={() => {
            setFile(null);
            setValidationResult(null);
          }}
          className="absolute top-2 right-2 p-1 rounded-full bg-red-500/20 hover:bg-red-500/40 transition-colors"
        >
          <XCircle className="w-4 h-4 text-red-400" />
        </button>
      )}
    </div>
  );

  const [showAllErrors, setShowAllErrors] = useState(false);

  const renderValidationErrors = (validation: FileValidation) => {
    const errorsToShow = showAllErrors ? validation.errors : validation.errors.slice(0, 10);
    const errorBg = isLight ? "bg-red-50" : "bg-red-500/10";
    const errorBorder = isLight ? "border-red-200" : "border-red-500/30";
    const errorText = isLight ? "text-red-700" : "text-red-300";
    const errorItemBg = isLight ? "bg-red-100" : "bg-red-900/20";

    return (
      <div className={`mt-4 p-4 ${errorBg} border ${errorBorder} rounded-xl`}>
        <div className="flex items-center gap-2 mb-3">
          <FileWarning className={`w-5 h-5 ${isLight ? "text-red-600" : "text-red-400"}`} />
          <span className={`${errorText} font-medium`}>
            {validation.fileName}: {validation.errors.length} errores encontrados
          </span>
        </div>
        <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
          {errorsToShow.map((error, index) => (
            <div 
              key={index} 
              className={`p-2 ${errorItemBg} rounded-lg text-sm`}
            >
              <p className={errorText}>
                <span className="font-bold">Línea {error.line}:</span>{" "}
                Esperados {error.expectedFields} campos, encontrados {error.actualFields}
              </p>
              <p className={`${subTextColor} text-xs mt-1 truncate`}>
                {error.preview}
              </p>
            </div>
          ))}
        </div>
        {validation.errors.length > 10 && (
          <button
            onClick={() => setShowAllErrors(!showAllErrors)}
            className={`mt-3 w-full py-2 rounded-lg text-sm font-medium transition-colors
              ${isLight 
                ? "bg-red-100 hover:bg-red-200 text-red-700" 
                : "bg-red-900/30 hover:bg-red-900/50 text-red-300"
              }`}
          >
            {showAllErrors 
              ? "Mostrar menos" 
              : `Ver ${validation.errors.length - 10} errores más`}
          </button>
        )}
      </div>
    );
  };

  const renderResumenTable = (
    title: string, 
    icon: React.ReactNode,
    items: ResumenItem[] | undefined, 
    showValor: boolean = false,
    colorClass: string = "cyan"
  ) => {
    if (!items || items.length === 0) return null;

    const cardBg = isLight ? "bg-gray-50" : `bg-${colorClass}-500/5`;
    const cardBorder = isLight ? "border-gray-200" : `border-${colorClass}-500/20`;
    const titleColor = isLight ? "text-gray-800" : `text-${colorClass}-300`;

    return (
      <div className={`p-4 ${cardBg} border ${cardBorder} rounded-xl`}>
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <h4 className={`${titleColor} font-bold text-base`}>{title}</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr className={`border-b ${tableBorder}`}>
                <th className={`text-left py-2 px-2 ${subTextColor} font-medium`} style={{width: showValor ? '35%' : '50%'}}>Descripción</th>
                <th className={`text-right py-2 px-2 ${subTextColor} font-medium`} style={{width: '15%'}}>Cant.</th>
                {showValor && (
                  <th className={`text-right py-2 px-2 ${subTextColor} font-medium`} style={{width: '30%'}}>Valor</th>
                )}
                <th className={`text-right py-2 px-2 ${subTextColor} font-medium`} style={{width: '20%'}}>%</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr 
                  key={index} 
                  className={`border-b ${tableBorder} ${tableRowHover} transition-colors`}
                >
                  <td className={`py-2 px-2 ${textColor} truncate`}>{item.descripcion}</td>
                  <td className={`text-right py-2 px-2 font-medium ${isLight ? "text-blue-600" : "text-cyan-300"}`}>
                    {item.cantidad.toLocaleString()}
                  </td>
                  {showValor && (
                    <td className={`text-right py-2 px-2 font-medium text-xs ${isLight ? "text-green-700" : "text-green-300"}`}>
                      {formatCurrency(item.valor)}
                    </td>
                  )}
                  <td className={`text-right py-2 px-2 font-medium ${isLight ? "text-amber-600" : "text-yellow-300"}`}>
                    {item.porcentaje.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Campo ID del Envío */}
      <div>
        <label className={`block text-sm font-medium ${textColor} mb-2`}>
          <Hash className="w-4 h-4 inline mr-2" />
          ID/Nombre del Envío <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={idEnvio}
          onChange={(e) => setIdEnvio(e.target.value)}
          placeholder="Ej: ENVIO_001, LOTE_ENERO_2026..."
          disabled={isUploading}
          className={`w-full px-4 py-3 rounded-xl border ${inputBg} ${inputText} 
            focus:ring-2 focus:ring-cyan-500 focus:border-transparent
            placeholder:text-gray-500 transition-all
            ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
        />
        <p className={`mt-1 text-xs ${subTextColor}`}>
          Este nombre debe ser único por día. Se usará para crear la carpeta de archivos.
        </p>
      </div>

      {/* Archivos FURIPS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {renderFileInput(
          "FURIPS1",
          102,
          furips1File,
          setFurips1File,
          "furips1-input",
          false,
          "cyan"
        )}
        {renderFileInput(
          "FURIPS2",
          9,
          furips2File,
          setFurips2File,
          "furips2-input",
          false,
          "purple"
        )}
        {renderFileInput(
          "FURTRAN",
          46,
          furtranFile,
          setFurtranFile,
          "furtran-input",
          true,
          "amber"
        )}
      </div>

      {/* Mensaje de ayuda */}
      <div className={`text-xs ${subTextColor} text-center`}>
        {canValidateFurtranOnly && (
          <span className="text-amber-400">✓ FURTRAN listo para validar (independiente)</span>
        )}
        {canValidateFurips && !furtranFile && (
          <span className="text-cyan-400">✓ FURIPS1 + FURIPS2 listos para validar</span>
        )}
        {canValidateFurips && furtranFile && (
          <span className="text-green-400">✓ FURIPS1 + FURIPS2 + FURTRAN listos para validar</span>
        )}
        {!canValidate && idEnvio.trim() && (
          <span className="text-gray-500">Cargue FURIPS1+FURIPS2 juntos, o solo FURTRAN</span>
        )}
      </div>

      {/* Botón de validación */}
      <motion.button
        whileHover={{ scale: canValidate && !isValidating && !isUploading ? 1.02 : 1 }}
        whileTap={{ scale: canValidate && !isValidating && !isUploading ? 0.98 : 1 }}
        onClick={handleValidate}
        disabled={!canValidate || isValidating || isUploading}
        className={`
          w-full py-4 rounded-xl font-bold text-lg
          flex items-center justify-center gap-3
          transition-all duration-300
          ${canValidate && !isValidating && !isUploading
            ? canValidateFurtranOnly 
              ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-lg shadow-amber-500/25"
              : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25"
            : "bg-gray-700 text-gray-400 cursor-not-allowed"
          }
        `}
      >
        {isValidating ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            Validando archivos...
          </>
        ) : canValidateFurtranOnly ? (
          <>
            <Truck className="w-6 h-6" />
            Validar FURTRAN
          </>
        ) : (
          <>
            <CheckCircle2 className="w-6 h-6" />
            Validar Archivos
          </>
        )}
      </motion.button>

      {/* Botón Realizar Nuevo Envío - Debajo del botón Validar Archivos */}
      {(isUploading || validationResult) && onReset && (
        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: isUploading ? 1 : 1.02 }}
          whileTap={{ scale: isUploading ? 1 : 0.98 }}
          onClick={() => {
            // Limpiar todo el estado local
            setIdEnvio("");
            setFurips1File(null);
            setFurips2File(null);
            setFurtranFile(null);
            setValidationResult(null);
            // Llamar al reset del componente padre que recarga la página
            onReset();
          }}
          disabled={isUploading}
          className={`
            w-full py-3 rounded-xl font-bold text-base 
            shadow-lg transition-all duration-300 
            flex items-center justify-center gap-2 mt-3
            ${isUploading
              ? "bg-gradient-to-r from-gray-600 to-gray-700 text-white cursor-pointer"
              : "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white"
            }
          `}
        >
          <XCircle className="w-5 h-5" />
          Realizar Nuevo Envío
        </motion.button>
      )}

      {/* Resultados de validación */}
      <AnimatePresence>
        {validationResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {validationResult.success ? (
              <div className="space-y-6">
                {/* Resumen General */}
                <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-400" />
                    <div>
                      <h3 className="text-xl font-bold text-green-300">
                        Archivos Válidos
                      </h3>
                      <p className="text-green-200/70">
                        Envío: <span className="font-bold">{validationResult.data?.idEnvio}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="p-3 bg-green-500/10 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-300">
                        {validationResult.data?.cantidadFacturas || 0}
                      </p>
                      <p className="text-xs text-green-200/70">Facturas</p>
                    </div>
                    <div className="p-3 bg-green-500/10 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-300">
                        {validationResult.data?.cantidadItems || 0}
                      </p>
                      <p className="text-xs text-green-200/70">Items</p>
                    </div>
                    <div className="p-3 bg-green-500/10 rounded-lg text-center">
                      <p className="text-xl font-bold text-green-300">
                        {formatCurrency(validationResult.data?.valorTotal || 0)}
                      </p>
                      <p className="text-xs text-green-200/70">Valor Total</p>
                    </div>
                    <div className="p-3 bg-green-500/10 rounded-lg text-center">
                      <p className="text-lg font-bold text-green-300 truncate">
                        {validationResult.data?.codigoHabilitacion || "N/A"}
                      </p>
                      <p className="text-xs text-green-200/70">Código Hab.</p>
                    </div>
                  </div>

                  {/* Resumen FURTRAN si existe */}
                  {validationResult.data?.furtran && (
                    <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Truck className="w-5 h-5 text-amber-400" />
                        <h4 className="text-amber-300 font-bold">FURTRAN Cargado</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-amber-200/70">Registros</p>
                          <p className="text-xl font-bold text-amber-300">
                            {validationResult.data.furtran.cantidadRegistros}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-amber-200/70">Valor Total</p>
                          <p className="text-xl font-bold text-amber-300">
                            {formatCurrency(validationResult.data.furtran.valorTotal)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Resúmenes de FURIPS1 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {renderResumenTable(
                    "Estado de Aseguramiento",
                    <Shield className="w-5 h-5 text-blue-400" />,
                    validationResult.data?.resumenEstadoAseguramiento,
                    false,
                    "blue"
                  )}
                  {renderResumenTable(
                    "Condición de Víctima",
                    <User className="w-5 h-5 text-purple-400" />,
                    validationResult.data?.resumenCondicionVictima,
                    false,
                    "purple"
                  )}
                </div>

                {/* Resumen de FURIPS2 */}
                {renderResumenTable(
                  "Tipo de Servicio (FURIPS2)",
                  <Package className="w-5 h-5 text-emerald-400" />,
                  validationResult.data?.resumenTipoServicio,
                  true,
                  "emerald"
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6 text-yellow-400" />
                    <span className="text-yellow-300 font-medium">
                      Se encontraron errores en los archivos
                    </span>
                  </div>
                  <p className="text-yellow-200/70 text-sm mt-2">
                    Corrija los errores y vuelva a cargar los archivos
                  </p>
                </div>
                
                {validationResult.validation?.furips1 && 
                  !validationResult.validation.furips1.isValid &&
                  renderValidationErrors(validationResult.validation.furips1)
                }
                
                {validationResult.validation?.furips2 && 
                  !validationResult.validation.furips2.isValid &&
                  renderValidationErrors(validationResult.validation.furips2)
                }

                {validationResult.validation?.furtran && 
                  !validationResult.validation.furtran.isValid &&
                  renderValidationErrors(validationResult.validation.furtran)
                }
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
