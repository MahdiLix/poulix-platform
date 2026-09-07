export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'DISABLED' | 'LOCKED';
  sessionId?: string;
}
