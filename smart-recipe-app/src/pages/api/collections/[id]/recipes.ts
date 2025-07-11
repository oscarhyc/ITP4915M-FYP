import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { authenticateRequest } from '../../../../lib/auth';

interface AddRecipeRequest {
  recipeId: string;
  notes?: string;
}

interface CollectionRecipesResponse {
  success: boolean;
  recipes?: any[];
  collection?: any;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CollectionRecipesResponse>
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const { id: collectionId } = req.query;
    
    if (!collectionId || typeof collectionId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Collection ID is required'
      });
    }

    // Check if collection exists and belongs to current user
    const collection = await prisma.recipeCollection.findFirst({
      where: {
        id: collectionId,
        userId: user.id
      }
    });

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found or access denied'
      });
    }

    if (req.method === 'GET') {
      // Get collection details and recipe list
      const collectionWithRecipes = await prisma.recipeCollection.findFirst({
        where: {
          id: collectionId,
          userId: user.id
        },
        include: {
          collectionRecipes: {
            include: {
              recipe: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      image: true
                    }
                  }
                }
              }
            },
            orderBy: {
              addedAt: 'desc'
            }
          },
          _count: {
            select: {
              collectionRecipes: true
            }
          }
        }
      });

      if (!collectionWithRecipes) {
        return res.status(404).json({
          success: false,
          message: 'Collection not found'
        });
      }

      return res.status(200).json({
        success: true,
        collection: collectionWithRecipes
      });

    } else if (req.method === 'POST') {
      // Add recipe to collection
      const { recipeId, notes }: AddRecipeRequest = req.body;

      if (!recipeId) {
        return res.status(400).json({
          success: false,
          message: 'Recipe ID is required'
        });
      }

      // Check if recipe exists
      const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId }
      });

      if (!recipe) {
        return res.status(404).json({
          success: false,
          message: 'Recipe not found'
        });
      }

      // Check if already in collection
      const existingEntry = await prisma.collectionRecipe.findUnique({
        where: {
          collectionId_recipeId: {
            collectionId,
            recipeId
          }
        }
      });

      if (existingEntry) {
        return res.status(400).json({
          success: false,
          message: 'Recipe is already in this collection'
        });
      }

      // Add to collection
      await prisma.collectionRecipe.create({
        data: {
          collectionId,
          recipeId,
          userId: user.id,
          notes: notes?.trim()
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Recipe added to collection successfully'
      });

    } else if (req.method === 'DELETE') {
      // Remove recipe from collection
      const { recipeId } = req.query;

      if (!recipeId || typeof recipeId !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Recipe ID is required'
        });
      }

      // Check if in collection
      const existingEntry = await prisma.collectionRecipe.findUnique({
        where: {
          collectionId_recipeId: {
            collectionId,
            recipeId
          }
        }
      });

      if (!existingEntry) {
        return res.status(404).json({
          success: false,
          message: 'Recipe not found in this collection'
        });
      }

      // Check if belongs to current user
      if (existingEntry.userId !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Remove from collection
      await prisma.collectionRecipe.delete({
        where: {
          id: existingEntry.id
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Recipe removed from collection successfully'
      });

    } else {
      return res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Collection recipes API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
