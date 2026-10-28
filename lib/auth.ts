import { getServerSession, NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Role/branch can change after sign-in; re-read them from the DB at most this often
const TOKEN_REFRESH_MS = 5 * 60 * 1000;

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter your email and password.");
        }
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.trim().toLowerCase() },
        });
        // Same message for an unknown account, a wrong password and a deactivated account
        if (!user || !user.isActive || !(await bcrypt.compare(credentials.password, user.passwordHash))) {
          throw new Error("Incorrect email or password.");
        }
        return { id: user.id, name: user.name, email: user.email, role: user.role, branchId: user.branchId };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.branchId = user.branchId ?? null;
        token.refreshedAt = Date.now();
      } else if (!token.refreshedAt || Date.now() - token.refreshedAt > TOKEN_REFRESH_MS) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id },
          select: { role: true, branchId: true, isActive: true, name: true },
        });
        if (!fresh || !fresh.isActive) return { ...token, id: "", role: token.role };
        token.role = fresh.role;
        token.branchId = fresh.branchId;
        token.name = fresh.name;
        token.refreshedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.branchId = token.branchId ?? null;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export type SessionUser = {
  id: string;
  role: Role;
  branchId: string | null;
  name?: string | null;
  email?: string | null;
};

// For Server Components and Server Actions: the signed-in user, or an error
export async function requireUser(): Promise<SessionUser> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

export async function getOptionalUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ? session.user : null;
}
