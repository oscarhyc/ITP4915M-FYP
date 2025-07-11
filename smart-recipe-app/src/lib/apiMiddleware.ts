import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateRequest, AuthUser } from './auth';

export type ApiHandler = (
  req: NextApiRequest,
  res: NextApiResponse,
  user: AuthUser | null
) => Promise<void> | void;

/**
 * API middleware that handles common functionality like:
 * - HTTP method validation
 * - Authentication
 * - Error handling
 * - CORS headers
 */
export const apiMiddleware = (
  allowedMethods: string[],
  handler: ApiHandler,
  requireAuth: boolean = true
) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', allowedMethods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Check if method is allowed
    if (!allowedMethods.includes(req.method || '')) {
      res.status(405).json({ error: `Method ${req.method} not allowed` });
      return;
    }

    try {
      let user = null;

      // Check authentication if required
      if (requireAuth) {
        user = await authenticateRequest(req);

        if (!user) {
          res.status(401).json({ error: 'Authentication required' });
          return;
        }
      }

      // Call the actual handler
      await handler(req, res, user);
    } catch (error) {
      console.error('API Error:', error);
      
      // Handle different types of errors
      if (error instanceof Error) {
        if (error.message.includes('validation')) {
          res.status(400).json({ error: error.message });
        } else if (error.message.includes('not found')) {
          res.status(404).json({ error: error.message });
        } else if (error.message.includes('unauthorized')) {
          res.status(403).json({ error: error.message });
        } else {
          res.status(500).json({ error: 'Internal server error' });
        }
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
};

/**
 * Rate limiting middleware (simple in-memory implementation)
 * For production, consider using Redis or a proper rate limiting service
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    const identifier = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const key = `${identifier}-${req.url}`;
    const now = Date.now();
    
    const record = rateLimitMap.get(key);
    
    if (!record || now > record.resetTime) {
      // Reset or create new record
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      next();
    } else if (record.count < maxRequests) {
      // Increment count
      record.count++;
      next();
    } else {
      // Rate limit exceeded
      res.status(429).json({ 
        error: 'Too many requests',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }
  };
};

/**
 * Validation middleware for request body
 */
export const validateBody = (schema: any) => {
  return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    try {
      // Simple validation - in production, use a library like Joi or Yup
      const { error } = schema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }
      next();
    } catch (error) {
      res.status(400).json({ error: 'Invalid request body' });
    }
  };
};

/**
 * Logging middleware
 */
export const logRequest = (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
  const start = Date.now();
  const { method, url } = req;
  
  console.log(`[${new Date().toISOString()}] ${method} ${url} - Started`);
  
  // Override res.end to log completion
  const originalEnd = res.end;
  res.end = function(...args: any[]) {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${method} ${url} - ${res.statusCode} (${duration}ms)`);
    return originalEnd.apply(this, args as any);
  };
  
  next();
};

/**
 * Error handling utility
 */
export const handleApiError = (error: any, res: NextApiResponse) => {
  console.error('API Error:', error);
  
  if (error.name === 'ValidationError') {
    res.status(400).json({ error: error.message });
  } else if (error.name === 'CastError') {
    res.status(400).json({ error: 'Invalid ID format' });
  } else if (error.code === 11000) {
    res.status(409).json({ error: 'Duplicate entry' });
  } else {
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Success response utility
 */
export const sendSuccess = (res: NextApiResponse, data: any, message?: string) => {
  res.status(200).json({
    success: true,
    message: message || 'Operation successful',
    data,
  });
};

/**
 * Pagination utility
 */
export const getPaginationParams = (req: NextApiRequest) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100); // Max 100 items per page
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
};
