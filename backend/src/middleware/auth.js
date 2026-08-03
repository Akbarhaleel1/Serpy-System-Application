const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - ensure user is authenticated
const protect = async (req, res, next) => {
  try {
    let token;
    
    // Get token from header
    console.log('🔐 Auth middleware called for:', req.method, req.path);
    console.log('🔐 Authorization header:', req.headers.authorization);
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('🔐 Token extracted:', token ? 'YES' : 'NO');
    } else {
      console.log('🔐 No Authorization header or not Bearer token');
    }
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Access denied. No token provided.'
      });
    }
    
    // Verify token
    const jwtSecret = process.env.JWT_SECRET || 'fallback_jwt_secret_change_in_production_12345';
    const decoded = jwt.verify(token, jwtSecret);
    
    // Get user from token
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Token is no longer valid.'
      });
    }
    
    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Account has been deactivated.'
      });
    }
    
    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token.'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token has expired.'
      });
    }
    
    return res.status(500).json({
      status: 'error',
      message: 'Authentication error.'
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `User role '${req.user.role}' is not authorized to access this resource.`
      });
    }
    next();
  };
};

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Generate JWT token
const generateToken = (userId) => {
  const jwtSecret = process.env.JWT_SECRET || 'fallback_jwt_secret_change_in_production_12345';
  return jwt.sign({ userId }, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRE || '24h'
  });
};

// Send token response
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = generateToken(user._id);
  
  const options = {
    expires: new Date(Date.now() + (process.env.JWT_EXPIRE || '24h').replace('h', '') * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };
  
  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }
  
  res.status(statusCode)
    .cookie('token', token, options)
    .json({
      status: 'success',
      message,
      token,
      data: {
        user: user.generateProfile()
      }
    });
};

module.exports = {
  protect,
  authorize,
  optionalAuth,
  generateToken,
  sendTokenResponse
};
