import type { NextApiRequest, NextApiResponse } from 'next';
import { apiMiddleware } from '../../../lib/apiMiddleware';
import prisma from '../../../lib/prisma';

interface SharedRecipesResponse {
  success: boolean;
  recipes?: any[];
  recipe?: any;
  message?: string;
}

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<SharedRecipesResponse>,
  user?: any
) => {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  try {
    const { id } = req.query;
    
    // If ID is provided, fetch single recipe
    if (id && typeof id === 'string') {
      console.log('=== FETCH SINGLE SHARED RECIPE DEBUG ===');
      console.log('Recipe ID:', id);
      console.log('Current user ID:', user?.id);

      const recipe = await prisma.recipe.findFirst({
        where: { 
          id: id,
          isShared: true 
        },
        select: {
          id: true,
          name: true,
          ingredients: true,
          instructions: true,
          dietaryPreference: true,
          additionalInformation: true,
          tags: true,
          userId: true,
          createdAt: true,
          sharedAt: true,
          likes: true,
          likesCount: true,
          user: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!recipe) {
        return res.status(404).json({
          success: false,
          message: 'Recipe not found or not shared'
        });
      }

      const currentUserId = user?.id;
      const isLikedByCurrentUser = currentUserId ? (recipe.likes || []).includes(currentUserId) : false;
      const isOwnRecipe = currentUserId === recipe.userId;

      const recipeWithUserInfo = {
        id: recipe.id,
        name: recipe.name,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        dietaryPreference: recipe.dietaryPreference,
        additionalInformation: recipe.additionalInformation,
        tags: recipe.tags,
        userId: recipe.userId,
        createdAt: recipe.createdAt,
        sharedAt: recipe.sharedAt,
        likes: recipe.likes,
        likesCount: recipe.likesCount || 0,
        user: recipe.user,
        isLikedByCurrentUser,
        isOwnRecipe,
      };

      return res.status(200).json({
        success: true,
        recipe: recipeWithUserInfo,
      });
    }

    console.log('=== FETCH SHARED RECIPES DEBUG ===');
    console.log('Current user ID:', user?.id);

    // Fetch shared recipes with user information, sorted by shared date (newest first)
    // Limit to 20 recipes for performance
    const recipes = await prisma.recipe.findMany({
      where: { isShared: true },
      orderBy: { sharedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        name: true,
        ingredients: true,
        instructions: true,
        dietaryPreference: true,
        additionalInformation: true,
        userId: true,
        sharedAt: true,
        likes: true,
        likesCount: true,
        user: {
          select: {
            name: true
          }
        }
      }
    });

    console.log('Found shared recipes count:', recipes.length);
    console.log('Shared recipes:', recipes.map(r => ({
      id: r.id,
      name: r.name,
      userId: r.userId,
      sharedAt: r.sharedAt
    })));

    // Process recipes to add user-specific information
    const recipesWithUsers = recipes.map((recipe) => {
      const currentUserId = user?.id;
      const isLikedByCurrentUser = currentUserId ? (recipe.likes || []).includes(currentUserId) : false;
      const isOwnRecipe = currentUserId === recipe.userId;

      console.log(`Recipe ${recipe.name}: User ${recipe.user?.name || 'Anonymous'}, isOwnRecipe: ${isOwnRecipe}`);

      return {
        id: recipe.id,
        name: recipe.name,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        dietaryPreference: recipe.dietaryPreference,
        additionalInformation: recipe.additionalInformation,
        userId: recipe.userId,
        sharedAt: recipe.sharedAt,
        likes: recipe.likes,
        likesCount: recipe.likesCount || 0,
        userName: recipe.user?.name || 'Anonymous',
        isLikedByCurrentUser,
        isOwnRecipe,
      };
    });

    console.log('Final recipes with users count:', recipesWithUsers.length);

    res.status(200).json({
      success: true,
      recipes: recipesWithUsers,
    });
  } catch (error) {
    console.error('Fetch shared recipes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shared recipes',
    });
  }
};

export default apiMiddleware(['GET'], handler, true); // Authentication required to check likes
