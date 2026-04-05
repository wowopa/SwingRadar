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
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface AccountSessionItem {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  clientLabel: string;
  isCurrent: boolean;
}
