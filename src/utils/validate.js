import mongoose from 'mongoose'
import validator from 'validator'

export const isNonEmptyString = (value) =>
  typeof value === 'string' && value.trim().length > 0

export const asTrimmedString = (value, fallback = '') => {
  if (typeof value !== 'string') {
    return fallback
  }

  return value.trim()
}

export const isValidObjectId = (value) =>
  typeof value === 'string' && mongoose.Types.ObjectId.isValid(value)

export const isValidEmail = (value) =>
  typeof value === 'string' && validator.isEmail(value)

export const isStrongEnoughPassword = (value) =>
  typeof value === 'string' && value.length >= 6 && value.length <= 128

export const isValidMessageType = (value) =>
  ['text', 'image', 'file', 'link', 'sticker'].includes(value)

export const isLikelyUrl = (value) =>
  typeof value === 'string' &&
  validator.isURL(value, {
    protocols: ['http', 'https'],
    require_protocol: true,
  })
