import { Router } from 'express'
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../controllers/notification.controller.js'
import { authMiddleware } from '../middleware/auth.middleware.js'

const router = Router()

router.get('/', authMiddleware, getNotifications)
router.put('/read-all', authMiddleware, markAllAsRead)
router.put('/:id/read', authMiddleware, markAsRead)

export default router
