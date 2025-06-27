import type { NextApiRequest, NextApiResponse } from 'next';
import { createUser, generateToken, setAuthCookie, isValidEmail, isValidPassword } from '../../../lib/auth';

interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

interface RegisterResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RegisterResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { email, password, name }: RegisterRequest = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required',
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // Validate password strength
    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message || 'Invalid password',
      });
    }

    // Validate name
    if (name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters long',
      });
    }

    // Create user
    const user = await createUser(email, password, name.trim());
    
    // Generate token
    const token = generateToken(user);
    
    // Set auth cookie
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'User already exists') {
        return res.status(409).json({
          success: false,
          message: 'An account with this email already exists',
        });
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create account. Please try again.',
    });
  }
}
