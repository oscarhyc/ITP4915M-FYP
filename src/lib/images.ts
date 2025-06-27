import { Recipe, ImageGenerationResponse } from '../types/index';
import fs from 'fs';
import path from 'path';

// Placeholder image URLs (you can replace these with your own or use a service like Unsplash)
const PLACEHOLDER_IMAGES = [
  '/images/placeholders/recipe-1.jpg',
  '/images/placeholders/recipe-2.jpg',
  '/images/placeholders/recipe-3.jpg',
  '/images/placeholders/recipe-4.jpg',
  '/images/placeholders/recipe-5.jpg',
  '/images/placeholders/recipe-6.jpg',
  '/images/placeholders/recipe-7.jpg',
  '/images/placeholders/recipe-8.jpg',
  '/images/placeholders/recipe-9.jpg',
  '/images/placeholders/recipe-10.jpg',
];

// Food category to image mapping for better placeholder selection
const CATEGORY_IMAGES: Record<string, string[]> = {
  breakfast: ['/images/placeholders/breakfast-1.jpg', '/images/placeholders/breakfast-2.jpg'],
  lunch: ['/images/placeholders/lunch-1.jpg', '/images/placeholders/lunch-2.jpg'],
  dinner: ['/images/placeholders/dinner-1.jpg', '/images/placeholders/dinner-2.jpg'],
  dessert: ['/images/placeholders/dessert-1.jpg', '/images/placeholders/dessert-2.jpg'],
  salad: ['/images/placeholders/salad-1.jpg', '/images/placeholders/salad-2.jpg'],
  soup: ['/images/placeholders/soup-1.jpg', '/images/placeholders/soup-2.jpg'],
  pasta: ['/images/placeholders/pasta-1.jpg', '/images/placeholders/pasta-2.jpg'],
  pizza: ['/images/placeholders/pizza-1.jpg', '/images/placeholders/pizza-2.jpg'],
  sandwich: ['/images/placeholders/sandwich-1.jpg', '/images/placeholders/sandwich-2.jpg'],
  curry: ['/images/placeholders/curry-1.jpg', '/images/placeholders/curry-2.jpg'],
};

// Generate placeholder images for recipes
export const generateImages = async (recipes: Recipe[], userId: string): Promise<ImageGenerationResponse[]> => {
  try {
    console.info('Generating placeholder images for recipes...');
    
    const imagesWithNames = recipes.map((recipe, index) => {
      const recipeName = recipe.name.toLowerCase();
      let selectedImage: string;

      // Try to match recipe name with category
      const matchedCategory = Object.keys(CATEGORY_IMAGES).find(category => 
        recipeName.includes(category)
      );

      if (matchedCategory && CATEGORY_IMAGES[matchedCategory]) {
        // Use category-specific image
        const categoryImages = CATEGORY_IMAGES[matchedCategory];
        selectedImage = categoryImages[Math.floor(Math.random() * categoryImages.length)];
      } else {
        // Use general placeholder
        selectedImage = PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];
      }

      return {
        imgLink: selectedImage,
        name: recipe.name,
      };
    });

    return imagesWithNames;
  } catch (error) {
    console.error('Error generating placeholder images:', error);
    throw new Error('Failed to generate placeholder images');
  }
};

// Create placeholder image directories and default images
export const setupPlaceholderImages = async (): Promise<void> => {
  try {
    const publicDir = path.join(process.cwd(), 'public');
    const imagesDir = path.join(publicDir, 'images');
    const placeholdersDir = path.join(imagesDir, 'placeholders');

    // Create directories if they don't exist
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    
    if (!fs.existsSync(placeholdersDir)) {
      fs.mkdirSync(placeholdersDir, { recursive: true });
    }

    console.info('Placeholder image directories created successfully');
  } catch (error) {
    console.error('Error setting up placeholder images:', error);
  }
};

// Generate a single placeholder image URL based on recipe characteristics
export const getPlaceholderImage = (recipeName: string, ingredients: Recipe['ingredients']): string => {
  const name = recipeName.toLowerCase();
  const ingredientNames = ingredients.map(ing => ing.name.toLowerCase()).join(' ');
  
  // Check for specific food categories
  if (name.includes('breakfast') || ingredientNames.includes('egg') || ingredientNames.includes('bacon')) {
    return '/images/placeholders/breakfast-1.jpg';
  }
  
  if (name.includes('salad') || ingredientNames.includes('lettuce') || ingredientNames.includes('spinach')) {
    return '/images/placeholders/salad-1.jpg';
  }
  
  if (name.includes('soup') || name.includes('broth')) {
    return '/images/placeholders/soup-1.jpg';
  }
  
  if (name.includes('pasta') || ingredientNames.includes('pasta') || ingredientNames.includes('spaghetti')) {
    return '/images/placeholders/pasta-1.jpg';
  }
  
  if (name.includes('pizza')) {
    return '/images/placeholders/pizza-1.jpg';
  }
  
  if (name.includes('sandwich') || name.includes('burger')) {
    return '/images/placeholders/sandwich-1.jpg';
  }
  
  if (name.includes('curry') || ingredientNames.includes('curry')) {
    return '/images/placeholders/curry-1.jpg';
  }
  
  if (name.includes('dessert') || name.includes('cake') || name.includes('cookie')) {
    return '/images/placeholders/dessert-1.jpg';
  }
  
  // Default to a random general placeholder
  return PLACEHOLDER_IMAGES[Math.floor(Math.random() * PLACEHOLDER_IMAGES.length)];
};

// Future: Integration with local Stable Diffusion
export const generateImageWithStableDiffusion = async (
  prompt: string,
  userId: string
): Promise<string> => {
  // This is a placeholder for future Stable Diffusion integration
  // You can integrate with ComfyUI, Automatic1111, or other local SD setups
  console.info('Stable Diffusion integration not implemented yet, using placeholder');
  return getPlaceholderImage(prompt, []);
};

// Utility to check if an image exists
export const imageExists = (imagePath: string): boolean => {
  try {
    const fullPath = path.join(process.cwd(), 'public', imagePath);
    return fs.existsSync(fullPath);
  } catch {
    return false;
  }
};

// Get a fallback image if the specified image doesn't exist
export const getFallbackImage = (originalPath: string): string => {
  if (imageExists(originalPath)) {
    return originalPath;
  }
  return PLACEHOLDER_IMAGES[0]; // Return first placeholder as fallback
};
