import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { authenticateRequest } from '../../../lib/auth';

interface CreateCollectionRequest {
  name: string;
  description?: string;
  isPublic?: boolean;
}

interface CollectionsResponse {
  success: boolean;
  collections?: any[];
  collection?: any;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CollectionsResponse>
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
      // 獲取用戶的收藏夾列表
      const collections = await prisma.recipeCollection.findMany({
        where: {
          userId: user.id
        },
        include: {
          _count: {
            select: {
              collectionRecipes: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return res.status(200).json({
        success: true,
        collections
      });

    } else if (req.method === 'POST') {
      // 創建新收藏夾
      const { name, description, isPublic = false }: CreateCollectionRequest = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Collection name is required'
        });
      }

      // 檢查是否已存在同名收藏夾
      const existingCollection = await prisma.recipeCollection.findFirst({
        where: {
          userId: user.id,
          name: name.trim()
        }
      });

      if (existingCollection) {
        return res.status(400).json({
          success: false,
          message: 'A collection with this name already exists'
        });
      }

      const collection = await prisma.recipeCollection.create({
        data: {
          name: name.trim(),
          description: description?.trim(),
          isPublic,
          userId: user.id
        },
        include: {
          _count: {
            select: {
              collectionRecipes: true
            }
          }
        }
      });

      return res.status(201).json({
        success: true,
        collection
      });

    } else if (req.method === 'DELETE') {
      // 刪除收藏夾
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Collection ID is required'
        });
      }

      // 檢查收藏夾是否存在且屬於當前用戶
      const existingCollection = await prisma.recipeCollection.findFirst({
        where: {
          id: id,
          userId: user.id
        }
      });

      if (!existingCollection) {
        return res.status(404).json({
          success: false,
          message: 'Collection not found or access denied'
        });
      }

      // 刪除收藏夾（會自動刪除相關的 CollectionRecipe，因為有 CASCADE）
      await prisma.recipeCollection.delete({
        where: { id: id }
      });

      return res.status(200).json({
        success: true,
        message: 'Collection deleted successfully'
      });

    } else {
      return res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Collections API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
