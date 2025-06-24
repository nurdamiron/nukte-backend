import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { getDB } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { RowDataPacket } from 'mysql2';
import { emailService } from '../services/email.service';

interface User extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  password: string;
  role: string;
  avatar?: string;
  verified: boolean;
}

const generateTokens = (user: { id: number; email: string; role: string }) => {
  const payload = { id: user.id, email: user.email, role: user.role };
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  const accessToken = jwt.sign(payload, secret, { expiresIn: '15m' } as SignOptions);
  const refreshToken = jwt.sign(payload, secret, { expiresIn: '7d' } as SignOptions);
  
  return { accessToken, refreshToken };
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

    // Generate tokens
    const tokens = generateTokens({ id: userId, email, role: role || 'guest' });

    // Send verification email automatically
    try {
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      await db.execute(
        'INSERT INTO email_verification_codes (user_id, code, expires_at) VALUES (?, ?, ?)',
        [userId, verificationCode, expiresAt]
      );

      await emailService.sendVerificationEmail(email, verificationCode, name);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails
    }

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: userId,
          name,
          email,
          role: role || 'guest',
          verified: false
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
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

    // Generate tokens
    const tokens = generateTokens({
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
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
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

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError("Refresh token is required", 400);
    }

    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    
    try {
      const decoded = jwt.verify(refreshToken, secret) as any;
      
      // Generate new tokens
      const tokens = generateTokens({
        id: decoded.id,
        email: decoded.email,
        role: decoded.role
      });

      res.json({
        success: true,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
        }
      });
    } catch (error) {
      throw new AppError("Invalid refresh token", 401);
    }
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // In a real app, you might want to blacklist the token here
    res.json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;
    const db = getDB();

    // Find user by email
    const [users] = await db.execute<User[]>(
      'SELECT id, name, email FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      // Don't reveal if user exists or not for security
      res.json({
        success: true,
        message: 'Если аккаунт с таким email существует, инструкции для восстановления пароля будут отправлены на него'
      });
      return;
    }

    const user = users[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Delete any existing reset tokens for this user
    await db.execute(
      'DELETE FROM password_reset_tokens WHERE user_id = ?',
      [user.id]
    );

    // Save reset token
    await db.execute(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, resetToken, expiresAt]
    );

    // Send email
    await emailService.sendPasswordResetEmail(user.email, resetToken, user.name);

    res.json({
      success: true,
      message: 'Если аккаунт с таким email существует, инструкции для восстановления пароля будут отправлены на него'
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, password } = req.body;
    const db = getDB();

    // Find valid reset token
    const [resetTokens] = await db.execute<RowDataPacket[]>(
      `SELECT rt.*, u.id as user_id, u.email, u.name 
       FROM password_reset_tokens rt 
       JOIN users u ON rt.user_id = u.id 
       WHERE rt.token = ? AND rt.expires_at > NOW() AND rt.used = FALSE`,
      [token]
    );

    if (resetTokens.length === 0) {
      throw new AppError('Неверный или истекший токен для сброса пароля', 400);
    }

    const resetToken = resetTokens[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password
    await db.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, resetToken.user_id]
    );

    // Mark token as used
    await db.execute(
      'UPDATE password_reset_tokens SET used = TRUE WHERE id = ?',
      [resetToken.id]
    );

    res.json({
      success: true,
      message: 'Пароль успешно изменен'
    });
  } catch (error) {
    next(error);
  }
};

export const sendVerificationCode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const db = getDB();

    // Get user info
    const [users] = await db.execute<User[]>(
      'SELECT id, name, email, verified FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      throw new AppError('Пользователь не найден', 404);
    }

    const user = users[0];

    if (user.verified) {
      throw new AppError('Email уже подтвержден', 400);
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Delete any existing codes for this user
    await db.execute(
      'DELETE FROM email_verification_codes WHERE user_id = ?',
      [userId]
    );

    // Save verification code
    await db.execute(
      'INSERT INTO email_verification_codes (user_id, code, expires_at) VALUES (?, ?, ?)',
      [userId, verificationCode, expiresAt]
    );

    // Send email
    await emailService.sendVerificationEmail(user.email, verificationCode, user.name);

    res.json({
      success: true,
      message: 'Код подтверждения отправлен на ваш email'
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { code } = req.body;
    const db = getDB();

    // Find valid verification code
    const [verificationCodes] = await db.execute<RowDataPacket[]>(
      `SELECT * FROM email_verification_codes 
       WHERE user_id = ? AND code = ? AND expires_at > NOW() AND used = FALSE`,
      [userId, code]
    );

    if (verificationCodes.length === 0) {
      // Increment attempts
      await db.execute(
        'UPDATE email_verification_codes SET attempts = attempts + 1 WHERE user_id = ? AND code = ?',
        [userId, code]
      );

      throw new AppError('Неверный или истекший код подтверждения', 400);
    }

    const verificationCode = verificationCodes[0];

    // Check attempts limit
    if (verificationCode.attempts >= 3) {
      throw new AppError('Превышено количество попыток. Запросите новый код', 400);
    }

    // Mark user as verified
    await db.execute(
      'UPDATE users SET verified = TRUE, verification_status = ? WHERE id = ?',
      ['verified', userId]
    );

    // Mark code as used
    await db.execute(
      'UPDATE email_verification_codes SET used = TRUE WHERE id = ?',
      [verificationCode.id]
    );

    // Get updated user info
    const [users] = await db.execute<User[]>(
      'SELECT id, name, email, verified, verification_status FROM users WHERE id = ?',
      [userId]
    );

    // Send welcome email
    await emailService.sendWelcomeEmail(users[0].email, users[0].name);

    res.json({
      success: true,
      message: 'Email успешно подтвержден',
      data: { user: users[0] }
    });
  } catch (error) {
    next(error);
  }
};
