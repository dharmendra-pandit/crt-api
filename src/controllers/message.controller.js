import mongoose from 'mongoose'
import { Message } from '../models/Message.js'
import { Room } from '../models/Room.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { uploadBufferToCloudinary } from '../utils/cloudinaryUpload.js'
import {
  asTrimmedString,
  isValidMessageType,
  isValidObjectId,
} from '../utils/validate.js'

const ensureRoomMembership = async (roomId, userId) => {
  const room = await Room.findById(roomId)
  if (!room) {
    throw new ApiError(404, 'Room not found')
  }

  const isMember = room.members.some((id) => String(id) === String(userId))
  if (!isMember) {
    throw new ApiError(403, 'You must join the room first')
  }

  return room
}

export const getMessagesByRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.params

  if (!isValidObjectId(roomId)) {
    throw new ApiError(400, 'Invalid roomId')
  }

  await ensureRoomMembership(roomId, req.user._id)

  const messages = await Message.find({ roomId })
    .populate('sender', '_id username email')
    .sort({ createdAt: 1 })
    .limit(200)

  res.status(200).json({
    success: true,
    messages,
  })
})

export const uploadFileMessage = asyncHandler(async (req, res) => {
  const roomId = req.body?.roomId
  const messageType = asTrimmedString(req.body?.messageType, 'file')
  const content = asTrimmedString(req.body?.content)

  if (!isValidObjectId(roomId)) {
    throw new ApiError(
      400,
      'Valid roomId is required in form-data (key: roomId)',
    )
  }

  if (!isValidMessageType(messageType)) {
    throw new ApiError(400, 'Invalid messageType')
  }

  if (!['image', 'file', 'sticker'].includes(messageType)) {
    throw new ApiError(400, 'messageType must be image, file, or sticker')
  }

  if (!req.file) {
    throw new ApiError(400, 'No file uploaded')
  }

  await ensureRoomMembership(roomId, req.user._id)

  const uploaded = await uploadBufferToCloudinary(req.file.buffer, {
    public_id: `${Date.now()}-${req.file.originalname}`,
    resource_type: 'auto',
  })

  const message = await Message.create({
    roomId,
    sender: req.user._id,
    messageType,
    content,
    fileUrl: uploaded.secure_url,
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    fileSize: req.file.size,
    readBy: [{ user: req.user._id }],
  })

  await message.populate('sender', '_id username email')

  res.status(201).json({
    success: true,
    message,
  })
})
