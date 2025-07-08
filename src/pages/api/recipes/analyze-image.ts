import type { NextApiRequest, NextApiResponse } from 'next';
import { apiMiddleware } from '../../../lib/apiMiddleware';
import axios from 'axios';

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
    const usageResponse = await axios.post(`${process.env.NEXTAUTH_URL || 'http://localhost:3002'}/api/user/ai-camera-usage`, {
      action: 'use'
    }, {
      headers: {
        'Cookie': req.headers.cookie || '',
      }
    });

    if (!usageResponse.data.success) {
      return res.status(400).json({
        success: false,
        message: usageResponse.data.message || 'No AI Camera uses remaining',
      });
    }

    // Mock ingredient detection for now
    // In a real implementation, this would call an AI vision service
    const mockIngredients: DetectedIngredient[] = [
      { name: '番茄', confidence: 0.95 },
      { name: '洋蔥', confidence: 0.87 },
      { name: '大蒜', confidence: 0.82 },
      { name: '胡蘿蔔', confidence: 0.78 }
    ];

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

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
    
    if (axios.isAxiosError(error) && error.response?.data?.message) {
      return res.status(error.response.status).json({
        success: false,
        message: error.response.data.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to analyze image. Please try again.',
    });
  }
};

export default apiMiddleware(['POST'], handler, true);
