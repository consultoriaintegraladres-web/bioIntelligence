"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Slide {
  id: number;
  title: string;
  content: string;
  image?: string;
  gradient: string;
}

const slides: Slide[] = [
  {
    id: 1,
    title: "BIORETAIL - Consultoría en salud",
    content: "Somos una organización de consultoría en salud con 11 años de experiencia, que genera valor a sus clientes por medio de un capital humano especializado y experto, la gestión del conocimiento y el uso de las tecnologías de información y comunicaciones.",
    image: "/images/portfolio/bioretail-consultoria.svg",
    gradient: "from-cyan-500/20 to-blue-500/20",
  },
  {
    id: 2,
    title: "Oportunidad en el Negocio del SOAT",
    content: "Gestión de los accidentes de tránsito y eventos catastróficos (ECAT). Prestación de servicios médico quirúrgicos y traslados asistenciales a las víctimas de eventos ECAT. Línea del sector salud con mayor potencial para la generación de rentabilidad y liquidez a los prestadores de servicios de salud (PSS) en el 2026.",
    image: "/images/portfolio/oportunidad-soat.svg",
    gradient: "from-purple-500/20 to-pink-500/20",
  },
  {
    id: 3,
    title: "Evolución de la Auditoría en Salud",
    content: "La Resolución 00012758 de 2023 establece el Sistema de Auditoría por Alertas (SAA). La ADRES ha firmado alianzas con gigantes de la industria tecnológica para desarrollar auditoría inteligente de cuentas médicas, buscando reducir tiempos de respuesta y evitar fraudes mediante inteligencia artificial.",
    image: "/images/portfolio/evolucion-auditoria.svg",
    gradient: "from-emerald-500/20 to-teal-500/20",
  },
  {
    id: 4,
    title: "ADRES – Auditor y Pagador Inteligente",
    content: "La ADRES presenta la sala de inteligencia, una herramienta digital integrada para visualizar indicadores clave del sector como recaudo, pagos y reconocimientos y auditorías, a través de tecnología, análisis de datos e inteligencia artificial. Se espera que para marzo de 2026 se paguen, en cuestión de días, cuentas que anteriormente tomaban varios meses.",
    image: "/images/portfolio/adres-pagador.svg",
    gradient: "from-amber-500/20 to-orange-500/20",
  },
  {
    id: 5,
    title: "Plataforma Estratégica para la Gestión del SOAT",
    content: "Incluye suministro de material de osteosíntesis y biomateriales, cumplimiento de instrucciones de la Circular 015 de 2016, estrategias de mitigación de fraudes, capacitaciones, parametrización de servicios (PATROFIAS), procesos conciliatorios con Aseguradoras SOAT y tableros de control para análisis estratégico.",
    image: "/images/portfolio/plataforma-soat.svg",
    gradient: "from-red-500/20 to-rose-500/20",
  },
  {
    id: 6,
    title: "Beneficios de las TAAS",
    content: "Optimiza mayor reconocimiento (recaudo) en la primera presentación de la reclamación y en la gestión de glosa. Enfoque estratégico en evitar glosas totales (Killer) de mayor impacto económico y mejorar la gestión de procedimientos quirúrgicos + MAOS + Biomateriales. Optimización del talento humano y costo efectividad entre el valor recuperado y la inversión realizada.",
    image: "/images/portfolio/beneficios-taas.svg",
    gradient: "from-violet-500/20 to-purple-500/20",
  },
];

export default function PortfolioSlides() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000); // Cambia cada 5 segundos

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000); // Reanuda auto-play después de 10 segundos
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  return (
    <div className="relative w-full h-[400px] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.5 }}
          className={`absolute inset-0 p-8 md:p-12 bg-gradient-to-br ${slides[currentSlide].gradient}`}
        >
          {slides[currentSlide].image && (
            <div 
              className="absolute inset-0 opacity-20 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${slides[currentSlide].image})` }}
            />
          )}
          <div className="relative h-full flex flex-col justify-center z-10">
            <h3 className="text-2xl md:text-3xl font-bold mb-4 text-white">
              {slides[currentSlide].title}
            </h3>
            <p className="text-base md:text-lg text-gray-200 leading-relaxed max-w-4xl">
              {slides[currentSlide].content}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all z-10"
        aria-label="Slide anterior"
      >
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all z-10"
        aria-label="Slide siguiente"
      >
        <ChevronRight className="w-5 h-5 text-white" />
      </button>

      {/* Dots indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentSlide
                ? "bg-cyan-400 w-8"
                : "bg-white/30 hover:bg-white/50"
            }`}
            aria-label={`Ir a slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
