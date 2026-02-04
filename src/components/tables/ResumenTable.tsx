"use client";

import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Bot, Lightbulb } from "lucide-react";
import { ThemeMode } from "@/contexts/app-context";

interface ResumenData {
  tipo_validacion: string;
  cantidad_registros: number;
  valor_total: number;
  Recomendacion: string | null;
  Tipo_robot: string | null;
}

interface ResumenTableProps {
  data: ResumenData[];
  isLoading: boolean;
  themeMode?: ThemeMode;
}

// Truncate text to max 60 chars, show full on hover
const truncateText = (text: string, maxLen: number = 60) => {
  if (!text) return "-";
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 3) + "...";
};

export function ResumenTable({ data, isLoading, themeMode = "dark" }: ResumenTableProps) {
  const isLight = themeMode === "light";
  const textColor = isLight ? "text-gray-900" : "text-white";
  const subTextColor = isLight ? "text-gray-600" : "text-gray-400";
  const headerBg = isLight ? "bg-gray-100" : "bg-[#1a1a2e]/50";
  const borderColor = isLight ? "border-gray-200" : "border-[#1e1e2e]";
  const hoverBg = isLight ? "hover:bg-gray-50" : "hover:bg-[#1a1a2e]/30";
  const skeletonBg = isLight ? "bg-gray-200" : "bg-[#1a1a2e]";

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className={`h-14 w-full ${skeletonBg}`} />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-48 text-lg ${subTextColor}`}>
        No hay datos disponibles. Aplique filtros para ver información.
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={`rounded-xl border ${borderColor} overflow-hidden`}>
        <Table>
          <TableHeader>
            <TableRow className={`${headerBg} ${borderColor}`}>
              <TableHead className={`${textColor} font-semibold text-base py-4`}>Tipo de Validación</TableHead>
              <TableHead className={`${textColor} font-semibold text-base text-center py-4`}>Cantidad</TableHead>
              <TableHead className={`${textColor} font-semibold text-base text-right py-4`}>Valor Total</TableHead>
              <TableHead className={`${textColor} font-semibold text-base py-4`}>Robot</TableHead>
              <TableHead className={`${textColor} font-semibold text-base py-4`}>Recomendación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <motion.tr
                key={row.tipo_validacion + index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`border-b ${borderColor} ${hoverBg} transition-colors`}
              >
                <TableCell className="max-w-[350px] py-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={`text-base ${textColor} cursor-help leading-relaxed block`}>
                        {truncateText(row.tipo_validacion, 60)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className={`max-w-lg p-3 ${isLight ? "bg-white border-gray-200 text-gray-900" : "bg-[#1e1e2e] border-[#2a2a3e] text-white"}`}
                    >
                      <p className="text-sm leading-relaxed">{row.tipo_validacion}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-center py-4">
                  <Badge
                    variant="outline"
                    className="border-[#10B981]/50 text-[#10B981] bg-[#10B981]/10 font-mono text-base px-3 py-1"
                  >
                    {row.cantidad_registros.toLocaleString()}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-[#10B981] font-semibold text-base py-4">
                  {formatCurrency(row.valor_total)}
                </TableCell>
                <TableCell className="py-4">
                  {row.Tipo_robot ? (
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-[#9333EA]" />
                      <span className="text-sm text-[#9333EA] font-medium">{row.Tipo_robot}</span>
                    </div>
                  ) : (
                    <span className={`text-sm ${subTextColor}`}>-</span>
                  )}
                </TableCell>
                <TableCell className="max-w-[280px] py-4">
                  {row.Recomendacion ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 cursor-help">
                          <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <span className={`text-base ${textColor} leading-relaxed`}>
                            {truncateText(row.Recomendacion, 50)}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="left"
                        className={`max-w-md p-3 ${isLight ? "bg-white border-gray-200 text-gray-900" : "bg-[#1e1e2e] border-[#2a2a3e] text-white"}`}
                      >
                        <p className="text-sm leading-relaxed">{row.Recomendacion}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className={`text-sm ${subTextColor}`}>Sin recomendación</span>
                  )}
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
