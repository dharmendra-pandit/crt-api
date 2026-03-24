import validator from 'validator'
import { User } from '../models/User.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { signToken } from '../utils/jwt.js'
import {
  asTrimmedString,
  isStrongEnoughPassword,
  isValidEmail,
} from '../utils/validate.js'

const sanitizeUser = (userDoc) => ({
  _id: userDoc._id,
  username: userDoc.username,
  email: userDoc.email,
  createdAt: userDoc.createdAt,
  isOnline: userDoc.isOnline,
  lastSeen: userDoc.lastSeen,
})

export const register = asyncHandler(async (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    throw new ApiError(400, 'Request body must be a valid JSON object')
  }

  const username = asTrimmedString(req.body.username)
  const email = asTrimmedString(req.body.email).toLowerCase()
  const password = req.body.password

  if (!username || !email || !password) {
    throw new ApiError(400, 'username, email, and password are required')
  }

  if (!isValidEmail(email)) {
    throw new ApiError(400, 'Invalid email format')
  }

  if (!isStrongEnoughPassword(password)) {
    throw new ApiError(400, 'Password must be between 6 and 128 characters')
  }

  if (!validator.isLength(username, { min: 3, max: 30 })) {
    throw new ApiError(400, 'Username must be between 3 and 30 characters')
  }

  const existing = await User.findOne({ email })
  if (existing) {
    throw new ApiError(409, 'Email already in use')
  }

  const user = await User.create({ username, email, password })
  const token = signToken({ userId: user._id })

  res.status(201).json({
    success: true,
    token,
    user: sanitizeUser(user),
  })
})

export const login = asyncHandler(async (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    throw new ApiError(400, 'Request body must be a valid JSON object')
  }

  const email = asTrimmedString(req.body.email).toLowerCase()
  const password = req.body.password

  if (!email || !password) {
    throw new ApiError(400, 'email and password are required')
  }

  if (!isValidEmail(email)) {
    throw new ApiError(400, 'Invalid email format')
  }

  const user = await User.findOne({ email }).select('+password')
  if (!user) {
    throw new ApiError(401, 'Invalid credentials')
  }

  const isValid = await user.comparePassword(password)
  if (!isValid) {
    throw new ApiError(401, 'Invalid credentials')
  }

  const token = signToken({ userId: user._id })

  res.status(200).json({
    success: true,
    token,
    user: sanitizeUser(user),
  })
})
