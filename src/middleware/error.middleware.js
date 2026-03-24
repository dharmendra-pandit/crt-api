import multer from 'multer'

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  })
}

export const errorHandler = (err, _req, res, _next) => {
  let statusCode = err.statusCode || 500
  let message = err.message || 'Internal server error'

  if (err instanceof multer.MulterError) {
    statusCode = 400

    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File too large. Maximum size is 10MB'
    } else {
      message = 'Invalid multipart/form-data upload request'
    }
  }

  if (err.name === 'ValidationError') {
    statusCode = 400
    message = err.message
  }

  if (err.name === 'CastError') {
    statusCode = 400
    message = `Invalid ${err.path}`
  }

  if (err.code === 11000) {
    statusCode = 409
    message = 'Duplicate resource already exists'
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401
    message = 'Unauthorized: invalid or expired token'
  }

  res.status(statusCode).json({
    success: false,
    message,
  })
}
