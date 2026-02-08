import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Auth: Credenciales faltantes");
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) {
          console.log(`❌ Auth: Usuario no encontrado o sin contraseña: ${credentials.email}`);
          return null;
        }

        console.log(`🔍 Auth: Usuario encontrado - Email: ${user.email}, Rol: ${user.role}`);

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          console.log(`❌ Auth: Contraseña inválida para: ${credentials.email}`);
          return null;
        }

        console.log(`✅ Auth: Autenticación exitosa - Email: ${user.email}, Rol: ${user.role}`);

        return {
          id: String(user.id),
          email: user.email,
          name: user.nombre,
          role: user.role,
          codigoHabilitacion: user.codigo_habilitacion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.codigoHabilitacion = user.codigoHabilitacion;
        token.email = user.email;
        token.id = user.id;
      }
      // Validar que el token tenga datos válidos
      if (!token.email || !token.id || !token.role) {
        return null as any; // Invalidar token si falta información crítica
      }
      return token;
    },
    async session({ session, token }) {
      // Validar que el token tenga datos válidos antes de crear la sesión
      if (!token.email || !token.id || !token.role) {
        return null as any; // Invalidar sesión si falta información crítica
      }
      
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.role = token.role as "ADMIN" | "USER" | "ANALYST" | "COORDINADOR";
        session.user.codigoHabilitacion = token.codigoHabilitacion as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "bioretail-super-secret-key-2024",
});
