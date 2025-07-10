import type { NextApiRequest, NextApiResponse } from 'next';
import { apiMiddleware } from '../../../lib/apiMiddleware';
import OpenAI from 'openai';
import prisma from '../../../lib/prisma';

interface DetectedIngredient {
  name: string;
  confidence: number;
}

interface AnalyzeImageRequest {
  image: string; // Base64 encoded image
}

interface AnalyzeImageResponse {
  success: boolean;
  ingredients?: DetectedIngredient[];
  message?: string;
}

// Gemini API configuration (same as existing setup)
const LM_STUDIO_BASE_URL = 'https://hahahagame-gemini-play.deno.dev';
const LM_STUDIO_API_KEY = 'AIzaSyBzW2lNRzFaZ16T7SEr5HlYfQQVogpMf4U';

// Initialize OpenAI client configured for Gemini API
const geminiClient = new OpenAI({
  baseURL: LM_STUDIO_BASE_URL,
  apiKey: LM_STUDIO_API_KEY,
});

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<AnalyzeImageResponse>,
  user: any
) => {
  const { image }: AnalyzeImageRequest = req.body;

  // Validate input
  if (!image) {
    return res.status(400).json({
      success: false,
      message: 'Image data is required',
    });
  }

  // Validate base64 image format
  if (!image.startsWith('data:image/')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid image format. Please provide a valid base64 encoded image.',
    });
  }

  try {
    // Check AI Camera usage before processing
    try {
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

      // Check if user has remaining uses
      if (currentUses <= 0) {
        return res.status(400).json({
          success: false,
          message: 'No AI Camera uses remaining. Engage with the Community Forum to earn more uses!',
        });
      }

      // Decrement usage
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

    } catch (usageError) {
      console.error('Usage check failed:', usageError);
      return res.status(400).json({
        success: false,
        message: 'Unable to verify AI Camera usage. Please try again.',
      });
    }

    console.log('Analyzing image with Gemini API...');

    // Create the prompt for ingredient detection
    const prompt = `Analyze this image and identify any food ingredients or food items visible. 

IMPORTANT INSTRUCTIONS:
1. Only identify actual food ingredients, food items, or cooking ingredients
2. Do not identify non-food items, utensils, plates, or background objects
3. If you see NO food or ingredients in the image, respond with: "NO_FOOD_DETECTED"
4. For each ingredient found, provide a confidence score between 0.1 and 1.0
5. Be specific with ingredient names (e.g., "red bell pepper" instead of just "pepper")
6. Include common cooking ingredients like spices, herbs, oils, etc. if visible

Respond in this exact JSON format:
{
  "hasFood": true/false,
  "ingredients": [
    {"name": "ingredient_name", "confidence": 0.95},
    {"name": "another_ingredient", "confidence": 0.87}
  ]
}

If no food is detected, respond with:
{
  "hasFood": false,
  "ingredients": []
}`;

    // Make API call to Gemini with vision capabilities
    const response = await geminiClient.chat.completions.create({
      model: 'gemini-2.0-flash',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: image
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.3, // Lower temperature for more consistent results
    });

    const responseContent = response.choices[0].message?.content;
    
    if (!responseContent) {
      throw new Error('No response from Gemini API');
    }



    // Parse the JSON response
    let analysisResult;
    try {
      // Clean the response in case there's extra text
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : responseContent;
      analysisResult = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      console.error('Raw response:', responseContent);
      
      // Fallback: check if response indicates no food
      if (responseContent.includes('NO_FOOD_DETECTED') || 
          responseContent.toLowerCase().includes('no food') ||
          responseContent.toLowerCase().includes('no ingredients')) {
        return res.status(200).json({
          success: false,
          message: 'No food or ingredients detected in this image. Please take a new photo or upload a different image.',
        });
      }
      
      throw new Error('Failed to parse ingredient analysis results');
    }

    // Validate the response structure
    if (!analysisResult || typeof analysisResult.hasFood !== 'boolean') {
      throw new Error('Invalid response format from Gemini API');
    }

    // Check if no food was detected
    if (!analysisResult.hasFood || !analysisResult.ingredients || analysisResult.ingredients.length === 0) {
      return res.status(200).json({
        success: false,
        message: 'No food or ingredients detected in this image. Please take a new photo or upload a different image.',
      });
    }

    // Validate and clean ingredients
    const validIngredients: DetectedIngredient[] = analysisResult.ingredients
      .filter((ing: any) => ing.name && typeof ing.name === 'string' && ing.confidence && typeof ing.confidence === 'number')
      .map((ing: any) => ({
        name: ing.name.trim(),
        confidence: Math.min(Math.max(ing.confidence, 0.1), 1.0) // Clamp between 0.1 and 1.0
      }))
      .sort((a: DetectedIngredient, b: DetectedIngredient) => b.confidence - a.confidence); // Sort by confidence

    if (validIngredients.length === 0) {
      return res.status(200).json({
        success: false,
        message: 'No valid ingredients could be identified in this image. Please try a clearer photo.',
      });
    }

    console.log(`Successfully identified ${validIngredients.length} ingredients`);

    res.status(200).json({
      success: true,
      ingredients: validIngredients,
    });

  } catch (error) {
    console.error('Image analysis error:', error);
    
    if (error instanceof Error) {
      // Handle specific API errors
      if (error.message.includes('API') || error.message.includes('connection')) {
        return res.status(503).json({
          success: false,
          message: 'AI service is temporarily unavailable. Please try again later.',
        });
      }
      
      if (error.message.includes('image') || error.message.includes('format')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid image format. Please try a different image.',
        });
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to analyze image. Please try again.',
    });
  }
};

// Configure Next.js API route for larger payloads (images can be large)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Allow up to 10MB for image uploads
    },
  },
};

export default apiMiddleware(['POST'], handler, true);
