import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { authenticateRequest } from '../../../../lib/auth';

interface AddItemRequest {
  name: string;
  quantity: string;
  unit?: string;
  category?: string;
  estimatedPrice?: number;
  notes?: string;
  sourceRecipeId?: string;
}

interface UpdateItemRequest {
  name?: string;
  quantity?: string;
  unit?: string;
  category?: string;
  isCompleted?: boolean;
  estimatedPrice?: number;
  notes?: string;
}

interface ShoppingListItemsResponse {
  success: boolean;
  items?: any[];
  item?: any;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ShoppingListItemsResponse>
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const { id: shoppingListId } = req.query;
    
    if (!shoppingListId || typeof shoppingListId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Shopping list ID is required'
      });
    }

    // Check if shopping list exists and belongs to current user
    const shoppingList = await prisma.shoppingList.findFirst({
      where: {
        id: shoppingListId,
        userId: user.id
      }
    });

    if (!shoppingList) {
      return res.status(404).json({
        success: false,
        message: 'Shopping list not found or access denied'
      });
    }

    if (req.method === 'GET') {
      // Get shopping list items
      const items = await prisma.shoppingListItem.findMany({
        where: {
          shoppingListId,
          userId: user.id
        },
        include: {
          sourceRecipe: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: [
          { isCompleted: 'asc' },
          { category: 'asc' },
          { createdAt: 'desc' }
        ]
      });

      return res.status(200).json({
        success: true,
        items
      });

    } else if (req.method === 'POST') {
      // Add new item to shopping list
      const { 
        name, 
        quantity, 
        unit, 
        category, 
        estimatedPrice, 
        notes, 
        sourceRecipeId 
      }: AddItemRequest = req.body;

      if (!name || !quantity) {
        return res.status(400).json({
          success: false,
          message: 'Item name and quantity are required'
        });
      }

      // If source recipe is specified, check if it exists
      if (sourceRecipeId) {
        const recipe = await prisma.recipe.findUnique({
          where: { id: sourceRecipeId }
        });

        if (!recipe) {
          return res.status(404).json({
            success: false,
            message: 'Source recipe not found'
          });
        }
      }

      const item = await prisma.shoppingListItem.create({
        data: {
          name: name.trim(),
          quantity: quantity.trim(),
          unit: unit?.trim(),
          category: category?.trim(),
          estimatedPrice,
          notes: notes?.trim(),
          shoppingListId,
          userId: user.id,
          sourceRecipeId
        },
        include: {
          sourceRecipe: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      return res.status(201).json({
        success: true,
        item
      });

    } else if (req.method === 'PUT') {
      // Update shopping list item
      const { itemId } = req.query;
      
      if (!itemId || typeof itemId !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Item ID is required'
        });
      }

      const updateData: UpdateItemRequest = req.body;

      // Check if item exists and belongs to current user
      const existingItem = await prisma.shoppingListItem.findFirst({
        where: {
          id: itemId,
          shoppingListId,
          userId: user.id
        }
      });

      if (!existingItem) {
        return res.status(404).json({
          success: false,
          message: 'Item not found or access denied'
        });
      }

      const updatedItem = await prisma.shoppingListItem.update({
        where: { id: itemId },
        data: {
          ...(updateData.name && { name: updateData.name.trim() }),
          ...(updateData.quantity && { quantity: updateData.quantity.trim() }),
          ...(updateData.unit !== undefined && { unit: updateData.unit?.trim() }),
          ...(updateData.category !== undefined && { category: updateData.category?.trim() }),
          ...(updateData.isCompleted !== undefined && { isCompleted: updateData.isCompleted }),
          ...(updateData.estimatedPrice !== undefined && { estimatedPrice: updateData.estimatedPrice }),
          ...(updateData.notes !== undefined && { notes: updateData.notes?.trim() }),
          updatedAt: new Date()
        },
        include: {
          sourceRecipe: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      return res.status(200).json({
        success: true,
        item: updatedItem
      });

    } else if (req.method === 'DELETE') {
      // Delete shopping list item
      const { itemId } = req.query;
      
      if (!itemId || typeof itemId !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Item ID is required'
        });
      }

      // Check if item exists and belongs to current user
      const existingItem = await prisma.shoppingListItem.findFirst({
        where: {
          id: itemId,
          shoppingListId,
          userId: user.id
        }
      });

      if (!existingItem) {
        return res.status(404).json({
          success: false,
          message: 'Item not found or access denied'
        });
      }

      await prisma.shoppingListItem.delete({
        where: { id: itemId }
      });

      return res.status(200).json({
        success: true,
        message: 'Item deleted successfully'
      });

    } else {
      return res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Shopping list items API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
