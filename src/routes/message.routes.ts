import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  sendMessage,
  getMessagesByBooking,
  getConversations,
  markAsRead,
  getUnreadCount
} from '../controllers/message.controller';

const router = Router();

// All message routes require authentication
router.use(authenticate);

// Send a new message
router.post('/', sendMessage);

// Get all messages for a booking
router.get('/booking/:bookingId', getMessagesByBooking);

// Get all conversations for the current user
router.get('/conversations', getConversations);

// Mark messages as read
router.put('/read/:messageId', markAsRead);
router.put('/read/booking/:bookingId', markAsRead);

// Get unread message count
router.get('/unread/count', getUnreadCount);

export default router;