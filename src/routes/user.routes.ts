import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getUserProfile, uploadAvatar } from '../controllers/user.controller';
import multer from 'multer';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get user profile
router.get('/:id', getUserProfile);

// Upload avatar
router.post(
  '/avatar',
  authenticate,
  upload.single('avatar'),
  uploadAvatar
);

export default router;