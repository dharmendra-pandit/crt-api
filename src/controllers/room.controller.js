import mongoose from 'mongoose'
import { Room } from '../models/Room.js'
import { Message } from '../models/Message.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import {
  asTrimmedString,
  isValidObjectId,
  isNonEmptyString,
} from '../utils/validate.js'
import { deleteFromCloudinary } from '../utils/cloudinaryUpload.js'
import { Notification } from '../models/Notification.js'
import { User } from '../models/User.js'

const normalizeIds = (idList = []) => {
  return [...new Set(idList.map((id) => String(id)))].filter((id) =>
    mongoose.Types.ObjectId.isValid(id),
  )
}

export const createRoom = asyncHandler(async (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    throw new ApiError(400, 'Request body must be a valid JSON object')
  }

  const name = asTrimmedString(req.body.name)
  const isPrivate = Boolean(req.body.isPrivate)
  const invitedUsers = Array.isArray(req.body.invitedUsers)
    ? req.body.invitedUsers
    : []
  const creatorId = String(req.user._id)

  if (!isNonEmptyString(name)) {
    throw new ApiError(400, 'Room name is required')
  }

  if (name.length < 2 || name.length > 100) {
    throw new ApiError(400, 'Room name must be between 2 and 100 characters')
  }

  const normalizedInvites = normalizeIds(invitedUsers).filter(
    (id) => id !== creatorId,
  )

  const room = await Room.create({
    name,
    isPrivate,
    createdBy: creatorId,
    members: [creatorId],
    invitedUsers: isPrivate ? normalizedInvites : [],
  })

  res.status(201).json({
    success: true,
    room,
  })
})

export const getRooms = asyncHandler(async (req, res) => {
  const userId = req.user._id

  const rooms = await Room.find({
    $or: [
      { isPrivate: false },
      { members: userId },
      { invitedUsers: userId },
      { createdBy: userId },
    ],
  })
    .populate('createdBy', '_id username email')
    .sort({ updatedAt: -1 })

  res.status(200).json({
    success: true,
    rooms,
  })
})

export const joinRoom = asyncHandler(async (req, res) => {
  const roomId = req.body?.roomId
  const userId = String(req.user._id)

  if (!isValidObjectId(roomId)) {
    throw new ApiError(400, 'Valid roomId is required')
  }

  const room = await Room.findById(roomId)
  if (!room) {
    throw new ApiError(404, 'Room not found')
  }

  // Private rooms allow anyone with the exact Room ID to join directly.

  const isAlreadyMember = room.members.some((id) => String(id) === userId)
  if (!isAlreadyMember) {
    room.members.push(userId)
    await room.save()
  }

  res.status(200).json({
    success: true,
    room,
  })
})

export const leaveRoom = asyncHandler(async (req, res) => {
  const roomId = req.body?.roomId
  const userId = String(req.user._id)

  if (!isValidObjectId(roomId)) {
    throw new ApiError(400, 'Valid roomId is required')
  }

  const room = await Room.findById(roomId)
  if (!room) {
    throw new ApiError(404, 'Room not found')
  }

  room.members = room.members.filter((id) => String(id) !== userId)
  await room.save()

  res.status(200).json({
    success: true,
    message: 'Left room successfully',
  })
})

export const deleteRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const userId = String(req.user._id);

  if (!isValidObjectId(roomId)) {
    throw new ApiError(400, 'Invalid roomId');
  }

  const room = await Room.findById(roomId);
  if (!room) {
    throw new ApiError(404, 'Room not found');
  }

  if (String(room.createdBy) !== userId) {
    throw new ApiError(403, 'Only the room creator can delete this room');
  }

  const messages = await Message.find({ roomId });
  for (const msg of messages) {
    if (msg.cloudinaryPublicId) {
      try {
        await deleteFromCloudinary(
          msg.cloudinaryPublicId,
          msg.cloudinaryResourceType || 'image'
        );
      } catch (err) {
        console.log('Failed to delete asset from Cloudinary:', err);
      }
    }
  }

  await Message.deleteMany({ roomId });
  await Room.findByIdAndDelete(roomId);

  res.status(200).json({
    success: true,
    message: 'Room and its content deleted successfully',
  });
});

export const joinByCode = asyncHandler(async (req, res) => {
  const code = asTrimmedString(req.body?.code)
  const userId = String(req.user._id)

  if (!code || code.length !== 4) {
    throw new ApiError(400, 'A valid 4-digit room code is required')
  }

  const room = await Room.findOne({ code, isPrivate: true })
  if (!room) {
    throw new ApiError(404, 'No private room found with that code')
  }

  const isAlreadyMember = room.members.some((id) => String(id) === userId)
  if (!isAlreadyMember) {
    room.members.push(userId)
    await room.save()
  }

  res.status(200).json({
    success: true,
    room,
  })
})

export const inviteUserToRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { targetUserId } = req.body;
  const senderId = String(req.user._id);

  if (!isValidObjectId(roomId) || !isValidObjectId(targetUserId)) {
    throw new ApiError(400, 'Invalid room ID or target user ID');
  }

  const room = await Room.findById(roomId);
  if (!room) throw new ApiError(404, 'Room not found');

  const senderIsMember = room.members.some(id => String(id) === senderId) || String(room.createdBy) === senderId;
  if (!senderIsMember && room.isPrivate) {
    throw new ApiError(403, 'You do not have permission to invite users to this room');
  }

  // Ensure target is not already a member
  const targetIsMember = room.members.some(id => String(id) === targetUserId);
  if (targetIsMember) {
    return res.status(400).json({ success: false, message: 'User is already a member of this room' });
  }

  // Push to invitedUsers if not there
  const alreadyInvited = room.invitedUsers.some(id => String(id) === targetUserId);
  if (!alreadyInvited) {
    room.invitedUsers.push(targetUserId);
    await room.save();
  }

  // Send Notification
  const sender = await User.findById(senderId);
  const senderName = sender?.profileData?.name || sender?.username || 'Someone';

  await Notification.create({
    userId: targetUserId,
    type: 'discussion',
    title: 'Room Invite',
    message: `${senderName} invited you to join the room "${room.name}".${room.code ? ` Use code to join: ${room.code}` : ''}`,
    link: `/room-chat/${room._id}`,
    relatedId: roomId
  });

  res.status(200).json({
    success: true,
    message: 'User invited successfully'
  });
});
