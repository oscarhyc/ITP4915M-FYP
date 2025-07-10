import type { NextApiRequest, NextApiResponse } from 'next';
import { apiMiddleware } from '../../../lib/apiMiddleware';

interface DetectedIngredient {
  name: string;
  confidence: number;
}

interface AnalyzeImageResponse {
  success: boolean;
  ingredients?: DetectedIngredient[];
  message?: string;
}

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<AnalyzeImageResponse>,
  user: any
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  const { image } = req.body;

  // Validate input
  if (!image) {
    return res.status(400).json({
      success: false,
      message: 'Image data is required',
    });
  }

  try {
    // First, check and decrement AI Camera usage
    const prisma = require('../../../lib/prisma').default;
    
    // Get current user stats
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
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

    if (currentUses <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No AI Camera uses remaining',
      });
    }

    const newUsesRemaining = currentUses - 1;
    
    // Update user stats
    await prisma.user.update({
      where: { id: user.id },
      data: {
        stats: {
          ...stats,
          aiCameraUsesRemaining: newUsesRemaining,
        }
      }
    });

    // Enhanced mock ingredient detection with varied results
    // In a real implementation, this would call an AI vision service like Google Vision API, AWS Rekognition, or Azure Computer Vision
    const mockIngredients = generateMockIngredients(image);

    // Simulate realistic processing time
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    // Check if any ingredients were detected
    if (mockIngredients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No food or ingredients detected in the image. Please try a clearer photo with visible ingredients.',
      });
    }

    res.status(200).json({
      success: true,
      ingredients: mockIngredients,
    });

  } catch (error) {
    console.error('Image analysis error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to analyze image. Please try again.',
    });
  }
};

// Generate mock ingredients based on image data to provide varied results
function generateMockIngredients(imageData: string): DetectedIngredient[] {
  // Extract some characteristics from the image data to create variation
  const imageHash = hashCode(imageData);
  const imageSize = imageData.length;
  
  // Comprehensive ingredient database with categories
  const ingredientDatabase = {
    vegetables: [
      'Tomato', 'Onion', 'Garlic', 'Carrot', 'Bell Pepper', 'Broccoli', 
      'Spinach', 'Lettuce', 'Cucumber', 'Zucchini', 'Eggplant', 'Potato',
      'Sweet Potato', 'Celery', 'Mushroom', 'Corn', 'Peas', 'Green Beans',
      'Cabbage', 'Cauliflower', 'Asparagus', 'Leek', 'Radish', 'Beet'
    ],
    fruits: [
      'Apple', 'Banana', 'Orange', 'Lemon', 'Lime', 'Strawberry', 'Blueberry',
      'Grape', 'Pineapple', 'Mango', 'Avocado', 'Kiwi', 'Peach', 'Pear',
      'Cherry', 'Watermelon', 'Cantaloupe', 'Raspberry', 'Blackberry'
    ],
    proteins: [
      'Chicken Breast', 'Ground Beef', 'Salmon', 'Tuna', 'Shrimp', 'Eggs',
      'Tofu', 'Black Beans', 'Chickpeas', 'Lentils', 'Pork', 'Turkey',
      'Cod', 'Bacon', 'Ham', 'Cheese', 'Greek Yogurt'
    ],
    grains: [
      'Rice', 'Pasta', 'Bread', 'Quinoa', 'Oats', 'Barley', 'Couscous',
      'Noodles', 'Flour', 'Cereal'
    ],
    herbs: [
      'Basil', 'Parsley', 'Cilantro', 'Rosemary', 'Thyme', 'Oregano',
      'Mint', 'Dill', 'Sage', 'Chives'
    ],
    spices: [
      'Salt', 'Black Pepper', 'Paprika', 'Cumin', 'Turmeric', 'Ginger',
      'Cinnamon', 'Nutmeg', 'Chili Powder', 'Garlic Powder'
    ]
  };

  // Create a pseudo-random selection based on image characteristics
  const allIngredients = [
    ...ingredientDatabase.vegetables,
    ...ingredientDatabase.fruits,
    ...ingredientDatabase.proteins,
    ...ingredientDatabase.grains,
    ...ingredientDatabase.herbs,
    ...ingredientDatabase.spices
  ];

  // Use image hash to determine number of ingredients (2-6)
  const numIngredients = 2 + (Math.abs(imageHash) % 5);
  
  // Select ingredients based on image characteristics
  const selectedIngredients: DetectedIngredient[] = [];
  const usedIndices = new Set<number>();

  for (let i = 0; i < numIngredients; i++) {
    // Create a seed based on image hash and iteration
    const seed = imageHash + i * 1000 + imageSize;
    let index = Math.abs(seed) % allIngredients.length;
    
    // Ensure no duplicates
    while (usedIndices.has(index)) {
      index = (index + 1) % allIngredients.length;
    }
    usedIndices.add(index);

    // Generate confidence based on image characteristics and ingredient
    const baseConfidence = 0.6 + (Math.abs(seed) % 35) / 100; // 0.6 to 0.95
    const confidence = Math.min(0.95, Math.max(0.55, baseConfidence));

    selectedIngredients.push({
      name: allIngredients[index],
      confidence: Math.round(confidence * 100) / 100
    });
  }

  // Sort by confidence (highest first)
  selectedIngredients.sort((a, b) => b.confidence - a.confidence);

  return selectedIngredients;
}

// Simple hash function to create variation based on image data
function hashCode(str: string): number {
  let hash = 0;
  if (str.length === 0) return hash;
  
  // Use a portion of the string to avoid processing huge base64 strings
  const sampleStr = str.substring(0, 1000) + str.substring(str.length - 1000);
  
  for (let i = 0; i < sampleStr.length; i++) {
    const char = sampleStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

export default apiMiddleware(['POST'], handler, true);
