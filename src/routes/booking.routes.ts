import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createBooking,
  getBookings,
  getBookingById,
  updateBookingStatus,
  getBookingMessages,
  sendMessage
} from '../controllers/booking.controller';

const router = Router();

// Get user's bookings
router.get('/', authenticate, getBookings);

// Get booking details
router.get('/:id', authenticate, getBookingById);

// Create booking request
router.post(
  '/',
  authenticate,
  [
    body('listingId').isInt().withMessage('Listing ID is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
    body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time is required'),
    body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid end time is required'),
    body('guestsCount').isInt({ min: 1 }).withMessage('Guests count must be at least 1'),
    body('message').optional().isString()
  ],
  validate,
  createBooking
);

// Update booking status (host action)
router.patch(
  '/:id/status',
  authenticate,
  [
    body('status').isIn(['confirmed', 'cancelled']).withMessage('Invalid status'),
    body('reason').optional().isString()
  ],
  validate,
  updateBookingStatus
);

// Get booking messages
router.get('/:id/messages', authenticate, getBookingMessages);

// Send message
router.post(
  '/:id/messages',
  authenticate,
  [
    body('message').notEmpty().withMessage('Message is required')
  ],
  validate,
  sendMessage
);

export default router;