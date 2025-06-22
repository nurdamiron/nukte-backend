import { Request, Response, NextFunction } from 'express';
import { getDB } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { RowDataPacket } from 'mysql2';

interface UserProfile extends RowDataPacket {
  id: number;
  name: string;
  avatar?: string;
  verified: boolean;
  created_at: Date;
  listings_count?: number;
  average_rating?: number;
  total_reviews?: number;
}

export const getUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const db = getDB();

    // Get user with stats
    const [users] = await db.execute<UserProfile[]>(
      `SELECT 
        u.id,
        u.name,
        u.avatar,
        u.bio,
        u.location,
        u.verified,
        u.created_at,
        COUNT(DISTINCT l.id) as listings_count,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(DISTINCT r.id) as total_reviews
      FROM users u
      LEFT JOIN listings l ON u.id = l.user_id AND l.status = 'active'
      LEFT JOIN reviews r ON u.id = r.reviewed_id
      WHERE u.id = ?
      GROUP BY u.id`,
      [id]
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

export const uploadAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const userId = req.user!.id;
    const db = getDB();

    // In production, upload to S3 and get URL
    // For now, we'll just store a placeholder URL
    const avatarUrl = `/uploads/avatars/${userId}-${Date.now()}.jpg`;

    await db.execute(
      'UPDATE users SET avatar = ? WHERE id = ?',
      [avatarUrl, userId]
    );

    res.json({
      success: true,
      data: { avatar: avatarUrl }
    });
  } catch (error) {
    next(error);
  }
};