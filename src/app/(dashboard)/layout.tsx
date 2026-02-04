"use client";

import { motion } from "framer-motion";
import { Sidebar } from "@/components/sidebar";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useAppContext } from "@/contexts/app-context";
import { Building2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { themeMode, selectedIpsName, sidebarCollapsed } = useAppContext();

  const isLight = themeMode === "light";
  const isFuturistic = themeMode === "futuristic";
  
  const bgColor = isLight ? "bg-gray-50" : "bg-[#0a0a0f]";
  const textColor = isLight ? "text-gray-900" : "text-white";

  return (
    <div className={`min-h-screen ${bgColor} ${textColor} relative transition-colors duration-300`}>
      {/* Futuristic background */}
      {isFuturistic && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(to right, #6B2D7B 1px, transparent 1px), 
                               linear-gradient(to bottom, #6B2D7B 1px, transparent 1px)`,
              backgroundSize: "50px 50px",
            }}
          />
          <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-gradient-to-br from-[#6B2D7B]/10 via-transparent to-transparent blur-3xl" />
          <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-to-tl from-[#4CAF50]/10 via-transparent to-transparent blur-3xl" />
          <div className="absolute top-1/4 right-1/4 w-64 h-64 border border-[#6B2D7B]/10 rounded-full animate-pulse" style={{ animationDuration: "4s" }} />
          <div className="absolute bottom-1/4 left-1/4 w-48 h-48 border border-[#4CAF50]/10 rounded-full animate-pulse" style={{ animationDuration: "3s" }} />
          <div className="absolute top-20 right-40 text-[#6B2D7B]/5 text-9xl font-mono">AI</div>
          <div className="absolute bottom-20 left-40 text-[#4CAF50]/5 text-8xl font-mono">◉</div>
        </div>
      )}

      {isLight && (
        <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-br from-gray-50 via-white to-gray-100" />
      )}

      <Sidebar selectedIpsName={selectedIpsName} />
      
      <motion.main
        initial={false}
        animate={{ 
          marginLeft: sidebarCollapsed ? 0 : 256,
          paddingLeft: sidebarCollapsed ? 48 : 0,
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="min-h-screen p-6 relative z-10"
      >
        {/* Header with theme switcher and IPS name */}
        <div className="flex items-center justify-between mb-4">
          {selectedIpsName && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
              isLight 
                ? "bg-[#6B2D7B]/5 border-[#6B2D7B]/20" 
                : "bg-[#6B2D7B]/10 border-[#6B2D7B]/20"
            }`}>
              <Building2 className="w-4 h-4 text-[#6B2D7B]" />
              <span className={`text-sm font-medium ${textColor}`}>
                IPS: <span className="text-[#4CAF50]">{selectedIpsName}</span>
              </span>
            </div>
          )}
          <div className="ml-auto">
            <ThemeSwitcher />
          </div>
        </div>
        
        {children}
      </motion.main>
    </div>
  );
}
