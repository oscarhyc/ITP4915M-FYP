import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateRequest } from '../../../lib/auth';

interface MeResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    image?: string;
  };
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MeResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const user = await authenticateRequest(req);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
    });
  } catch (error) {
    console.error('Me endpoint error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to get user information',
    });
  }
}
