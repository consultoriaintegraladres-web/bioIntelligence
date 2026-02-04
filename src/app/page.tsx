"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { 
  Bot, 
  Shield, 
  FileSearch, 
  Scale, 
  Stethoscope, 
  DollarSign, 
  MessageSquareReply, 
  Download,
  Zap,
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Brain,
  Activity,
  TrendingUp
} from "lucide-react";

const robots = [
  {
    id: 1,
    name: "PreAudit AI",
    description: "Realiza preauditoría completa de facturas en segundos",
    icon: FileSearch,
    color: "from-cyan-500 to-blue-600",
    shadowColor: "shadow-cyan-500/30",
  },
  {
    id: 2,
    name: "DocVerify AI",
    description: "Audita FURIPS vs soportes médicos con precisión del 99.9%",
    icon: Shield,
    color: "from-purple-500 to-pink-600",
    shadowColor: "shadow-purple-500/30",
  },
  {
    id: 3,
    name: "DataSync AI",
    description: "Valida consistencia entre factura y medios magnéticos",
    icon: Activity,
    color: "from-emerald-500 to-teal-600",
    shadowColor: "shadow-emerald-500/30",
  },
  {
    id: 4,
    name: "ADRES Comply AI",
    description: "Preauditoría de servicios con normativa ADRES actualizada",
    icon: Scale,
    color: "from-amber-500 to-orange-600",
    shadowColor: "shadow-amber-500/30",
  },
  {
    id: 5,
    name: "SurgeryAudit AI",
    description: "Audita cirugías, justificaciones y material de osteosíntesis",
    icon: Stethoscope,
    color: "from-red-500 to-rose-600",
    shadowColor: "shadow-red-500/30",
  },
  {
    id: 6,
    name: "PriceCheck AI",
    description: "Audita precios y techos MAOs en Colombia automáticamente",
    icon: DollarSign,
    color: "from-green-500 to-emerald-600",
    shadowColor: "shadow-green-500/30",
  },
  {
    id: 7,
    name: "GlosaResponse AI",
    description: "Responde automáticamente las glosas de la IPS",
    icon: MessageSquareReply,
    color: "from-blue-500 to-indigo-600",
    shadowColor: "shadow-blue-500/30",
  },
  {
    id: 8,
    name: "AutoGlosa AI",
    description: "Descarga, transcribe y responde glosas de aseguradoras",
    icon: Download,
    color: "from-violet-500 to-purple-600",
    shadowColor: "shadow-violet-500/30",
  },
];

const stats = [
  { value: "<1", unit: "min", label: "Por factura" },
  { value: "99.9", unit: "%", label: "Precisión" },
  { value: "8", unit: "", label: "Robots IA" },
  { value: "24/7", unit: "", label: "Operación" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen text-white overflow-x-hidden">
      {/* HERO SECTION - Full screen with background image */}
      <section className="relative min-h-screen flex items-center justify-center">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/hero-landing.jpg')" }}
        />
        
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-900/60 to-slate-950/90" />
        
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-purple-500/10" />

        {/* Navigation - Fixed on top */}
        <nav className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
              <Brain className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                BIORETAIL
              </h1>
              <p className="text-xs text-cyan-300/80">Consultoría en Salud</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl font-bold shadow-lg flex items-center gap-2 hover:bg-white/20 transition-all"
              >
                Iniciar Sesión
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </motion.div>
        </nav>

        {/* Hero Content - Centered */}
        <div className="relative z-10 max-w-6xl mx-auto px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            {/* Badge */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 px-5 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full mb-8"
            >
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span className="text-cyan-300 font-medium">Sistema Inteligente de Auditoría</span>
            </motion.div>

            {/* Main Title */}
            <h2 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight">
              <motion.span 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="block text-white drop-shadow-2xl"
              >
                Auditoría Médica
              </motion.span>
              <motion.span 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="block bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent"
              >
                Potenciada por IA
              </motion.span>
            </h2>

            {/* Subtitle */}
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-xl md:text-2xl text-gray-200/90 mb-10 max-w-3xl mx-auto leading-relaxed"
            >
              <span className="text-cyan-400 font-semibold">8 robots de IA especializados</span> procesando facturas completas en menos de 1 minuto con precisión del 99.9%
            </motion.p>

            {/* Stats */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="grid grid-cols-4 gap-4 max-w-2xl mx-auto mb-12"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1 + index * 0.1 }}
                  className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10"
                >
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl md:text-4xl font-black text-cyan-400">{stat.value}</span>
                    <span className="text-lg text-cyan-300">{stat.unit}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="/login">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(6, 182, 212, 0.4)" }}
                  whileTap={{ scale: 0.95 }}
                  className="px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl font-bold text-xl shadow-lg shadow-cyan-500/30 flex items-center gap-3 justify-center"
                >
                  <Zap className="w-6 h-6" />
                  Acceder al Sistema
                </motion.button>
              </Link>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-10 py-5 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl font-bold text-xl flex items-center gap-3 justify-center hover:bg-white/20 transition-all"
              >
                <Clock className="w-6 h-6" />
                Ver Demo
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, 10, 0] }}
            transition={{ delay: 2, duration: 2, repeat: Infinity }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
              <div className="w-1.5 h-3 bg-cyan-400 rounded-full animate-bounce" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ROBOTS SECTION */}
      <section className="relative py-24 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h3 className="text-4xl md:text-5xl font-black mb-4">
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                8 Robots de IA Especializados
              </span>
            </h3>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Cada robot diseñado para una tarea específica, trabajando en conjunto para garantizar auditorías precisas
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {robots.map((robot, index) => (
              <motion.div
                key={robot.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className={`
                  relative p-6 rounded-2xl 
                  bg-gradient-to-br from-slate-800/80 to-slate-900/80 
                  border border-white/10 backdrop-blur-xl
                  hover:border-white/20 transition-all duration-300
                  shadow-xl ${robot.shadowColor}
                `}
              >
                {/* Robot number */}
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-br from-white/20 to-white/5 rounded-full flex items-center justify-center text-sm font-bold border border-white/20">
                  {robot.id}
                </div>

                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${robot.color} flex items-center justify-center mb-4 shadow-lg ${robot.shadowColor}`}>
                  <robot.icon className="w-7 h-7 text-white" />
                </div>

                <h4 className="text-lg font-bold mb-2 text-white">{robot.name}</h4>
                <p className="text-sm text-gray-400 leading-relaxed">{robot.description}</p>

                {/* Status */}
                <div className="mt-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-green-400">Operativo 24/7</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS SECTION */}
      <section className="relative py-24 bg-gradient-to-b from-slate-950 via-cyan-950/20 to-slate-950">
        <div className="max-w-7xl mx-auto px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h3 className="text-4xl md:text-5xl font-black mb-4 text-white">
              Beneficios para tu IPS
            </h3>
            <p className="text-xl text-gray-400">
              Resultados medibles desde el primer día
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Clock,
                title: "Ahorro de Tiempo",
                description: "Reduce el tiempo de auditoría de días a minutos. Procesa cientos de facturas mientras tomas un café.",
                gradient: "from-cyan-500/20 to-blue-500/20",
                iconColor: "text-cyan-400",
              },
              {
                icon: DollarSign,
                title: "Recuperación de Cartera",
                description: "Detecta errores que antes pasaban desapercibidos. Maximiza la recuperación de glosas.",
                gradient: "from-green-500/20 to-emerald-500/20",
                iconColor: "text-green-400",
              },
              {
                icon: CheckCircle2,
                title: "Precisión Total",
                description: "Elimina el error humano. Nuestros robots trabajan 24/7 con precisión del 99.9% garantizada.",
                gradient: "from-purple-500/20 to-pink-500/20",
                iconColor: "text-purple-400",
              },
            ].map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className={`p-8 rounded-2xl bg-gradient-to-br ${benefit.gradient} border border-white/10 backdrop-blur-xl text-center`}
              >
                <div className={`w-16 h-16 mx-auto mb-6 rounded-2xl bg-white/5 flex items-center justify-center`}>
                  <benefit.icon className={`w-8 h-8 ${benefit.iconColor}`} />
                </div>
                <h4 className="text-xl font-bold mb-3 text-white">{benefit.title}</h4>
                <p className="text-gray-400">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative py-24">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
          style={{ backgroundImage: "url('/images/hero-landing.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/90 to-slate-950" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative max-w-4xl mx-auto text-center px-8"
        >
          <Sparkles className="w-12 h-12 text-cyan-400 mx-auto mb-6" />
          <h3 className="text-4xl md:text-5xl font-black mb-4 text-white">
            ¿Listo para transformar tu auditoría?
          </h3>
          <p className="text-xl text-gray-300 mb-8">
            Únete a las IPS que ya están revolucionando su proceso de auditoría con nuestra tecnología de IA
          </p>
          <Link href="/login">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 0 60px rgba(6, 182, 212, 0.5)" }}
              whileTap={{ scale: 0.95 }}
              className="px-12 py-6 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-2xl font-bold text-xl shadow-lg shadow-cyan-500/30 inline-flex items-center gap-3"
            >
              <Zap className="w-6 h-6" />
              Comenzar Ahora
              <ArrowRight className="w-6 h-6" />
            </motion.button>
          </Link>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="relative py-8 border-t border-white/10 bg-slate-950">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-cyan-400" />
            <span className="text-gray-400">
              © 2026 BIORETAIL Consultoría en Salud
            </span>
          </div>
          <div className="text-gray-500 text-sm">
            Sistema Inteligente de Auditoría v2.0
          </div>
        </div>
      </footer>
    </div>
  );
}
