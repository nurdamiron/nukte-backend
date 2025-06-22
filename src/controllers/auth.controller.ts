import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDB } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { RowDataPacket } from 'mysql2';

interface User extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  password: string;
  role: string;
  avatar?: string;
  verified: boolean;
}

const generateToken = (user: { id: number; email: string; role: string }): string => {
  const payload = { id: user.id, email: user.email, role: user.role };
  const secret = process.env.JWT_SECRET || 'secret';
  const options = { expiresIn: process.env.JWT_EXPIRES_IN || '7d' };
  
  return jwt.sign(payload, secret, options);
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password, phone, role } = req.body;
    const db = getDB();

    // Check if user exists
    const [existingUsers] = await db.execute<User[]>(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      throw new AppError('User already exists with this email', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await db.execute(
      'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, phone || null, role || 'guest']
    );

    const userId = (result as any).insertId;

    // Generate token
    const token = generateToken({ id: userId, email, role: role || 'guest' });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: userId,
          name,
          email,
          role: role || 'guest'
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;
    const db = getDB();

    // Find user
    const [users] = await db.execute<User[]>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      throw new AppError('Invalid credentials', 401);
    }

    const user = users[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          verified: user.verified
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const db = getDB();

    const [users] = await db.execute<User[]>(
      'SELECT id, name, email, phone, role, avatar, bio, location, verified, verification_status, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: { user: users[0] }
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { name, phone, bio, location } = req.body;
    const db = getDB();

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (bio !== undefined) {
      updates.push('bio = ?');
      values.push(bio);
    }
    if (location !== undefined) {
      updates.push('location = ?');
      values.push(location);
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    values.push(userId);

    await db.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Get updated user
    const [users] = await db.execute<User[]>(
      'SELECT id, name, email, phone, role, avatar, bio, location, verified FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      data: { user: users[0] }
    });
  } catch (error) {
    next(error);
  }
};