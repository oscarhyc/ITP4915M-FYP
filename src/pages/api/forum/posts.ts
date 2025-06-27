import type { NextApiRequest, NextApiResponse } from 'next';
import { apiMiddleware } from '../../../lib/apiMiddleware';
import prisma from '../../../lib/prisma';

interface CreatePostRequest {
  title: string;
  content: string;
  category: 'tips' | 'ingredients' | 'questions' | 'reviews';
  tags?: string[];
}

interface PostsResponse {
  success: boolean;
  posts?: any[];
  post?: any;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<PostsResponse>,
  user: any
) => {
  if (req.method === 'GET') {
    try {
      const { category, search, tags, page = 1, limit = 10 } = req.query;

      // Build where clause
      let where: any = {};

      if (category && category !== 'all') {
        where.category = category;
      }

      if (search) {
        where.OR = [
          { title: { contains: search as string, mode: 'insensitive' } },
          { content: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags];
        where.tags = { hasSome: tagArray };
      }

      // Pagination
      const pageNum = parseInt(page as string);
      const limitNum = Math.min(parseInt(limit as string), 50);
      const skip = (pageNum - 1) * limitNum;

      // Get posts with pagination and user info
      const posts = await prisma.forumPost.findMany({
        where,
        orderBy: [
          { isSticky: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limitNum,
        include: {
          user: {
            select: {
              name: true
            }
          }
        }
      });

      // Get total count for pagination
      const total = await prisma.forumPost.count({ where });
      const pages = Math.ceil(total / limitNum);

      // Add user interaction data
      const postsWithUserData = posts.map(post => ({
        id: post.id,
        title: post.title,
        content: post.content,
        category: post.category,
        userId: post.userId,
        userName: post.user.name,
        tags: post.tags,
        likes: post.likes,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        isSticky: post.isSticky,
        isLocked: post.isLocked,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        isLikedByCurrentUser: user ? (post.likes || []).includes(user.id) : false,
        isOwnPost: user ? post.userId === user.id : false,
      }));

      res.status(200).json({
        success: true,
        posts: postsWithUserData,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages,
        },
      });
    } catch (error) {
      console.error('Fetch forum posts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch forum posts',
      });
    }
  } else if (req.method === 'POST') {
    try {
      const { title, content, category, tags = [] }: CreatePostRequest = req.body;

      // Validation
      if (!title || !content || !category) {
        return res.status(400).json({
          success: false,
          message: 'Title, content, and category are required',
        });
      }

      if (!['tips', 'ingredients', 'questions', 'reviews'].includes(category)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category',
        });
      }

      // Get user info
      const userInfo = await prisma.user.findUnique({
        where: { id: user.id },
        select: { name: true }
      });

      // Create new post
      const savedPost = await prisma.forumPost.create({
        data: {
          title: title.trim(),
          content: content.trim(),
          category,
          userId: user.id,
          userName: userInfo?.name || 'Anonymous',
          tags: Array.isArray(tags) ? tags.map((tag: string) => tag.toLowerCase().trim()) : [],
          likes: [],
          likesCount: 0,
          commentsCount: 0,
          isSticky: false,
          isLocked: false,
        }
      });

      res.status(201).json({
        success: true,
        post: savedPost,
        message: 'Post created successfully',
      });
    } catch (error) {
      console.error('Create forum post error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create post',
      });
    }
  } else {
    res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }
};

export default apiMiddleware(['GET', 'POST'], handler, true);
