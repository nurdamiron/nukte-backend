import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createReview,
  getListingReviews,
  getUserReviews
} from '../controllers/review.controller';

const router = Router();

// Get reviews for a listing
router.get('/listing/:listingId', getListingReviews);

// Get reviews for a user
router.get('/user/:userId', getUserReviews);

// Create a review
router.post(
  '/',
  authenticate,
  [
    body('bookingId').isInt().withMessage('Booking ID is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').optional().isString()
  ],
  validate,
  createReview
);

export default router;