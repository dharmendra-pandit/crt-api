import { Router } from 'express'
import {
  createRoom,
  getRooms,
  joinRoom,
  leaveRoom,
} from '../controllers/room.controller.js'
import { authMiddleware } from '../middleware/auth.middleware.js'

const router = Router()

router.post('/create', authMiddleware, createRoom)
router.get('/', authMiddleware, getRooms)
router.post('/join', authMiddleware, joinRoom)
router.post('/leave', authMiddleware, leaveRoom)

export default router
