import { Notification } from '../models/Notification.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { isValidObjectId } from '../utils/validate.js'

export const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id

  const notifications = await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(50)

  res.status(200).json({
    success: true,
    notifications,
  })
})

export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params
  const userId = String(req.user._id)

  if (!isValidObjectId(id)) {
    throw new ApiError(400, 'Invalid notification ID')
  }

  const notification = await Notification.findById(id)
  if (!notification) {
    throw new ApiError(404, 'Notification not found')
  }

  if (String(notification.userId) !== userId) {
    throw new ApiError(403, 'Unauthorized access to this notification')
  }

  notification.isRead = true
  await notification.save()

  res.status(200).json({
    success: true,
    notification,
  })
})

export const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id

  await Notification.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true } }
  )

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read',
  })
})
