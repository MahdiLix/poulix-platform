export interface JwtPayload {
  sub: string;
  email: string;
  sid?: string;
  exp?: number;
}
