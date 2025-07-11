import type { NextApiRequest, NextApiResponse } from 'next';
import { apiMiddleware } from '../../../lib/apiMiddleware';
import prisma from '../../../lib/prisma';

interface AICameraUsageResponse {
  success: boolean;
  usesRemaining?: number;
  message?: string;
}

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<AICameraUsageResponse>,
  user: any
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  try {
    const { action } = req.body;
    const userId = user.id;

    // Get current user stats
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { stats: true }
    });

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Parse current stats
    const stats = currentUser.stats as any || {};
    const currentUses = stats.aiCameraUsesRemaining || 5; // Default 5 uses for new users

    if (action === 'check') {
      // Just return current usage
      return res.status(200).json({
        success: true,
        usesRemaining: currentUses,
      });
    } else if (action === 'use') {
      // Decrement usage
      if (currentUses <= 0) {
        return res.status(400).json({
          success: false,
          message: 'No AI Camera uses remaining',
        });
      }

      const newUsesRemaining = currentUses - 1;
      
      // Update user stats
      await prisma.user.update({
        where: { id: userId },
        data: {
          stats: {
            ...stats,
            aiCameraUsesRemaining: newUsesRemaining,
          }
        }
      });

      return res.status(200).json({
        success: true,
        usesRemaining: newUsesRemaining,
      });
    } else if (action === 'earn') {
      // Add uses (for forum engagement rewards)
      const { amount = 1 } = req.body;
      const newUsesRemaining = currentUses + amount;
      
      // Update user stats
      await prisma.user.update({
        where: { id: userId },
        data: {
          stats: {
            ...stats,
            aiCameraUsesRemaining: newUsesRemaining,
          }
        }
      });

      return res.status(200).json({
        success: true,
        usesRemaining: newUsesRemaining,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "check", "use", or "earn"',
      });
    }
  } catch (error) {
    console.error('AI Camera usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process AI Camera usage',
    });
  }
};

export default apiMiddleware(['POST'], handler, true);
