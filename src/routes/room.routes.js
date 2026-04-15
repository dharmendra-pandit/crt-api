import { Router } from 'express'
import {
  createRoom,
  getRooms,
  joinRoom,
  joinByCode,
  leaveRoom,
  deleteRoom,
  inviteUserToRoom
} from '../controllers/room.controller.js'
import { authMiddleware } from '../middleware/auth.middleware.js'

const router = Router()

router.post('/create', authMiddleware, createRoom)
router.get('/', authMiddleware, getRooms)
router.post('/join', authMiddleware, joinRoom)
router.post('/join-by-code', authMiddleware, joinByCode)
router.post('/leave', authMiddleware, leaveRoom)
router.post('/:roomId/invite', authMiddleware, inviteUserToRoom)
router.delete('/:roomId', authMiddleware, deleteRoom)

export default router
