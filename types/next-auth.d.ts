import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    avatarKey: string;
    title: string;
    level: number;
    exp: number;
    expToNextLevel: number;
    isAdmin: boolean;
  }

  interface Session {
    user: {
      id: string;
      avatarKey: string;
      title: string;
      level: number;
      exp: number;
      expToNextLevel: number;
      isAdmin: boolean;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    avatarKey: string;
    title: string;
    level: number;
    exp: number;
    expToNextLevel: number;
    isAdmin: boolean;
  }
}
