import { Request, Response, NextFunction } from 'express';
import { getDB } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { RowDataPacket } from 'mysql2';

// Helper function to safely parse amenities
const parseAmenities = (amenities: any): string[] => {
  if (!amenities) return [];
  
  if (typeof amenities === 'string') {
    // Try to parse as JSON first
    try {
      return JSON.parse(amenities);
    } catch {
      // If JSON parse fails, treat as comma-separated string
      return amenities.split(',').filter(Boolean);
    }
  }
  
  if (Array.isArray(amenities)) {
    return amenities;
  }
  
  return [];
};

interface Listing extends RowDataPacket {
  id: number;
  user_id: number;
  title: string;
  description: string;
  category: string;
  address: string;
  city: string;
  area: number;
  max_guests: number;
  price_per_hour: number;
  price_per_day?: number;
  amenities?: string[];
  rules?: string;
  status: string;
  images?: string[];
  average_rating?: number;
  total_reviews?: number;
  host_name?: string;
  host_avatar?: string;
}

export const createListing = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const {
      title,
      description,
      category,
      address,
      city,
      area,
      maxGuests,
      pricePerHour,
      pricePerDay,
      amenities,
      rules,
      latitude,
      longitude
    } = req.body;

    const db = getDB();

    const [result] = await db.execute(
      `INSERT INTO listings (
        user_id, title, description, category, address, city, 
        latitude, longitude, area, max_guests, price_per_hour, 
        price_per_day, amenities, rules
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        title,
        description,
        category,
        address,
        city,
        latitude || null,
        longitude || null,
        area,
        maxGuests,
        pricePerHour,
        pricePerDay || null,
        JSON.stringify(amenities || []),
        rules || null
      ]
    );

    const listingId = (result as any).insertId;

    res.status(201).json({
      success: true,
      data: { id: listingId }
    });
  } catch (error) {
    next(error);
  }
};

export const getListings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      city,
      category,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      amenities,
      page = 1,
      limit = 20
    } = req.query;

    const db = getDB();
    let whereConditions: string[] = ['l.status = ?'];
    let params: any[] = ['active'];

    if (city) {
      whereConditions.push('l.city = ?');
      params.push(city);
    }

    if (category) {
      whereConditions.push('l.category = ?');
      params.push(category);
    }

    if (minPrice) {
      whereConditions.push('l.price_per_hour >= ?');
      params.push(minPrice);
    }

    if (maxPrice) {
      whereConditions.push('l.price_per_hour <= ?');
      params.push(maxPrice);
    }

    if (minArea) {
      whereConditions.push('l.area >= ?');
      params.push(minArea);
    }

    if (maxArea) {
      whereConditions.push('l.area <= ?');
      params.push(maxArea);
    }

    const offset = (Number(page) - 1) * Number(limit);

    // Minimal query for testing
    const [listings] = await db.execute<Listing[]>(
      `SELECT l.*, u.name as host_name, u.avatar as host_avatar 
       FROM listings l 
       JOIN users u ON l.user_id = u.id 
       WHERE l.status = ? 
       ORDER BY l.created_at DESC 
       LIMIT 5`,
      ['active']
    );

    // Format listings without amenities parsing for now
    const formattedListings = listings.map(listing => ({
      ...listing,
      amenities: [],
      images: [],
      average_rating: 0,
      total_reviews: 0
    }));

    // Get total count
    const [countResult] = await db.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM listings l WHERE l.status = ?`,
      ['active']
    );

    const total = countResult[0].total;

    res.json({
      success: true,
      data: {
        listings: formattedListings,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error in getListings:', error);
    next(error);
  }
};

export const getListingById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const db = getDB();

    const [listings] = await db.execute<Listing[]>(
      `SELECT 
        l.*,
        u.name as host_name,
        u.avatar as host_avatar,
        u.bio as host_bio,
        u.created_at as host_joined,
        u.verified as host_verified,
        GROUP_CONCAT(DISTINCT li.url ORDER BY li.order_index) as images,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(DISTINCT r.id) as total_reviews
      FROM listings l
      JOIN users u ON l.user_id = u.id
      LEFT JOIN listing_images li ON l.id = li.listing_id
      LEFT JOIN reviews r ON l.id = r.listing_id
      WHERE l.id = ?
      GROUP BY l.id`,
      [id]
    );

    if (listings.length === 0) {
      throw new AppError('Listing not found', 404);
    }

    const rawListing = listings[0];
    const listing = {
      ...rawListing,
      amenities: parseAmenities((rawListing.amenities as any)),
      images: rawListing.images ? (rawListing.images as any).split(',') : []
    };

    res.json({
      success: true,
      data: { listing }
    });
  } catch (error) {
    next(error);
  }
};

export const updateListing = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const db = getDB();

    // Check ownership
    const [listings] = await db.execute<RowDataPacket[]>(
      'SELECT user_id FROM listings WHERE id = ?',
      [id]
    );

    if (listings.length === 0) {
      throw new AppError('Listing not found', 404);
    }

    if (listings[0].user_id !== userId) {
      throw new AppError('Unauthorized to update this listing', 403);
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];

    Object.keys(req.body).forEach(key => {
      if (key === 'amenities') {
        updates.push(`${key} = ?`);
        values.push(JSON.stringify(req.body[key]));
      } else if (['title', 'description', 'category', 'address', 'city', 'area', 'maxGuests', 'pricePerHour', 'pricePerDay', 'rules'].includes(key)) {
        updates.push(`${key === 'maxGuests' ? 'max_guests' : key === 'pricePerHour' ? 'price_per_hour' : key === 'pricePerDay' ? 'price_per_day' : key} = ?`);
        values.push(req.body[key]);
      }
    });

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    values.push(id);

    await db.execute(
      `UPDATE listings SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({
      success: true,
      message: 'Listing updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const deleteListing = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const db = getDB();

    // Check ownership
    const [listings] = await db.execute<RowDataPacket[]>(
      'SELECT user_id FROM listings WHERE id = ?',
      [id]
    );

    if (listings.length === 0) {
      throw new AppError('Listing not found', 404);
    }

    if (listings[0].user_id !== userId) {
      throw new AppError('Unauthorized to delete this listing', 403);
    }

    // Soft delete
    await db.execute(
      'UPDATE listings SET status = "deleted" WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Listing deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const uploadImages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.files || !Array.isArray(req.files)) {
      throw new AppError('No images uploaded', 400);
    }

    // Validate file types and sizes
    const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    
    for (const file of req.files) {
      if (!validMimeTypes.includes(file.mimetype)) {
        throw new AppError(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, and WebP are allowed`, 400);
      }
      
      if (file.size > maxFileSize) {
        throw new AppError(`File too large: ${file.originalname}. Maximum size is 5MB`, 400);
      }
    }

    const { id } = req.params;
    const userId = req.user!.id;
    const db = getDB();

    // Check ownership
    const [listings] = await db.execute<RowDataPacket[]>(
      'SELECT user_id FROM listings WHERE id = ?',
      [id]
    );

    if (listings.length === 0) {
      throw new AppError('Listing not found', 404);
    }

    if (listings[0].user_id !== userId) {
      throw new AppError('Unauthorized to upload images to this listing', 403);
    }

    // Get current image count and check limit
    const [imageCount] = await db.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM listing_images WHERE listing_id = ?',
      [id]
    );

    const currentCount = imageCount[0].count;
    const maxImages = 20;
    
    if (currentCount + req.files.length > maxImages) {
      throw new AppError(`Too many images. Maximum ${maxImages} images allowed per listing`, 400);
    }

    let orderIndex = currentCount;

    // In production, upload to S3 and get URLs
    // For now, we'll just store placeholder URLs
    const imageUrls = req.files.map((file, index) => ({
      url: `/uploads/listings/${id}/${Date.now()}-${index}-${file.originalname}`,
      orderIndex: orderIndex + index,
      originalName: file.originalname,
      size: file.size
    }));

    // Use transaction for atomicity
    await db.execute('START TRANSACTION');
    
    try {
      // Insert image records
      for (const image of imageUrls) {
        await db.execute(
          'INSERT INTO listing_images (listing_id, url, order_index) VALUES (?, ?, ?)',
          [id, image.url, image.orderIndex]
        );
      }
      
      await db.execute('COMMIT');
    } catch (dbError) {
      await db.execute('ROLLBACK');
      throw new AppError('Failed to save image records', 500);
    }

    res.json({
      success: true,
      data: { 
        images: imageUrls.map(img => ({
          url: img.url,
          orderIndex: img.orderIndex
        })),
        message: `Successfully uploaded ${req.files.length} image(s)`
      }
    });
  } catch (error) {
    // Clean up uploaded files if database operation failed
    if (req.files && Array.isArray(req.files)) {
      // In production, you'd want to delete files from S3 here
      console.error('Upload failed, would clean up files:', req.files.map(f => f.originalname));
    }
    next(error);
  }
};

export const getUserListings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;
    const db = getDB();

    const [listings] = await db.execute<Listing[]>(
      `SELECT 
        l.*,
        GROUP_CONCAT(DISTINCT li.url) as images,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(DISTINCT r.id) as total_reviews,
        COUNT(DISTINCT b.id) as total_bookings
      FROM listings l
      LEFT JOIN listing_images li ON l.id = li.listing_id
      LEFT JOIN reviews r ON l.id = r.listing_id
      LEFT JOIN bookings b ON l.id = b.listing_id AND b.status = 'completed'
      WHERE l.user_id = ? AND l.status != 'deleted'
      GROUP BY l.id
      ORDER BY l.created_at DESC`,
      [userId]
    );

    const formattedListings = listings.map(listing => ({
      ...listing,
      amenities: parseAmenities((listing.amenities as any)),
      images: listing.images ? (listing.images as any).split(',') : []
    }));

    res.json({
      success: true,
      data: { listings: formattedListings }
    });
  } catch (error) {
    next(error);
  }
};