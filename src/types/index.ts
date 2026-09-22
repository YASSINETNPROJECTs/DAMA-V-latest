// Shared types used across the DAMA codebase.

export type Role = "PLAYER" | "MODERATOR" | "ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED" | "BANNED";

/** Safe user shape — never includes passwordHash. */
export interface PublicUser {
  id: string;
  username: string;
  email: string;
  country: string | null;
  image: string | null;
  bio: string;
  level: number;
  rating: number;
  xp: number;
  role: Role;
  status: UserStatus;
  createdAt: Date;
}

export interface AuthFormState {
  error?: string;
  success?: boolean;
}
