import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, getMe, updateProfile, refreshToken, logout, forgotPassword, resetPassword, sendVerificationCode, verifyEmail } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authLimiter, emailLimiter } from '../middleware/rateLimiter';

const router = Router();

// Register
router.post(
  '/register',
  authLimiter,
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
  authLimiter,
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

// Refresh token
router.post(
  '/refresh',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required')
  ],
  validate,
  refreshToken
);

// Logout
router.post('/logout', authenticate, logout);

// Forgot password
router.post(
  '/forgot-password',
  emailLimiter,
  [
    body('email').isEmail().withMessage('Invalid email')
  ],
  validate,
  forgotPassword
);

// Reset password
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  validate,
  resetPassword
);

// Send verification code
router.post('/send-verification', authenticate, emailLimiter, sendVerificationCode);

// Verify email
router.post(
  '/verify-email',
  authenticate,
  [
    body('code').isLength({ min: 6, max: 6 }).withMessage('Verification code must be 6 digits')
  ],
  validate,
  verifyEmail
);

export default router;