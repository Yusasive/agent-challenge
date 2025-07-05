import { enableRateLimiting, maxRequestsPerMinute } from "../config";
import { RateLimiter, createSecureLogger } from "../utils/input-validation";

const logger = createSecureLogger();
const rateLimiter = new RateLimiter(maxRequestsPerMinute);

// Security middleware for request validation
export const securityMiddleware = {
  // Rate limiting middleware
  rateLimit: (req: any, res: any, next: any) => {
    if (!enableRateLimiting) {
      return next();
    }

    const identifier = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (!rateLimiter.isAllowed(identifier)) {
      const remaining = rateLimiter.getRemainingRequests(identifier);
      logger.warn('Rate limit exceeded', { 
        identifier: identifier.substring(0, 10) + '...', // Partial IP for privacy
        remaining 
      });
      
      return res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: 60
      });
    }

    next();
  },

  // Input validation middleware
  validateInput: (req: any, res: any, next: any) => {
    try {
      // Validate content type
      if (req.method === 'POST' && !req.headers['content-type']?.includes('application/json')) {
        return res.status(400).json({
          error: 'Invalid content type',
          message: 'Content-Type must be application/json'
        });
      }

      // Validate request size
      const contentLength = parseInt(req.headers['content-length'] || '0');
      if (contentLength > 1024 * 1024) { // 1MB limit
        return res.status(413).json({
          error: 'Request too large',
          message: 'Request body exceeds maximum size limit'
        });
      }

      next();
    } catch (error) {
      logger.error('Input validation error', { error: error instanceof Error ? error.message : 'Unknown error' });
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid request format'
      });
    }
  },

  // Security headers middleware
  securityHeaders: (req: any, res: any, next: any) => {
    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    
    // Remove server information
    res.removeHeader('X-Powered-By');
    
    next();
  },

  // Error handling middleware
  errorHandler: (error: any, req: any, res: any, next: any) => {
    logger.error('Request error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
      method: req.method
    });

    // Don't expose internal errors in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(500).json({
      error: 'Internal server error',
      message: isDevelopment ? error.message : 'An unexpected error occurred',
      ...(isDevelopment && { stack: error.stack })
    });
  }
};

// Health check endpoint
export const healthCheck = (req: any, res: any) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
};