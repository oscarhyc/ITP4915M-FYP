import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { authenticateRequest } from '../../../../lib/auth';

interface GenerateShoppingListRequest {
  shoppingListName?: string;
  servings?: number;
}

interface GenerateShoppingListResponse {
  success: boolean;
  shoppingList?: any;
  message?: string;
}

// 食材分類映射
const ingredientCategoryMap: { [key: string]: string } = {
  // 蔬菜
  '洋蔥': '蔬菜', '大蒜': '蔬菜', '薑': '蔬菜', '胡蘿蔔': '蔬菜', '馬鈴薯': '蔬菜',
  '番茄': '蔬菜', '青椒': '蔬菜', '紅椒': '蔬菜', '青蔥': '蔬菜', '韭菜': '蔬菜',
  '白菜': '蔬菜', '高麗菜': '蔬菜', '菠菜': '蔬菜', '芹菜': '蔬菜', '小黃瓜': '蔬菜',
  
  // 肉類
  '豬肉': '肉類', '牛肉': '肉類', '雞肉': '肉類', '雞胸肉': '肉類', '雞腿': '肉類',
  '豬絞肉': '肉類', '牛絞肉': '肉類', '培根': '肉類', '香腸': '肉類',
  
  // 海鮮
  '魚': '海鮮', '蝦': '海鮮', '蟹': '海鮮', '鮭魚': '海鮮', '鯖魚': '海鮮',
  '蛤蜊': '海鮮', '花枝': '海鮮', '干貝': '海鮮',
  
  // 乳製品
  '牛奶': '乳製品', '奶油': '乳製品', '起司': '乳製品', '優格': '乳製品',
  '鮮奶油': '乳製品', '奶粉': '乳製品',
  
  // 調料
  '鹽': '調料', '糖': '調料', '醬油': '調料', '醋': '調料', '料酒': '調料',
  '胡椒': '調料', '辣椒': '調料', '八角': '調料', '桂皮': '調料', '花椒': '調料',
  '蠔油': '調料', '麻油': '調料', '橄欖油': '調料', '沙拉油': '調料',
  
  // 穀物
  '米': '穀物', '麵條': '穀物', '麵粉': '穀物', '麵包': '穀物', '燕麥': '穀物',
  '義大利麵': '穀物', '烏龍麵': '穀物',
  
  // 其他
  '雞蛋': '其他', '豆腐': '其他', '豆漿': '其他', '醬菜': '其他'
};

// 智能分類食材
function categorizeIngredient(ingredientName: string): string {
  const name = ingredientName.toLowerCase().trim();
  
  // 直接匹配
  for (const [key, category] of Object.entries(ingredientCategoryMap)) {
    if (name.includes(key.toLowerCase())) {
      return category;
    }
  }
  
  // 關鍵字匹配
  if (name.includes('肉') || name.includes('雞') || name.includes('豬') || name.includes('牛')) {
    return '肉類';
  }
  if (name.includes('魚') || name.includes('蝦') || name.includes('蟹') || name.includes('海')) {
    return '海鮮';
  }
  if (name.includes('菜') || name.includes('瓜') || name.includes('椒') || name.includes('蔥')) {
    return '蔬菜';
  }
  if (name.includes('奶') || name.includes('乳') || name.includes('起司') || name.includes('優格')) {
    return '乳製品';
  }
  if (name.includes('油') || name.includes('醬') || name.includes('鹽') || name.includes('糖')) {
    return '調料';
  }
  if (name.includes('米') || name.includes('麵') || name.includes('粉') || name.includes('麥')) {
    return '穀物';
  }
  
  return '其他';
}

// 調整份量
function adjustQuantity(originalQuantity: string, servingMultiplier: number): string {
  if (servingMultiplier === 1) return originalQuantity;
  
  // 嘗試提取數字
  const numberMatch = originalQuantity.match(/(\d+(?:\.\d+)?)/);
  if (numberMatch) {
    const number = parseFloat(numberMatch[1]);
    const adjustedNumber = number * servingMultiplier;
    return originalQuantity.replace(numberMatch[1], adjustedNumber.toString());
  }
  
  return originalQuantity;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateShoppingListResponse>
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

    const { id: recipeId } = req.query;
    
    if (!recipeId || typeof recipeId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Recipe ID is required'
      });
    }

    const { shoppingListName, servings = 1 }: GenerateShoppingListRequest = req.body;

    // 獲取食譜
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      select: {
        id: true,
        name: true,
        ingredients: true
      }
    });

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    // 創建購物清單
    const listName = shoppingListName || `${recipe.name} - 購物清單`;
    const shoppingList = await prisma.shoppingList.create({
      data: {
        name: listName,
        description: `從食譜「${recipe.name}」自動生成${servings > 1 ? ` (${servings}人份)` : ''}`,
        userId: user.id
      }
    });

    // 處理食材並創建購物清單項目
    const ingredients = recipe.ingredients as any[];
    const shoppingListItems = [];

    for (const ingredient of ingredients) {
      const adjustedQuantity = adjustQuantity(ingredient.quantity, servings);
      const category = categorizeIngredient(ingredient.name);
      
      const item = await prisma.shoppingListItem.create({
        data: {
          name: ingredient.name,
          quantity: adjustedQuantity,
          category,
          shoppingListId: shoppingList.id,
          userId: user.id,
          sourceRecipeId: recipe.id
        }
      });
      
      shoppingListItems.push(item);
    }

    // 獲取完整的購物清單資料
    const completeShoppingList = await prisma.shoppingList.findUnique({
      where: { id: shoppingList.id },
      include: {
        items: {
          include: {
            sourceRecipe: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: [
            { category: 'asc' },
            { name: 'asc' }
          ]
        },
        _count: {
          select: {
            items: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      shoppingList: completeShoppingList
    });

  } catch (error) {
    console.error('Generate shopping list API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
