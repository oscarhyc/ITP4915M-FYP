import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { authenticateRequest } from '../../../lib/auth';

interface CreateReviewRequest {
  recipeId: string;
  rating: number;
  comment?: string;
  isPublic?: boolean;
}

interface ReviewsResponse {
  success: boolean;
  reviews?: any[];
  review?: any;
  averageRating?: number;
  totalReviews?: number;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ReviewsResponse>
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    if (req.method === 'GET') {
      // 獲取食譜的評論列表
      const { recipeId } = req.query;
      
      if (!recipeId || typeof recipeId !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Recipe ID is required'
        });
      }

      // 檢查食譜是否存在
      const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId }
      });

      if (!recipe) {
        return res.status(404).json({
          success: false,
          message: 'Recipe not found'
        });
      }

      // 獲取評論列表
      const reviews = await prisma.recipeReview.findMany({
        where: {
          recipeId,
          isPublic: true
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // 計算平均評分
      const totalReviews = reviews.length;
      const averageRating = totalReviews > 0 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
        : 0;

      return res.status(200).json({
        success: true,
        reviews,
        averageRating: Math.round(averageRating * 10) / 10, // 保留一位小數
        totalReviews
      });

    } else if (req.method === 'POST') {
      // 創建新評論
      const { recipeId, rating, comment, isPublic = true }: CreateReviewRequest = req.body;

      if (!recipeId || !rating) {
        return res.status(400).json({
          success: false,
          message: 'Recipe ID and rating are required'
        });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
      }

      // 檢查食譜是否存在
      const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId }
      });

      if (!recipe) {
        return res.status(404).json({
          success: false,
          message: 'Recipe not found'
        });
      }

      // 檢查用戶是否已經評論過這個食譜
      const existingReview = await prisma.recipeReview.findUnique({
        where: {
          recipeId_userId: {
            recipeId,
            userId: user.id
          }
        }
      });

      if (existingReview) {
        // 更新現有評論
        const updatedReview = await prisma.recipeReview.update({
          where: {
            id: existingReview.id
          },
          data: {
            rating,
            comment: comment?.trim(),
            isPublic,
            updatedAt: new Date()
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          }
        });

        return res.status(200).json({
          success: true,
          review: updatedReview
        });
      } else {
        // 創建新評論
        const newReview = await prisma.recipeReview.create({
          data: {
            recipeId,
            userId: user.id,
            userName: user.name,
            rating,
            comment: comment?.trim(),
            isPublic
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          }
        });

        return res.status(201).json({
          success: true,
          review: newReview
        });
      }

    } else if (req.method === 'DELETE') {
      // 刪除評論
      const { reviewId } = req.query;
      
      if (!reviewId || typeof reviewId !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Review ID is required'
        });
      }

      // 檢查評論是否存在且屬於當前用戶
      const review = await prisma.recipeReview.findUnique({
        where: { id: reviewId }
      });

      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Review not found'
        });
      }

      if (review.userId !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own reviews'
        });
      }

      await prisma.recipeReview.delete({
        where: { id: reviewId }
      });

      return res.status(200).json({
        success: true,
        message: 'Review deleted successfully'
      });

    } else {
      return res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Reviews API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
