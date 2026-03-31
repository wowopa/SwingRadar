export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  sessionId: string;
  user: AuthUser;
  expiresAt: string;
}
