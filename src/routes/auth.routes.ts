import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, getMe, updateProfile } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// Register
router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['guest', 'host', 'both']).withMessage('Invalid role')
  ],
  validate,
  register
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validate,
  login
);

// Get current user
router.get('/me', authenticate, getMe);

// Update profile
router.put(
  '/profile',
  authenticate,
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number'),
    body('bio').optional().isLength({ max: 500 }).withMessage('Bio too long'),
    body('location').optional().notEmpty().withMessage('Location cannot be empty')
  ],
  validate,
  updateProfile
);

export default router;