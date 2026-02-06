"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, Loader2 } from "lucide-react";
import { ThemeMode } from "@/contexts/app-context";

interface AISummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: string | null;
  isLoading: boolean;
  totalHallazgos: number;
  resumidos: number;
  themeMode?: ThemeMode;
}

export function AISummaryModal({
  open,
  onOpenChange,
  summary,
  isLoading,
  totalHallazgos,
  resumidos,
  themeMode = "dark",
}: AISummaryModalProps) {
  const isLight = themeMode === "light";
  const textColor = isLight ? "text-gray-900" : "text-white";
  const subTextColor = isLight ? "text-gray-600" : "text-gray-400";
  const borderColor = isLight ? "border-gray-200" : "border-[#1e1e2e]";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${isLight ? "bg-white border-gray-200" : "bg-[#12121a] border-[#1e1e2e]"} max-w-4xl max-h-[80vh] overflow-hidden flex flex-col`}
      >
        <DialogHeader className="pb-4 border-b border-[#1e1e2e]">
          <DialogTitle className={`flex items-center gap-2 text-lg ${textColor}`}>
            <Brain className="w-5 h-5 text-[#10B981]" />
            Resumen Inteligente de Hallazgos
          </DialogTitle>
          <p className={`text-sm ${subTextColor} mt-1`}>
            Analizando {resumidos} de {totalHallazgos} hallazgos encontrados
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className={`h-4 w-full ${isLight ? "bg-gray-200" : "bg-[#1a1a2e]"}`} />
              <Skeleton className={`h-4 w-3/4 ${isLight ? "bg-gray-200" : "bg-[#1a1a2e]"}`} />
              <Skeleton className={`h-4 w-5/6 ${isLight ? "bg-gray-200" : "bg-[#1a1a2e]"}`} />
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 text-[#10B981] animate-spin" />
              </div>
              <Skeleton className={`h-4 w-full ${isLight ? "bg-gray-200" : "bg-[#1a1a2e]"}`} />
              <Skeleton className={`h-4 w-2/3 ${isLight ? "bg-gray-200" : "bg-[#1a1a2e]"}`} />
            </div>
          ) : summary ? (
              <div className={`whitespace-pre-wrap leading-relaxed ${textColor} text-sm`}>
                {summary.split("\n").map((line, index) => {
                  const trimmedLine = line.trim();
                  if (!trimmedLine) return <br key={index} />;
                  
                  // Detectar números al inicio (hallazgos numerados)
                  if (/^\d+\./.test(trimmedLine)) {
                    return (
                      <p key={index} className={`font-semibold text-[#10B981] mb-2 mt-4 ${textColor}`}>
                        {trimmedLine}
                      </p>
                    );
                  }
                  
                  // Detectar líneas con guiones o bullets (listas)
                  if (/^[-•*]/.test(trimmedLine)) {
                    return (
                      <p key={index} className={`ml-4 mb-1 ${textColor}`}>
                        {trimmedLine}
                      </p>
                    );
                  }
                  
                  // Párrafos normales
                  return (
                    <p key={index} className={`mb-2 ${textColor}`}>
                      {trimmedLine}
                    </p>
                  );
                })}
              </div>
          ) : (
            <div className={`text-center py-8 ${subTextColor}`}>
              No se pudo generar el resumen
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
