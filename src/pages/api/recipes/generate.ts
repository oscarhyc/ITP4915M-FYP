import type { NextApiRequest, NextApiResponse } from 'next';
import { apiMiddleware } from '../../../lib/apiMiddleware';
import { generateRecipe } from '../../../lib/lmstudio';
import { Ingredient, DietaryPreference } from '../../../types';

interface GenerateRecipeRequest {
  ingredients: Ingredient[];
  dietaryPreferences: DietaryPreference[];
}

interface GenerateRecipeResponse {
  success: boolean;
  recipes?: string;
  openaiPromptId?: string;
  message?: string;
}

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<GenerateRecipeResponse>,
  user: any
) => {
  const { ingredients, dietaryPreferences }: GenerateRecipeRequest = req.body;

  // Validate input
  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'At least one ingredient is required',
    });
  }

  // Validate ingredients format
  for (const ingredient of ingredients) {
    if (!ingredient.name || !ingredient.quantity) {
      return res.status(400).json({
        success: false,
        message: 'Each ingredient must have a name and quantity',
      });
    }
  }

  // Validate dietary preferences
  if (dietaryPreferences && !Array.isArray(dietaryPreferences)) {
    return res.status(400).json({
      success: false,
      message: 'Dietary preferences must be an array',
    });
  }

  try {
    console.log('Generating recipes for user:', user.id);
    console.log('Ingredients:', ingredients);
    console.log('Dietary preferences:', dietaryPreferences);

    const result = await generateRecipe(
      ingredients,
      dietaryPreferences || [],
      user.id
    );

    // Auto-save functionality removed - users now manually save recipes

    res.status(200).json({
      success: true,
      recipes: result.recipes || undefined,
      openaiPromptId: result.openaiPromptId,
    });
  } catch (error) {
    console.error('Recipe generation error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('LM Studio') || error.message.includes('connection') || error.message.includes('ECONNREFUSED')) {
        return res.status(503).json({
          success: false,
          message: 'LM Studio is not available. Please check if it\'s running.',
        });
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to generate recipes. Please try again.',
    });
  }
};

export default apiMiddleware(['POST'], handler, true);
