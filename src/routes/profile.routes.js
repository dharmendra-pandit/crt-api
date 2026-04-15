import { Router } from 'express'
import {
  getProfileInfo,
  updateProfileData,
  markNotificationsRead,
  updatePrivacy,
  searchUsers,
  getUserProfile,
  followUser,
  unfollowUser,
  getFeed,
  getUserNetwork,
} from '../controllers/profile.controller.js'
import { authMiddleware } from '../middleware/auth.middleware.js'

const router = Router()

router.get('/feed', authMiddleware, getFeed)
router.get('/search', authMiddleware, searchUsers)
router.get('/user/:userId', authMiddleware, getUserProfile)
router.get('/user/:userId/network', authMiddleware, getUserNetwork)
router.get('/', authMiddleware, getProfileInfo)
router.put('/', authMiddleware, updateProfileData)
router.put('/privacy', authMiddleware, updatePrivacy)
router.put('/notifications/read', authMiddleware, markNotificationsRead)
router.post('/:id/follow', authMiddleware, followUser)
router.post('/:id/unfollow', authMiddleware, unfollowUser)

export default router
