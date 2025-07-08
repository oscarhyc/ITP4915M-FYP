import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { authenticateRequest } from '../../../lib/auth';

interface CreateShoppingListRequest {
  name: string;
  description?: string;
}

interface ShoppingListsResponse {
  success: boolean;
  shoppingLists?: any[];
  shoppingList?: any;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ShoppingListsResponse>
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
      // 獲取用戶的購物清單
      const shoppingLists = await prisma.shoppingList.findMany({
        where: {
          userId: user.id
        },
        include: {
          _count: {
            select: {
              items: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return res.status(200).json({
        success: true,
        shoppingLists
      });

    } else if (req.method === 'POST') {
      // 創建新購物清單
      const { name, description }: CreateShoppingListRequest = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Shopping list name is required'
        });
      }

      const shoppingList = await prisma.shoppingList.create({
        data: {
          name: name.trim(),
          description: description?.trim(),
          userId: user.id
        },
        include: {
          _count: {
            select: {
              items: true
            }
          }
        }
      });

      return res.status(201).json({
        success: true,
        shoppingList
      });

    } else if (req.method === 'DELETE') {
      // 刪除購物清單
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Shopping list ID is required'
        });
      }

      // 檢查購物清單是否存在且屬於當前用戶
      const existingList = await prisma.shoppingList.findFirst({
        where: {
          id: id,
          userId: user.id
        }
      });

      if (!existingList) {
        return res.status(404).json({
          success: false,
          message: 'Shopping list not found or access denied'
        });
      }

      // 刪除購物清單（會自動刪除相關的項目，因為有 CASCADE）
      await prisma.shoppingList.delete({
        where: { id: id }
      });

      return res.status(200).json({
        success: true,
        message: 'Shopping list deleted successfully'
      });

    } else {
      return res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Shopping lists API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
