import type { NextApiRequest, NextApiResponse } from 'next';
import { apiMiddleware } from '../../../lib/apiMiddleware';
import prisma from '../../../lib/prisma';

interface SaveRecipeRequest {
  recipe: any;
  ingredients: Array<{ name: string; quantity: string }>;
  dietaryPreferences: string[];
}

interface SaveRecipeResponse {
  success: boolean;
  message: string;
  recipeId?: string;
}

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<SaveRecipeResponse>,
  user: any
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  const { recipe, ingredients, dietaryPreferences }: SaveRecipeRequest = req.body;

  if (!recipe || !recipe.name) {
    return res.status(400).json({
      success: false,
      message: 'Recipe data is required',
    });
  }

  try {
    console.log('Saving recipe for user:', user.id);
    console.log('Recipe data:', recipe);

    // Check for duplicate recipe (same name and similar ingredients)
    const recipeIngredients = recipe.ingredients || ingredients;
    const ingredientNames = recipeIngredients.map((ing: any) => ing.name.toLowerCase().trim()).sort();

    // Check if recipe was created in the last 5 minutes to prevent immediate duplicates
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingRecipe = await prisma.recipe.findFirst({
      where: {
        userId: user.id,
        name: {
          equals: recipe.name.trim(),
          mode: 'insensitive'
        },
        createdAt: {
          gte: fiveMinutesAgo
        }
      }
    });

    if (existingRecipe) {
      // Check if ingredients are similar (at least 80% match)
      const existingIngredients = existingRecipe.ingredients as any[];
      const existingIngredientNames = existingIngredients.map((ing: any) => ing.name.toLowerCase().trim()).sort();
      const matchingIngredients = ingredientNames.filter((name: string) => existingIngredientNames.includes(name));
      const similarityRatio = matchingIngredients.length / Math.max(ingredientNames.length, existingIngredientNames.length);

      if (similarityRatio >= 0.8) {
        console.log('Duplicate recipe detected, returning existing recipe ID');
        return res.status(200).json({
          success: true,
          message: 'Recipe already saved (duplicate prevented)',
          recipeId: existingRecipe.id,
        });
      }
    }

    // Check current recipe count for user
    const recipeCount = await prisma.recipe.count({
      where: { userId: user.id }
    });
    console.log('Current recipe count for user:', recipeCount);

    // If user has 100+ recipes, delete the oldest one
    if (recipeCount >= 100) {
      const oldestRecipe = await prisma.recipe.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' }
      });
      if (oldestRecipe) {
        await prisma.recipe.delete({
          where: { id: oldestRecipe.id }
        });
        console.log('Deleted oldest recipe:', oldestRecipe.id);
      }
    }

    // Create new recipe document
    const savedRecipe = await prisma.recipe.create({
      data: {
        userId: user.id,
        name: recipe.name,
        ingredients: recipe.ingredients || ingredients,
        instructions: recipe.instructions || [],
        dietaryPreference: dietaryPreferences || [],
        additionalInformation: recipe.additionalInformation || {},
        isShared: false, // Not shared by default when manually saved
        likes: [],
        likesCount: 0,
        tags: [],
      }
    });

    console.log('Recipe saved successfully:', savedRecipe.id);

    res.status(200).json({
      success: true,
      message: 'Recipe saved successfully',
      recipeId: savedRecipe.id,
    });
  } catch (error) {
    console.error('Save recipe error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save recipe',
    });
  }
};

export default apiMiddleware(['POST'], handler, true);
