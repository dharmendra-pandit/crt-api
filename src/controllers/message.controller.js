import mongoose from 'mongoose'
import fs from 'fs'
import { Message } from '../models/Message.js'
import { Room } from '../models/Room.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
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
    .populate('replyTo')
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
  const replyTo = req.body?.replyTo || null

  if (!isValidObjectId(roomId)) {
    throw new ApiError(
      400,
      'Valid roomId is required in form-data (key: roomId)',
    )
  }

  // Validate replyTo if provided
  if (replyTo && !isValidObjectId(replyTo)) {
    throw new ApiError(400, 'Invalid replyTo message ID')
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

  const message = await Message.create({
    roomId,
    sender: req.user._id,
    messageType,
    content,
    replyTo,
    localFilePath: req.file.path,
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    fileSize: req.file.size,
    readBy: [{ user: req.user._id }],
  })

  message.fileUrl = `${req.protocol}://${req.get('host')}/api/messages/download/${message._id}`
  await message.save()

  await message.populate('sender', '_id username email')
  if (replyTo) {
    await message.populate('replyTo')
  }

  res.status(201).json({
    success: true,
    message,
  })
})

export const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params
  const userId = String(req.user._id)

  if (!isValidObjectId(messageId)) {
    throw new ApiError(400, 'Invalid messageId')
  }

  const message = await Message.findById(messageId)
  if (!message) {
    throw new ApiError(404, 'Message not found')
  }

  const room = await Room.findById(message.roomId)
  if (!room) {
    throw new ApiError(404, 'Room not found')
  }

  const isSender = String(message.sender) === userId
  const isRoomCreator = String(room.createdBy) === userId

  if (!isSender && !isRoomCreator) {
    throw new ApiError(
      403,
      'Only the sender or room creator can delete this message',
    )
  }

  // Delete local file if it exists
  if (message.localFilePath && fs.existsSync(message.localFilePath)) {
    fs.unlinkSync(message.localFilePath)
  }

  await message.deleteOne()

  res.status(200).json({
    success: true,
    message: 'Message deleted successfully',
    deletedMessageId: messageId,
  })
})

export const downloadFile = asyncHandler(async (req, res) => {
  const { messageId } = req.params

  if (!isValidObjectId(messageId)) {
    throw new ApiError(400, 'Invalid messageId')
  }

  const message = await Message.findById(messageId)
  if (!message) {
    throw new ApiError(404, 'Message not found')
  }

  await ensureRoomMembership(message.roomId, req.user._id)

  if (message.isDeletedFromServer || !message.localFilePath) {
    throw new ApiError(410, 'File has already been removed from the server.')
  }

  const filePath = message.localFilePath
  if (!fs.existsSync(filePath)) {
    throw new ApiError(404, 'File missing from server')
  }

  const hasDownloaded = message.downloadedBy.some(
    (d) => String(d.user) === String(req.user._id)
  )

  res.download(filePath, message.fileName, async (err) => {
    if (err) {
      console.error('Error downloading file:', err)
      return
    }

    if (String(message.sender) !== String(req.user._id)) {
      if (!hasDownloaded) {
        message.downloadedBy.push({ user: req.user._id })
      }
      
      message.isDeletedFromServer = true
      await message.save()

      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      } catch (err) {
        console.error('Could not delete file', err)
      }
    }
  })
})

export const shareMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params
  const { targetRoomId } = req.body

  if (!isValidObjectId(messageId) || !isValidObjectId(targetRoomId)) {
    throw new ApiError(400, 'Invalid messageId or targetRoomId')
  }

  const originalMessage = await Message.findById(messageId)
  if (!originalMessage) {
    throw new ApiError(404, 'Message not found')
  }

  await ensureRoomMembership(originalMessage.roomId, req.user._id)
  await ensureRoomMembership(targetRoomId, req.user._id)

  const newMessage = await Message.create({
    roomId: targetRoomId,
    sender: req.user._id,
    messageType: originalMessage.messageType,
    content: originalMessage.content,
    isShared: true,
    fileUrl: originalMessage.fileUrl,
    fileName: originalMessage.fileName,
    mimeType: originalMessage.mimeType,
    fileSize: originalMessage.fileSize,
    readBy: [{ user: req.user._id }],
  })

  await newMessage.populate('sender', '_id username email')

  res.status(201).json({
    success: true,
    message: newMessage,
  })
})