import { Request, Response, NextFunction } from 'express';
import { getDB } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { RowDataPacket } from 'mysql2';

interface Booking extends RowDataPacket {
  id: number;
  listing_id: number;
  guest_id: number;
  host_id: number;
  date: string;
  start_time: string;
  end_time: string;
  guests_count: number;
  total_price: number;
  service_fee: number;
  status: string;
  listing_title?: string;
  listing_image?: string;
  listing_location?: string;
  host_name?: string;
  guest_name?: string;
}

export const createBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const guestId = req.user!.id;
    const { listingId, date, startTime, endTime, guestsCount, message } = req.body;
    const db = getDB();

    // Get listing details
    const [listings] = await db.execute<RowDataPacket[]>(
      'SELECT user_id, price_per_hour, max_guests FROM listings WHERE id = ? AND status = "active"',
      [listingId]
    );

    if (listings.length === 0) {
      throw new AppError('Listing not found or not available', 404);
    }

    const listing = listings[0];

    if (listing.user_id === guestId) {
      throw new AppError('You cannot book your own listing', 400);
    }

    if (guestsCount > listing.max_guests) {
      throw new AppError(`Maximum ${listing.max_guests} guests allowed`, 400);
    }

    // Check availability
    const [existingBookings] = await db.execute<RowDataPacket[]>(
      `SELECT id FROM bookings 
      WHERE listing_id = ? AND date = ? AND status IN ('confirmed', 'pending')
      AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?) OR (start_time >= ? AND end_time <= ?))`,
      [listingId, date, startTime, startTime, endTime, endTime, startTime, endTime]
    );

    if (existingBookings.length > 0) {
      throw new AppError('This time slot is not available', 400);
    }

    // Calculate price
    const startHour = parseInt(startTime.split(':')[0]);
    const endHour = parseInt(endTime.split(':')[0]);
    const hours = endHour - startHour;
    const totalPrice = hours * listing.price_per_hour;
    const serviceFee = totalPrice * 0.1; // 10% service fee

    // Create booking
    const [result] = await db.execute(
      `INSERT INTO bookings (
        listing_id, guest_id, host_id, date, start_time, end_time,
        guests_count, total_price, service_fee, guest_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        listingId,
        guestId,
        listing.user_id,
        date,
        startTime,
        endTime,
        guestsCount,
        totalPrice,
        serviceFee,
        message || null
      ]
    );

    const bookingId = (result as any).insertId;

    res.status(201).json({
      success: true,
      data: {
        id: bookingId,
        totalPrice: totalPrice + serviceFee
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { role, status } = req.query;
    const db = getDB();

    let whereConditions = [];
    let params = [];

    if (role === 'guest') {
      whereConditions.push('b.guest_id = ?');
      params.push(userId);
    } else if (role === 'host') {
      whereConditions.push('b.host_id = ?');
      params.push(userId);
    } else {
      whereConditions.push('(b.guest_id = ? OR b.host_id = ?)');
      params.push(userId, userId);
    }

    if (status) {
      whereConditions.push('b.status = ?');
      params.push(status);
    }

    const whereClause = whereConditions.join(' AND ');

    const [bookings] = await db.execute<Booking[]>(
      `SELECT 
        b.*,
        l.title as listing_title,
        l.address as listing_location,
        li.url as listing_image,
        uh.name as host_name,
        uh.avatar as host_avatar,
        ug.name as guest_name,
        ug.avatar as guest_avatar
      FROM bookings b
      JOIN listings l ON b.listing_id = l.id
      LEFT JOIN listing_images li ON l.id = li.listing_id AND li.is_primary = 1
      JOIN users uh ON b.host_id = uh.id
      JOIN users ug ON b.guest_id = ug.id
      WHERE ${whereClause}
      ORDER BY b.created_at DESC`,
      params
    );

    res.json({
      success: true,
      data: { bookings }
    });
  } catch (error) {
    next(error);
  }
};

export const getBookingById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const db = getDB();

    const [bookings] = await db.execute<Booking[]>(
      `SELECT 
        b.*,
        l.title as listing_title,
        l.address as listing_location,
        l.city as listing_city,
        l.price_per_hour,
        li.url as listing_image,
        uh.name as host_name,
        uh.avatar as host_avatar,
        uh.phone as host_phone,
        ug.name as guest_name,
        ug.avatar as guest_avatar,
        ug.phone as guest_phone
      FROM bookings b
      JOIN listings l ON b.listing_id = l.id
      LEFT JOIN listing_images li ON l.id = li.listing_id AND li.is_primary = 1
      JOIN users uh ON b.host_id = uh.id
      JOIN users ug ON b.guest_id = ug.id
      WHERE b.id = ? AND (b.guest_id = ? OR b.host_id = ?)`,
      [id, userId, userId]
    );

    if (bookings.length === 0) {
      throw new AppError('Booking not found', 404);
    }

    res.json({
      success: true,
      data: { booking: bookings[0] }
    });
  } catch (error) {
    next(error);
  }
};

export const updateBookingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const userId = req.user!.id;
    const db = getDB();

    // Get booking details
    const [bookings] = await db.execute<RowDataPacket[]>(
      'SELECT host_id, guest_id, status as current_status FROM bookings WHERE id = ?',
      [id]
    );

    if (bookings.length === 0) {
      throw new AppError('Booking not found', 404);
    }

    const booking = bookings[0];

    // Check permissions
    if (status === 'confirmed' && booking.host_id !== userId) {
      throw new AppError('Only host can confirm bookings', 403);
    }

    if (booking.current_status !== 'pending') {
      throw new AppError('Can only update pending bookings', 400);
    }

    // Update booking
    const updates = ['status = ?'];
    const values = [status];

    if (status === 'cancelled') {
      updates.push('cancelled_by = ?', 'cancellation_reason = ?');
      values.push(userId, reason || null);
    }

    values.push(id);

    await db.execute(
      `UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({
      success: true,
      message: `Booking ${status} successfully`
    });
  } catch (error) {
    next(error);
  }
};

export const getBookingMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const db = getDB();

    // Verify access
    const [bookings] = await db.execute<RowDataPacket[]>(
      'SELECT guest_id, host_id FROM bookings WHERE id = ?',
      [id]
    );

    if (bookings.length === 0) {
      throw new AppError('Booking not found', 404);
    }

    const booking = bookings[0];
    if (booking.guest_id !== userId && booking.host_id !== userId) {
      throw new AppError('Unauthorized to view these messages', 403);
    }

    // Get messages
    const [messages] = await db.execute<RowDataPacket[]>(
      `SELECT 
        m.*,
        u.name as sender_name,
        u.avatar as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.booking_id = ?
      ORDER BY m.created_at ASC`,
      [id]
    );

    // Mark messages as read
    await db.execute(
      'UPDATE messages SET is_read = TRUE WHERE booking_id = ? AND receiver_id = ?',
      [id, userId]
    );

    res.json({
      success: true,
      data: { messages }
    });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const senderId = req.user!.id;
    const db = getDB();

    // Get booking details
    const [bookings] = await db.execute<RowDataPacket[]>(
      'SELECT guest_id, host_id FROM bookings WHERE id = ?',
      [id]
    );

    if (bookings.length === 0) {
      throw new AppError('Booking not found', 404);
    }

    const booking = bookings[0];
    
    if (booking.guest_id !== senderId && booking.host_id !== senderId) {
      throw new AppError('Unauthorized to send messages to this booking', 403);
    }

    const receiverId = booking.guest_id === senderId ? booking.host_id : booking.guest_id;

    // Insert message
    const [result] = await db.execute(
      'INSERT INTO messages (booking_id, sender_id, receiver_id, message) VALUES (?, ?, ?, ?)',
      [id, senderId, receiverId, message]
    );

    const messageId = (result as any).insertId;

    res.status(201).json({
      success: true,
      data: {
        id: messageId,
        message,
        senderId,
        createdAt: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};