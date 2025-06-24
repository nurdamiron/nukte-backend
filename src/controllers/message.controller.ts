import { Request, Response, NextFunction } from 'express';
import { getDB } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface Message extends RowDataPacket {
  id: number;
  booking_id: number;
  sender_id: number;
  receiver_id: number;
  message: string;
  is_read: boolean;
  created_at: Date;
  sender_name?: string;
  sender_avatar?: string;
}

export const sendMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { bookingId, text } = req.body;
    const senderId = req.user!.id;
    const db = getDB();

    // Verify user is part of this booking
    const [bookings] = await db.execute<RowDataPacket[]>(
      `SELECT b.*, l.user_id as host_id 
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       WHERE b.id = ? AND (b.guest_id = ? OR l.user_id = ?)`,
      [bookingId, senderId, senderId]
    );

    if (bookings.length === 0) {
      throw new AppError('You are not authorized to send messages in this booking', 403);
    }

    // Get receiver_id (the other person in the booking)
    const booking = bookings[0];
    const receiverId = booking.guest_id === senderId ? booking.host_id : booking.guest_id;

    // Insert message
    const [result] = await db.execute<ResultSetHeader>(
      'INSERT INTO messages (booking_id, sender_id, receiver_id, message) VALUES (?, ?, ?, ?)',
      [bookingId, senderId, receiverId, text]
    );

    // Get the created message
    const [messages] = await db.execute<Message[]>(
      `SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: { message: messages[0] }
    });
  } catch (error) {
    next(error);
  }
};

export const getMessagesByBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user!.id;
    const db = getDB();

    // Verify user is part of this booking
    const [bookings] = await db.execute<RowDataPacket[]>(
      `SELECT b.*, l.user_id as host_id 
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       WHERE b.id = ? AND (b.guest_id = ? OR l.user_id = ?)`,
      [bookingId, userId, userId]
    );

    if (bookings.length === 0) {
      throw new AppError('You are not authorized to view messages in this booking', 403);
    }

    // Get messages
    const [messages] = await db.execute<Message[]>(
      `SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.booking_id = ?
       ORDER BY m.created_at ASC`,
      [bookingId]
    );

    res.json({
      success: true,
      data: { messages }
    });
  } catch (error) {
    next(error);
  }
};

export const getConversations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const db = getDB();

    // Get all bookings with latest message
    const [conversations] = await db.execute<RowDataPacket[]>(
      `SELECT 
        b.id as booking_id,
        b.date,
        b.status,
        l.id as listing_id,
        l.title as listing_title,
        (SELECT GROUP_CONCAT(url) FROM listing_images WHERE listing_id = l.id LIMIT 3) as listing_images,
        u.id as other_user_id,
        u.name as other_user_name,
        u.avatar as other_user_avatar,
        CASE 
          WHEN b.guest_id = ? THEN 'guest'
          ELSE 'host'
        END as user_role,
        (
          SELECT COUNT(*)
          FROM messages m
          WHERE m.booking_id = b.id 
          AND m.sender_id != ?
          AND m.is_read = 0
        ) as unread_count,
        (
          SELECT m.message
          FROM messages m
          WHERE m.booking_id = b.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) as last_message_text,
        (
          SELECT m.created_at
          FROM messages m
          WHERE m.booking_id = b.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) as last_message_time
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       JOIN users u ON (
         CASE 
           WHEN b.guest_id = ? THEN l.user_id = u.id
           ELSE b.guest_id = u.id
         END
       )
       WHERE (b.guest_id = ? OR l.user_id = ?)
       AND EXISTS (
         SELECT 1 FROM messages m WHERE m.booking_id = b.id
       )
       ORDER BY last_message_time DESC`,
      [userId, userId, userId, userId, userId]
    );

    // Parse images string to array
    conversations.forEach(conv => {
      if (conv.listing_images) {
        conv.listing_images = conv.listing_images.split(',');
      } else {
        conv.listing_images = [];
      }
    });

    res.json({
      success: true,
      data: { conversations }
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { messageId, bookingId } = req.params;
    const userId = req.user!.id;
    const db = getDB();

    if (messageId) {
      // Mark single message as read
      await db.execute(
        `UPDATE messages m
         JOIN bookings b ON m.booking_id = b.id
         JOIN listings l ON b.listing_id = l.id
         SET m.is_read = 1
         WHERE m.id = ? 
         AND m.sender_id != ?
         AND (b.guest_id = ? OR l.user_id = ?)`,
        [messageId, userId, userId, userId]
      );
    } else if (bookingId) {
      // Mark all messages in booking as read
      await db.execute(
        `UPDATE messages m
         JOIN bookings b ON m.booking_id = b.id
         JOIN listings l ON b.listing_id = l.id
         SET m.is_read = 1
         WHERE m.booking_id = ? 
         AND m.sender_id != ?
         AND (b.guest_id = ? OR l.user_id = ?)`,
        [bookingId, userId, userId, userId]
      );
    }

    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const db = getDB();

    const [result] = await db.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as count
       FROM messages m
       JOIN bookings b ON m.booking_id = b.id
       JOIN listings l ON b.listing_id = l.id
       WHERE m.sender_id != ?
       AND m.is_read = 0
       AND (b.guest_id = ? OR l.user_id = ?)`,
      [userId, userId, userId]
    );

    res.json({
      success: true,
      data: { unreadCount: result[0].count }
    });
  } catch (error) {
    next(error);
  }
};