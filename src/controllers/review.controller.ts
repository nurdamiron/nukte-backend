import { Request, Response, NextFunction } from 'express';
import { getDB } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { RowDataPacket } from 'mysql2';

interface Review extends RowDataPacket {
  id: number;
  rating: number;
  comment: string;
  reviewer_name: string;
  reviewer_avatar: string;
  created_at: Date;
}

export const createReview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const reviewerId = req.user!.id;
    const { bookingId, rating, comment } = req.body;
    const db = getDB();

    // Get booking details
    const [bookings] = await db.execute<RowDataPacket[]>(
      `SELECT 
        b.listing_id,
        b.guest_id,
        b.host_id,
        b.status,
        b.date
      FROM bookings b
      WHERE b.id = ? AND (b.guest_id = ? OR b.host_id = ?)`,
      [bookingId, reviewerId, reviewerId]
    );

    if (bookings.length === 0) {
      throw new AppError('Booking not found', 404);
    }

    const booking = bookings[0];

    // Check if booking is completed
    if (booking.status !== 'completed') {
      throw new AppError('Can only review completed bookings', 400);
    }

    // Check if booking date has passed
    const bookingDate = new Date(booking.date);
    if (bookingDate > new Date()) {
      throw new AppError('Cannot review future bookings', 400);
    }

    // Check if review already exists
    const [existingReviews] = await db.execute<RowDataPacket[]>(
      'SELECT id FROM reviews WHERE booking_id = ? AND reviewer_id = ?',
      [bookingId, reviewerId]
    );

    if (existingReviews.length > 0) {
      throw new AppError('You have already reviewed this booking', 400);
    }

    // Determine reviewer type and reviewed user
    const reviewerType = booking.guest_id === reviewerId ? 'guest' : 'host';
    const reviewedId = reviewerType === 'guest' ? booking.host_id : booking.guest_id;

    // Create review
    const [result] = await db.execute(
      `INSERT INTO reviews (
        listing_id, booking_id, reviewer_id, reviewed_id,
        rating, comment, reviewer_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        booking.listing_id,
        bookingId,
        reviewerId,
        reviewedId,
        rating,
        comment || null,
        reviewerType
      ]
    );

    res.status(201).json({
      success: true,
      data: { id: (result as any).insertId }
    });
  } catch (error) {
    next(error);
  }
};

export const getListingReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { listingId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const db = getDB();

    const offset = ((Number(page)) - 1) * (Number(limit));

    // Get reviews
    const [reviews] = await db.execute<Review[]>(
      `SELECT 
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        u.name as reviewer_name,
        u.avatar as reviewer_avatar,
        r.reviewer_type
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      WHERE r.listing_id = ?
      ORDER BY r.created_at DESC
      LIMIT ${Number(limit)} OFFSET ${offset}`,
      [listingId]
    );

    // Get total count and average rating
    const [stats] = await db.execute<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total,
        COALESCE(AVG(rating), 0) as average_rating
      FROM reviews
      WHERE listing_id = ?`,
      [listingId]
    );

    res.json({
      success: true,
      data: {
        reviews,
        stats: {
          total: stats[0].total,
          averageRating: parseFloat(stats[0].average_rating)
        },
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: stats[0].total,
          totalPages: Math.ceil(stats[0].total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error in getListingReviews:', error);
    next(error);
  }
};

export const getUserReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;
    const { type = 'received' } = req.query; // 'received' or 'given'
    const db = getDB();

    const column = type === 'received' ? 'reviewed_id' : 'reviewer_id';

    // Get reviews
    const [reviews] = await db.execute<Review[]>(
      `SELECT 
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        r.reviewer_type,
        u.name as ${type === 'received' ? 'reviewer_name' : 'reviewed_name'},
        u.avatar as ${type === 'received' ? 'reviewer_avatar' : 'reviewed_avatar'},
        l.title as listing_title
      FROM reviews r
      JOIN users u ON r.${type === 'received' ? 'reviewer_id' : 'reviewed_id'} = u.id
      JOIN listings l ON r.listing_id = l.id
      WHERE r.${column} = ?
      ORDER BY r.created_at DESC`,
      [userId]
    );

    // Get stats
    const [stats] = await db.execute<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total,
        COALESCE(AVG(rating), 0) as average_rating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
      FROM reviews
      WHERE ${column} = ?`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        reviews,
        stats: {
          total: stats[0].total,
          averageRating: parseFloat(stats[0].average_rating),
          distribution: {
            5: stats[0].five_star || 0,
            4: stats[0].four_star || 0,
            3: stats[0].three_star || 0,
            2: stats[0].two_star || 0,
            1: stats[0].one_star || 0
          }
        }
      }
    });
  } catch (error) {
    next(error);
  }
};