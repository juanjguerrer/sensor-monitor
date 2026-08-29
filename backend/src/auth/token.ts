import jwt from 'jsonwebtoken';
import { InvalidTokenError } from './errors';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined');
}

const JWT_SECRET = process.env.JWT_SECRET;
export function sign(userId: number): string {
  const payload = { userId };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
  return token;
}

export function verify(token: string): { userId: number } {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (typeof payload !== 'object' || payload === null || typeof payload.userId !== 'number') {
      throw new InvalidTokenError();
    }
    return { userId: payload.userId };
  } catch {
    throw new InvalidTokenError();
  }
}