import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

interface DebugResponse {
  success: boolean;
  data?: any;
  message?: string;
}

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<DebugResponse>
) => {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  try {
    // Get all recipes with isShared field
    const allRecipes = await prisma.recipe.findMany({
      select: {
        id: true,
        name: true,
        userId: true,
        isShared: true,
        sharedAt: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get only shared recipes
    const sharedRecipes = await prisma.recipe.findMany({
      where: { isShared: true },
      select: {
        id: true,
        name: true,
        userId: true,
        isShared: true,
        sharedAt: true,
        createdAt: true
      },
      orderBy: { sharedAt: 'desc' }
    });

    // Get recipes with isShared: true but no sharedAt
    const sharedWithoutDate = await prisma.recipe.findMany({
      where: {
        isShared: true,
        sharedAt: null
      },
      select: {
        id: true,
        name: true,
        userId: true,
        isShared: true,
        sharedAt: true,
        createdAt: true
      }
    });

    // Get recipes with sharedAt but isShared: false
    const dateWithoutShared = await prisma.recipe.findMany({
      where: {
        isShared: false,
        sharedAt: { not: null }
      },
      select: {
        id: true,
        name: true,
        userId: true,
        isShared: true,
        sharedAt: true,
        createdAt: true
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalRecipes: allRecipes.length,
        sharedRecipes: sharedRecipes.length,
        sharedWithoutDate: sharedWithoutDate.length,
        dateWithoutShared: dateWithoutShared.length,
        allRecipesSample: allRecipes.slice(0, 5),
        sharedRecipesSample: sharedRecipes.slice(0, 5),
        sharedWithoutDateSample: sharedWithoutDate,
        dateWithoutSharedSample: dateWithoutShared,
      },
    });
  } catch (error) {
    console.error('Debug shared recipes error:', error);
    res.status(500).json({
      success: false,
      message: `Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
};

export default handler;
