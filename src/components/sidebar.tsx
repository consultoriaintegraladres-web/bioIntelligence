"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FileSearch,
  LogOut,
  User,
  Bot,
  ChevronLeft,
  ChevronRight,
  Upload,
  ClipboardCheck,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/contexts/app-context";

interface SidebarProps {
  selectedIpsName?: string;
}

const menuItems = [
  {
    href: "/resumen",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "USER", "ANALYST"],
  },
  {
    href: "/detalle",
    label: "Detalle Hallazgos",
    icon: FileSearch,
    roles: ["ADMIN", "USER", "ANALYST"],
  },
  {
    href: "/control-facturas",
    label: "Tablero de Control Facturas",
    icon: Receipt,
    roles: ["ADMIN", "USER", "ANALYST"],
  },
  {
    href: "/carga-furips",
    label: "Carga FURIPS",
    icon: Upload,
    roles: ["ADMIN", "USER", "ANALYST"],
  },
  {
    href: "/validacion-envios",
    label: "Validación Envíos",
    icon: ClipboardCheck,
    roles: ["ADMIN", "USER", "ANALYST"],
  },
  {
    href: "/admin/prompts",
    label: "Admin Prompts",
    icon: Bot,
    roles: ["ADMIN"],
  },
];

export function Sidebar({ selectedIpsName }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { themeMode, sidebarCollapsed, setSidebarCollapsed } = useAppContext();
  
  const isLight = themeMode === "light";
  const bgColor = isLight ? "bg-white" : "bg-[#0e0e14]";
  const borderColor = isLight ? "border-gray-200" : "border-[#1a1a2e]";
  const textColor = isLight ? "text-gray-900" : "text-white";
  const subTextColor = isLight ? "text-gray-600" : "text-gray-400";
  const hoverBg = isLight ? "hover:bg-gray-100" : "hover:bg-[#1a1a2e]/50";

  return (
    <>
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 0 : 256 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`fixed left-0 top-0 z-40 h-screen ${bgColor} border-r ${borderColor} overflow-hidden`}
      >
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col h-full w-64"
            >
              {/* Logo Header */}
              <div className={`p-6 border-b ${borderColor}`}>
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 flex-shrink-0 flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#6B2D7B] to-[#4CAF50] rounded-xl opacity-20 animate-pulse" />
                    <Bot className="w-7 h-7 text-[#6B2D7B] relative z-10" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold bg-gradient-to-r from-[#6B2D7B] to-[#4CAF50] bg-clip-text text-transparent">
                      Bioretail
                    </h1>
                    <p className={`text-[10px] ${subTextColor} leading-tight`}>
                      Sistema Inteligente de Auditoría
                    </p>
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div className={`px-6 py-4 border-b ${borderColor}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6B2D7B] to-[#4CAF50] flex items-center justify-center shadow-lg shadow-[#6B2D7B]/20">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${textColor} truncate`}>
                      {session?.user?.name || "Usuario"}
                    </p>
                    <p className={`text-xs ${subTextColor} truncate`}>
                      {(session?.user as any)?.role === "ADMIN" 
                        ? "Administrador" 
                        : (session?.user as any)?.role === "ANALYST" 
                          ? "Analista" 
                          : "Usuario IPS"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 p-4 space-y-2">
                {menuItems
                  .filter((item) => {
                    const userRole = (session?.user as any)?.role || "USER";
                    return item.roles.includes(userRole);
                  })
                  .map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <Link key={item.href} href={item.href}>
                      <motion.div
                        whileHover={{ x: 4 }}
                        className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                          isActive
                            ? "bg-gradient-to-r from-[#6B2D7B]/20 to-[#4CAF50]/10 text-[#4CAF50]"
                            : `${hoverBg} ${subTextColor} hover:text-[#4CAF50]`
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-[#6B2D7B] to-[#4CAF50] rounded-r-full"
                          />
                        )}
                        <Icon className={`w-5 h-5 ${isActive ? "text-[#4CAF50]" : ""}`} />
                        <span className={`text-sm font-medium ${isActive ? textColor : ""}`}>
                          {item.label}
                        </span>
                      </motion.div>
                    </Link>
                  );
                })}
              </nav>

              {/* Footer */}
              <div className={`p-4 border-t ${borderColor}`}>
                <Button
                  variant="ghost"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className={`w-full justify-start gap-3 ${subTextColor} ${hoverBg} hover:text-red-500`}
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm font-medium">Cerrar Sesión</span>
                </Button>
                
                <div className="mt-4 px-4">
                  <p className={`text-[10px] ${subTextColor} text-center`}>
                    v1.0.0
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>

      {/* Toggle Button - Futuristic Design */}
      <motion.button
        initial={false}
        animate={{ 
          left: sidebarCollapsed ? 8 : 248,
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className={`fixed top-1/2 -translate-y-1/2 z-50 group`}
      >
        <div className={`
          relative flex items-center justify-center w-8 h-16 
          ${isLight ? "bg-white" : "bg-[#12121a]"} 
          ${borderColor} border
          rounded-r-xl shadow-lg
          transition-all duration-300
          hover:shadow-[#6B2D7B]/30 hover:shadow-xl
          hover:border-[#6B2D7B]/50
        `}>
          {/* Glowing effect */}
          <div className="absolute inset-0 rounded-r-xl bg-gradient-to-r from-[#6B2D7B]/0 to-[#4CAF50]/0 group-hover:from-[#6B2D7B]/10 group-hover:to-[#4CAF50]/10 transition-all duration-300" />
          
          {/* Arrow icon */}
          <motion.div
            animate={{ rotate: sidebarCollapsed ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronRight className={`w-5 h-5 ${isLight ? "text-gray-600" : "text-gray-400"} group-hover:text-[#4CAF50] transition-colors`} />
          </motion.div>
          
          {/* Decorative lines */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-gradient-to-r from-[#6B2D7B] to-[#4CAF50] rounded-full opacity-50" />
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-gradient-to-r from-[#4CAF50] to-[#6B2D7B] rounded-full opacity-50" />
        </div>
      </motion.button>
    </>
  );
}
