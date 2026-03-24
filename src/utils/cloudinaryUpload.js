import { Readable } from 'stream'
import cloudinary from '../config/cloudinary.js'
import { env } from '../config/env.js'

export const uploadBufferToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: env.uploadFolder,
        resource_type: 'auto',
        ...options,
      },
      (error, result) => {
        if (error) {
          reject(error)
          return
        }

        resolve(result)
      },
    )

    Readable.from(buffer).pipe(uploadStream)
  })
}
