"use client";

import { motion } from "framer-motion";
import { Sun, Moon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppContext, ThemeMode } from "@/contexts/app-context";

export function ThemeSwitcher() {
  const { themeMode, setThemeMode } = useAppContext();

  const themes: { mode: ThemeMode; icon: React.ReactNode; label: string; tooltip: string }[] = [
    { mode: "light", icon: <Sun className="w-4 h-4" />, label: "Claro", tooltip: "Tema claro" },
    { mode: "dark", icon: <Moon className="w-4 h-4" />, label: "Oscuro", tooltip: "Tema oscuro" },
    { mode: "futuristic", icon: <Sparkles className="w-4 h-4" />, label: "Futurista", tooltip: "Tema futurista" },
  ];

  const isLight = themeMode === "light";
  const bgColor = isLight ? "bg-gray-100" : "bg-[#1a1a2e]";
  const borderColor = isLight ? "border-gray-200" : "border-[#2a2a3e]";

  return (
    <div className={`flex items-center gap-1 p-1 ${bgColor} rounded-xl border ${borderColor}`}>
      {themes.map((theme) => {
        const isActive = themeMode === theme.mode;
        // Each button uses its own theme's text color
        const buttonTextColor = theme.mode === "light" ? "text-gray-600" : "text-gray-400";
        const buttonActiveTextColor = theme.mode === "light" ? "text-gray-900" : "text-white";
        const buttonActiveBg = theme.mode === "light" ? "bg-white shadow-sm" : "bg-[#0e0e14]";
        const buttonHoverBg = theme.mode === "light" ? "hover:bg-white/50" : "hover:bg-[#0e0e14]/50";

        return (
          <Button
            key={theme.mode}
            variant="ghost"
            size="sm"
            onClick={() => setThemeMode(theme.mode)}
            className={`relative px-3 py-1.5 rounded-lg transition-all duration-200 ${
              isActive
                ? `${buttonActiveBg} ${isLight ? "text-gray-900" : "text-white"}`
                : `${isLight ? "text-gray-600 hover:bg-gray-200/50" : "text-gray-400 hover:bg-[#0e0e14]/50"}`
            }`}
            title={theme.tooltip}
          >
            {isActive && (
              <motion.div
                layoutId="activeTheme"
                className="absolute inset-0 bg-gradient-to-r from-[#6B2D7B]/10 to-[#4CAF50]/10 rounded-lg"
                initial={false}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {theme.icon}
              <span className="text-xs font-medium hidden sm:inline">{theme.label}</span>
            </span>
          </Button>
        );
      })}
    </div>
  );
}
