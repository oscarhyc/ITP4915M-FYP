import type { NextApiRequest, NextApiResponse } from 'next';
import { apiMiddleware } from '../../../lib/apiMiddleware';
import prisma from '../../../lib/prisma';

interface UserRecipesResponse {
  success: boolean;
  recipes?: any[];
  message?: string;
}

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<UserRecipesResponse>,
  user: any
) => {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  try {
    console.log('Fetching recipes for user:', user.id);

    // Fetch user's recipes, sorted by creation date (newest first)
    // Limit to 100 recipes as requested
    const recipes = await prisma.recipe.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        name: true,
        ingredients: true,
        instructions: true,
        dietaryPreference: true,
        createdAt: true,
      },
    });

    console.log('Found recipes:', recipes.length);

    res.status(200).json({
      success: true,
      recipes,
    });
  } catch (error) {
    console.error('Fetch user recipes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recipes',
    });
  }
};

export default apiMiddleware(['GET'], handler, true);
