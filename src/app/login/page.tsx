"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, Brain, Zap, ArrowLeft, Bot } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/resumen";
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Credenciales inválidas");
        setIsLoading(false);
        return;
      }

      toast.success("¡Bienvenido al sistema!");
      router.push(callbackUrl);
      router.refresh();
    } catch (error) {
      toast.error("Error al iniciar sesión");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image - Full screen */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/hero-login.jpg')" }}
      />
      
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-900/70 to-slate-950/80" />
      
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5" />

      {/* Back to home */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-6 left-6 z-20"
      >
        <Link href="/">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-gray-200 hover:text-white hover:bg-white/20 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Volver</span>
          </motion.button>
        </Link>
      </motion.div>

      {/* Main Content - Centered */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Glass Card */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-8 pb-6 text-center">
              {/* Logo */}
              <motion.div 
                className="mx-auto flex flex-col items-center gap-4"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.2 }}
              >
                <div className="p-4 bg-gradient-to-br from-cyan-500/30 to-blue-600/30 rounded-2xl border border-cyan-400/30 backdrop-blur-sm">
                  <Brain className="w-12 h-12 text-cyan-400" />
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 space-y-2"
              >
                <h1 className="text-4xl font-black text-white">
                  BIORETAIL
                </h1>
                <p className="text-sm text-cyan-300/80 uppercase tracking-widest">
                  Consultoría en Salud
                </p>
                <p className="text-gray-300 pt-2">
                  Sistema Inteligente de Auditoría
                </p>
              </motion.div>

              {/* Feature badges */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex justify-center gap-3 pt-6"
              >
                <div className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 rounded-xl border border-cyan-500/30">
                  <Bot className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm text-cyan-300 font-medium">8 Robots IA</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-xl border border-green-500/30">
                  <ShieldCheck className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-300 font-medium">Seguro</span>
                </div>
              </motion.div>
            </div>

            {/* Form */}
            <div className="px-8 pb-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Label htmlFor="email" className="text-gray-200 text-sm font-medium">
                    Correo electrónico
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@ips.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400/30 rounded-xl py-6 backdrop-blur-sm transition-all"
                  />
                </motion.div>

                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Label htmlFor="password" className="text-gray-200 text-sm font-medium">
                    Contraseña
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400/30 rounded-xl py-6 backdrop-blur-sm transition-all"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-6 rounded-xl shadow-lg shadow-cyan-500/30 transition-all duration-300 text-lg border-0"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-5 w-5" />
                        Ingresar al Sistema
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>

              {/* Demo credentials */}
              <motion.div 
                className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <p className="text-xs text-gray-400 text-center">
                  <span className="text-cyan-400 font-medium">Admin:</span> admin@bioretail.com / Admin123!
                </p>
              </motion.div>
            </div>
          </div>

          {/* Footer */}
          <motion.p 
            className="text-center text-xs text-gray-400 mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            © 2026 BIORETAIL • Sistema Inteligente de Auditoría
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
