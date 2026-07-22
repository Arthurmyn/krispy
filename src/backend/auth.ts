import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/backend/prisma";
import { verifyPassword } from "@/backend/password";

// Real email+password sign-in — separate from the dev-only email-only
// provider below. Only matches users who actually have a passwordHash set
// (Google-only accounts can't be logged into this way).
const emailPasswordProvider = Credentials({
  id: "credentials",
  name: "Email and password",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    const email = credentials?.email;
    const password = credentials?.password;
    if (typeof email !== "string" || typeof password !== "string") return null;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) return null;
    const valid = await verifyPassword(password, user.passwordHash);
    return valid ? user : null;
  },
});

// Auth.js v5 auto-detects env vars named AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET
// when a provider is passed unconfigured — this project's .env (and the
// Vercel setup docs) use the v4-style GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET
// names instead, so pass them explicitly rather than renaming everything.
const Google = GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
});

// Dev-only: sign in with just an email, no password, no Google OAuth app
// required. Lets you preview the authenticated UI locally. Never enabled
// when NODE_ENV is production.
const devEmailProvider = Credentials({
  id: "dev-email",
  name: "Dev sign-in",
  credentials: { email: { label: "Email", type: "email" } },
  async authorize(credentials) {
    const email = credentials?.email;
    if (typeof email !== "string" || !email.includes("@")) return null;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name: email.split("@")[0] },
    });
    return user;
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers:
    process.env.NODE_ENV === "production"
      ? [Google, emailPasswordProvider]
      : [Google, emailPasswordProvider, devEmailProvider],
  // JWT sessions work with both the OAuth and Credentials providers; the
  // adapter still links Google accounts to User rows on sign-in.
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
    // Marketing pages live at "/"; the product lives at "/app". Land there
    // by default unless a specific in-app callbackUrl was requested.
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      return `${baseUrl}/app`;
    },
  },
});
