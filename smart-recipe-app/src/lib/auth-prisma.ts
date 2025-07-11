import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
};

// Verify password
export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// Generate JWT token
export const generateToken = (user: AuthUser): string => {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

// Verify JWT token
export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
};

// Set auth cookie
export const setAuthCookie = (res: NextApiResponse, token: string): void => {
  res.setHeader('Set-Cookie', [
    `auth-token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax${
      process.env.NODE_ENV === 'production' ? '; Secure' : ''
    }`,
  ]);
};

// Clear auth cookie
export const clearAuthCookie = (res: NextApiResponse): void => {
  res.setHeader('Set-Cookie', [
    'auth-token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax',
  ]);
};

// Get token from request
export const getTokenFromRequest = (req: NextApiRequest): string | null => {
  // Try cookie first
  const cookieToken = req.cookies['auth-token'];
  if (cookieToken) {
    return cookieToken;
  }

  // Try Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
};

// Authenticate request
export const authenticateRequest = async (req: NextApiRequest): Promise<AuthUser | null> => {
  const token = getTokenFromRequest(req);
  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image || undefined,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
};

// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation
export const isValidPassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }

  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }

  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }

  return { valid: true };
};

// Create user account
export const createUser = async (email: string, password: string, name: string): Promise<AuthUser> => {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    throw new Error('User already exists');
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      isActive: true,
      role: 'user',
      preferences: {
        dietaryRestrictions: [],
        favoriteIngredients: [],
        cookingSkillLevel: 'intermediate',
        notifications: { email: true, push: true }
      },
      stats: {
        recipesGenerated: 0,
        recipesLiked: 0,
        recipesShared: 0,
        lastActiveAt: new Date()
      }
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image || undefined,
  };
};

// Login user
export const loginUser = async (email: string, password: string): Promise<{ user: AuthUser; token: string }> => {
  // Find user
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.password);
  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  // Update last active
  await prisma.user.update({
    where: { id: user.id },
    data: {
      stats: {
        ...((user.stats as any) || {}),
        lastActiveAt: new Date()
      }
    }
  });

  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image || undefined,
  };

  const token = generateToken(authUser);

  return { user: authUser, token };
};

// Get user by ID
export const getUserById = async (userId: string): Promise<AuthUser | null> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image || undefined,
    };
  } catch (error) {
    console.error('Get user by ID error:', error);
    return null;
  }
};

// Update user
export const updateUser = async (userId: string, updates: Partial<AuthUser>): Promise<AuthUser | null> => {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.email && { email: updates.email.toLowerCase() }),
        ...(updates.image !== undefined && { image: updates.image }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image || undefined,
    };
  } catch (error) {
    console.error('Update user error:', error);
    return null;
  }
};
