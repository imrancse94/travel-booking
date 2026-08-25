import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import * as authController from '../controllers/authController.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
} from '../validators/auth.validators.js';

export const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new customer account
 *     tags: [Auth]
 */
router.post('/register', authLimiter, validate({ body: registerSchema }), authController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Authenticate and receive an access token
 *     tags: [Auth]
 */
router.post('/login', authLimiter, validate({ body: loginSchema }), authController.login);

router.post('/refresh', validate({ body: refreshSchema }), authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.post('/forgot-password', authLimiter, validate({ body: forgotPasswordSchema }), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate({ body: resetPasswordSchema }), authController.resetPassword);
router.post('/verify-email', validate({ body: verifyEmailSchema }), authController.verifyEmail);
router.post('/change-password', authenticate, validate({ body: changePasswordSchema }), authController.changePassword);
router.get('/me', authenticate, authController.me);

export default router;
