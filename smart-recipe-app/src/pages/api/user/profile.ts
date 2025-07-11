import type { NextApiRequest, NextApiResponse } from 'next';
import { apiMiddleware } from '../../../lib/apiMiddleware';
import { hashPassword, verifyPassword } from '../../../lib/auth';
import prisma from '../../../lib/prisma';

interface UpdateProfileRequest {
  name?: string;
  currentPassword?: string;
  newPassword?: string;
}

interface UpdateProfileResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<UpdateProfileResponse>,
  user: any
) => {
  if (req.method !== 'PUT') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  const { name, currentPassword, newPassword }: UpdateProfileRequest = req.body;

  // Validate input
  if (!name || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Name is required',
    });
  }

  if (name.trim().length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Name must be less than 100 characters',
    });
  }

  try {
    // Find the user
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!dbUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    let updateData: any = {
      name: name.trim(),
    };

    // Handle password change if provided
    if (currentPassword && newPassword) {
      // Validate current password
      const isCurrentPasswordValid = await verifyPassword(currentPassword, dbUser.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }

      // Validate new password
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 8 characters long',
        });
      }

      if (!/(?=.*[a-z])/.test(newPassword)) {
        return res.status(400).json({
          success: false,
          message: 'New password must contain at least one lowercase letter',
        });
      }

      if (!/(?=.*[A-Z])/.test(newPassword)) {
        return res.status(400).json({
          success: false,
          message: 'New password must contain at least one uppercase letter',
        });
      }

      if (!/(?=.*\d)/.test(newPassword)) {
        return res.status(400).json({
          success: false,
          message: 'New password must contain at least one number',
        });
      }

      // Hash and update password
      updateData.password = await hashPassword(newPassword);
    } else if (currentPassword || newPassword) {
      // If only one password field is provided, return error
      return res.status(400).json({
        success: false,
        message: 'Both current password and new password are required to change password',
      });
    }

    // Update last active timestamp in stats
    const currentStats = (dbUser.stats as any) || {};
    updateData.stats = {
      ...currentStats,
      lastActiveAt: new Date()
    };

    // Save changes
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
    });
  }
};

export default apiMiddleware(['PUT'], handler, true);
