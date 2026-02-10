"use client";

import { motion } from "framer-motion";
import { Loader2, CheckCircle2, FileText, Database, Cloud } from "lucide-react";
import { useAppContext } from "@/contexts/app-context";

interface ProgressStep {
  stage: string;
  message: string;
  progress: number;
  icon?: React.ReactNode;
}

interface ProgressBarProps {
  currentStep: ProgressStep;
  isComplete?: boolean;
}

export default function ProgressBar({ currentStep, isComplete = false }: ProgressBarProps) {
  const { themeMode } = useAppContext();
  const isLight = themeMode === "light";

  const textColor = isLight ? "text-gray-900" : "text-white";
  const subTextColor = isLight ? "text-gray-600" : "text-gray-400";
  const bgColor = isLight ? "bg-gray-200" : "bg-gray-700";
  const progressColor = isLight ? "bg-blue-600" : "bg-blue-500";
  const completeColor = isLight ? "bg-green-600" : "bg-green-500";

  return (
    <div className={`p-6 rounded-xl border ${isLight ? "bg-white border-gray-200" : "bg-gray-800/50 border-gray-700"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {isComplete ? (
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-500" />
          ) : (
            <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-500 animate-spin" />
          )}
          <div>
            <h3 className={`font-semibold ${textColor}`}>
              {isComplete ? "¡Proceso Completado!" : currentStep.stage}
            </h3>
            <p className={`text-sm ${subTextColor}`}>
              {currentStep.message}
            </p>
          </div>
        </div>
        <div className={`text-2xl font-bold ${textColor}`}>
          {Math.round(currentStep.progress)}%
        </div>
      </div>

      {/* Progress Bar */}
      <div className={`h-3 rounded-full overflow-hidden ${bgColor}`}>
        <motion.div
          className={`h-full ${isComplete ? completeColor : progressColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${currentStep.progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Stages Indicator */}
      <div className="mt-6 grid grid-cols-5 gap-2">
        {[
          { name: "Validación", icon: FileText, threshold: 0 },
          { name: "Servidores Bio", icon: Cloud, threshold: 20 },
          { name: "Backups", icon: Database, threshold: 40 },
          { name: "FURIPS1", icon: FileText, threshold: 60 },
          { name: "FURIPS2", icon: Database, threshold: 80 },
        ].map((step, index) => {
          const isActive = currentStep.progress >= step.threshold;
          const isDone = currentStep.progress > step.threshold + 15;
          
          return (
            <div key={index} className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isDone
                    ? "bg-green-600 dark:bg-green-500 text-white"
                    : isActive
                    ? "bg-blue-600 dark:bg-blue-500 text-white"
                    : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400"
                }`}
              >
                <step.icon className="w-5 h-5" />
              </div>
              <span className={`text-xs mt-2 text-center ${isActive ? textColor : subTextColor}`}>
                {step.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Additional Info */}
      {!isComplete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={`mt-4 text-center text-sm ${subTextColor}`}
        >
          Este proceso puede tardar varios minutos. Por favor, no cierre esta ventana.
        </motion.div>
      )}
    </div>
  );
}

// Función helper para simular progreso gradual
export function simulateProgress(
  currentProgress: number,
  targetProgress: number,
  onUpdate: (progress: number) => void,
  duration = 2000
) {
  const steps = 20;
  const increment = (targetProgress - currentProgress) / steps;
  const interval = duration / steps;

  let step = 0;
  const timer = setInterval(() => {
    step++;
    const newProgress = currentProgress + (increment * step);
    
    if (step >= steps || newProgress >= targetProgress) {
      onUpdate(targetProgress);
      clearInterval(timer);
    } else {
      onUpdate(newProgress);
    }
  }, interval);

  return () => clearInterval(timer);
}
