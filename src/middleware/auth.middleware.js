import { User } from '../models/User.js'
import { verifyToken } from '../utils/jwt.js'
import { ApiError } from '../utils/ApiError.js'

export const authMiddleware = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization || ''
    const tokenFromHeader = authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null
    const token = tokenFromHeader || req.cookies?.token

    if (!token) {
      next(new ApiError(401, 'Unauthorized: token missing'))
      return
    }

    const decoded = verifyToken(token)
    const user = await User.findById(decoded.userId).select('-password')

    if (!user) {
      next(new ApiError(401, 'Unauthorized: invalid token'))
      return
    }

    req.user = user
    next()
  } catch (_error) {
    next(new ApiError(401, 'Unauthorized: invalid or expired token'))
  }
}
