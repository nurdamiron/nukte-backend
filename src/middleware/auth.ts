import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDB } from '../config/database';
import { AppError } from './errorHandler';

interface JwtPayload {
  id: number;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new AppError('No token provided', 401);
    }

    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    
    const decoded = jwt.verify(token, secret) as JwtPayload;

    // Verify user exists
    const db = getDB();
    const [users] = await db.execute(
      'SELECT id, email, role FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!Array.isArray(users) || users.length === 0) {
      throw new AppError('User not found', 401);
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Invalid token', 401));
    }
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }

    // Check if user has required role (including "both" logic)
    const hasRole = roles.some(role => {
      if (req.user!.role === 'admin') return true;
      if (req.user!.role === role) return true;
      if (req.user!.role === 'both' && (role === 'host' || role === 'guest')) return true;
      return false;
    });

    if (!hasRole) {
      return next(new AppError('Forbidden', 403));
    }

    next();
  };
};

export const requireVerified = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }

    const db = getDB();
    const [users] = await db.execute(
      'SELECT verified FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!Array.isArray(users) || users.length === 0) {
      return next(new AppError('User not found', 401));
    }

    const user = users[0] as { verified: boolean };
    if (!user.verified) {
      return next(new AppError('Email verification required', 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};