import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getUserByUsername, recordLogin } from "@/lib/db/bigquery";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  // Needed for Auth.js to trust the host/proto headers a platform proxy (Vercel) sets,
  // rather than only the literal request URL — without it, redirects/cookies can break
  // in production even though everything works fine locally.
  trustHost: true,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (credentials) => {
        const username = credentials?.username;
        const password = credentials?.password;
        if (typeof username !== "string" || typeof password !== "string") return null;

        const user = await getUserByUsername(username);
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
          await recordLogin(user.id, false);
          return null;
        }

        // Banned accounts fail the same way as a wrong password — deliberately generic, so a
        // banned user (or anyone probing usernames) can't distinguish "banned" from "wrong
        // password" from the login screen.
        if (user.is_banned) {
          await recordLogin(user.id, false);
          return null;
        }

        await recordLogin(user.id, true);

        return {
          id: user.id,
          name: user.display_name,
          avatarKey: user.avatar_key,
          title: user.title,
          level: user.level,
          exp: user.exp,
          expToNextLevel: user.exp_to_next_level,
          isAdmin: Boolean(user.is_admin),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.avatarKey = user.avatarKey;
        token.title = user.title;
        token.level = user.level;
        token.exp = user.exp;
        token.expToNextLevel = user.expToNextLevel;
        token.isAdmin = user.isAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.avatarKey = token.avatarKey;
      session.user.title = token.title;
      session.user.level = token.level;
      session.user.exp = token.exp;
      session.user.expToNextLevel = token.expToNextLevel;
      session.user.isAdmin = token.isAdmin;
      return session;
    },
  },
});
