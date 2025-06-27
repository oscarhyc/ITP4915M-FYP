import type { NextApiRequest, NextApiResponse } from 'next';
import { apiMiddleware } from '../../../lib/apiMiddleware';
import prisma from '../../../lib/prisma';

interface ShareRecipeRequest {
  recipe: any;
  ingredients: Array<{ name: string; quantity: string }>;
  dietaryPreferences: string[];
}

interface ShareRecipeResponse {
  success: boolean;
  message: string;
  recipeId?: string;
}

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<ShareRecipeResponse>,
  user: any
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  const { recipe, ingredients, dietaryPreferences }: ShareRecipeRequest = req.body;

  if (!recipe || !recipe.name) {
    return res.status(400).json({
      success: false,
      message: 'Recipe data is required',
    });
  }

  try {
    console.log('=== SHARE RECIPE DEBUG ===');
    console.log('User ID:', user.id);
    console.log('Recipe name:', recipe.name);
    console.log('Recipe data:', JSON.stringify(recipe, null, 2));
    console.log('Ingredients:', ingredients);
    console.log('Dietary preferences:', dietaryPreferences);

    // Check if user already has this recipe shared (prevent duplicates)
    const existingSharedRecipe = await prisma.recipe.findFirst({
      where: {
        userId: user.id,
        name: recipe.name,
        isShared: true
      }
    });

    console.log('Existing shared recipe check:', existingSharedRecipe ? 'Found duplicate' : 'No duplicate found');

    if (existingSharedRecipe) {
      console.log('Duplicate recipe found, returning error');
      return res.status(400).json({
        success: false,
        message: 'This recipe is already shared',
      });
    }

    // Create new shared recipe document
    const savedRecipe = await prisma.recipe.create({
      data: {
        userId: user.id,
        name: recipe.name,
        ingredients: recipe.ingredients || ingredients,
        instructions: recipe.instructions || [],
        dietaryPreference: dietaryPreferences || [],
        additionalInformation: recipe.additionalInformation || {},
        isShared: true, // Mark as shared
        sharedAt: new Date(),
        likes: [],
        likesCount: 0,
        tags: [],
      }
    });

    console.log('Recipe saved successfully with ID:', savedRecipe.id);
    console.log('Saved recipe isShared:', savedRecipe.isShared);
    console.log('Saved recipe sharedAt:', savedRecipe.sharedAt);

    // Verify the recipe was saved correctly
    const verifyRecipe = await prisma.recipe.findUnique({
      where: { id: savedRecipe.id }
    });
    console.log('Verification - Recipe found:', !!verifyRecipe);
    console.log('Verification - isShared:', verifyRecipe?.isShared);
    console.log('Verification - sharedAt:', verifyRecipe?.sharedAt);

    res.status(200).json({
      success: true,
      message: 'Recipe shared successfully',
      recipeId: savedRecipe.id,
    });
  } catch (error) {
    console.error('Share recipe error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to share recipe',
    });
  }
};

export default apiMiddleware(['POST'], handler, true);
