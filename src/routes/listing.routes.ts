import { Router } from 'express';
import { body, query } from 'express-validator';
import { authenticate, authorize, requireVerified } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { uploadLimiter } from '../middleware/rateLimiter';
import {
  createListing,
  getListings,
  getListingById,
  updateListing,
  deleteListing,
  uploadImages,
  getUserListings
} from '../controllers/listing.controller';
import multer from 'multer';

const router = Router();

const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get all listings with filters
router.get(
  '/',
  [
    query('city').optional().isString(),
    query('category').optional().isString(),
    query('minPrice').optional().isNumeric(),
    query('maxPrice').optional().isNumeric(),
    query('minArea').optional().isNumeric(),
    query('maxArea').optional().isNumeric(),
    query('amenities').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ],
  validate,
  getListings
);

// Get user's listings
router.get(
  '/user/:userId',
  getUserListings
);

// Get single listing
router.get('/:id', getListingById);

// Create listing (host only)
router.post(
  '/',
  authenticate,
  requireVerified,
  authorize('host', 'both'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').isLength({ min: 50 }).withMessage('Description must be at least 50 characters'),
    body('category').notEmpty().withMessage('Category is required'),
    body('address').notEmpty().withMessage('Address is required'),
    body('city').notEmpty().withMessage('City is required'),
    body('area').isInt({ min: 1 }).withMessage('Area must be a positive number'),
    body('maxGuests').isInt({ min: 1 }).withMessage('Max guests must be a positive number'),
    body('pricePerHour').isNumeric().withMessage('Price per hour is required'),
    body('amenities').optional().isArray(),
    body('rules').optional().isString()
  ],
  validate,
  createListing
);

// Update listing
router.put(
  '/:id',
  authenticate,
  requireVerified,
  authorize('host', 'both'),
  [
    body('title').optional().notEmpty(),
    body('description').optional().isLength({ min: 50 }),
    body('pricePerHour').optional().isNumeric(),
    body('pricePerDay').optional().isNumeric()
  ],
  validate,
  updateListing
);

// Delete listing
router.delete(
  '/:id',
  authenticate,
  authorize('host', 'both'),
  deleteListing
);

// Upload images
router.post(
  '/:id/images',
  authenticate,
  requireVerified,
  authorize('host', 'both'),
  uploadLimiter,
  upload.array('images', 20),
  uploadImages
);

export default router;