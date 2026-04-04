import express from 'express';
import { getMentorResponse } from '../controllers/mentor.controller.js';

const router = express.Router();

router.post('/chat', getMentorResponse);

export default router;
