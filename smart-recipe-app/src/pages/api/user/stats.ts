import type { NextApiRequest, NextApiResponse } from 'next';
import { apiMiddleware } from '../../../lib/apiMiddleware';
import prisma from '../../../lib/prisma';

interface UserStatsResponse {
  success: boolean;
  stats?: {
    recipesGenerated: number;
    recipesSaved: number;
    recipesLiked: number;
    recipesShared: number;
  };
  message?: string;
}

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<UserStatsResponse>,
  user: any
) => {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  try {
    const userId = user.id;

    // Get recipes generated count (from AI generated responses)
    const recipesGenerated = await prisma.aIGenerated.count({
      where: { userId }
    });

    // Get recipes saved count (user's own recipes)
    const recipesSaved = await prisma.recipe.count({
      where: { userId }
    });

    // Get recipes liked count (recipes where user's ID is in the likes array)
    const recipesLiked = await prisma.recipe.count({
      where: {
        likes: {
          has: userId
        }
      }
    });

    // Get recipes shared count (user's recipes that are shared)
    const recipesShared = await prisma.recipe.count({
      where: {
        userId,
        isShared: true
      }
    });

    res.status(200).json({
      success: true,
      stats: {
        recipesGenerated,
        recipesSaved,
        recipesLiked,
        recipesShared,
      },
    });
  } catch (error) {
    console.error('Fetch user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics',
    });
  }
};

export default apiMiddleware(['GET'], handler, true);
