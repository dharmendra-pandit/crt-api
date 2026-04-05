import multer from 'multer'
import { ApiError } from '../utils/ApiError.js'

import fs from 'fs'
import path from 'path'

const uploadDir = path.join(process.cwd(), 'public', 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, uniqueSuffix + '-' + file.originalname)
  },
})

const allowedMimePrefixes = [
  'image/',
  'application/',
  'text/',
  'audio/',
  'video/',
]

const fileFilter = (_req, file, cb) => {
  if (!file) {
    cb(new ApiError(400, 'No file provided'))
    return
  }

  const mimeType = file.mimetype || ''
  const isAllowed = allowedMimePrefixes.some((prefix) =>
    mimeType.startsWith(prefix),
  )

  if (!isAllowed) {
    cb(new ApiError(400, 'Unsupported file type'))
    return
  }

  cb(null, true)
}

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter,
})
