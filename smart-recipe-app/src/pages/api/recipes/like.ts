import type { NextApiRequest, NextApiResponse } from 'next';
import { apiMiddleware } from '../../../lib/apiMiddleware';
import prisma from '../../../lib/prisma';

interface LikeRecipeRequest {
  recipeId: string;
  action: 'like' | 'unlike';
}

interface LikeRecipeResponse {
  success: boolean;
  message: string;
  likesCount?: number;
  isLiked?: boolean;
}

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<LikeRecipeResponse>,
  user: any
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  const { recipeId, action }: LikeRecipeRequest = req.body;

  if (!recipeId || !action) {
    return res.status(400).json({
      success: false,
      message: 'Recipe ID and action are required',
    });
  }

  if (action !== 'like' && action !== 'unlike') {
    return res.status(400).json({
      success: false,
      message: 'Action must be either "like" or "unlike"',
    });
  }

  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId }
    });

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found',
      });
    }

    const userId = user.id;
    const currentLikes = recipe.likes || [];
    const isCurrentlyLiked = currentLikes.includes(userId);

    let updatedLikes: string[];

    if (action === 'like') {
      if (isCurrentlyLiked) {
        return res.status(400).json({
          success: false,
          message: 'Recipe already liked',
        });
      }

      // Add user to likes array
      updatedLikes = [...currentLikes, userId];
    } else {
      if (!isCurrentlyLiked) {
        return res.status(400).json({
          success: false,
          message: 'Recipe not liked yet',
        });
      }

      // Remove user from likes array
      updatedLikes = currentLikes.filter(id => id !== userId);
    }

    // Update recipe with new likes
    const updatedRecipe = await prisma.recipe.update({
      where: { id: recipeId },
      data: {
        likes: updatedLikes,
        likesCount: updatedLikes.length
      }
    });

    res.status(200).json({
      success: true,
      message: action === 'like' ? 'Recipe liked successfully' : 'Recipe unliked successfully',
      likesCount: updatedRecipe.likesCount,
      isLiked: action === 'like',
    });
  } catch (error) {
    console.error('Like recipe error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update recipe like status',
    });
  }
};

export default apiMiddleware(['POST'], handler, true);
