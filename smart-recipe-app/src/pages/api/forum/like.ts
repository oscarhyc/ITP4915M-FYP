import type { NextApiRequest, NextApiResponse } from 'next';
import { apiMiddleware } from '../../../lib/apiMiddleware';
import prisma from '../../../lib/prisma';

interface LikeRequest {
  type: 'post' | 'comment';
  id: string;
}

interface LikeResponse {
  success: boolean;
  liked?: boolean;
  likesCount?: number;
  message?: string;
}

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<LikeResponse>,
  user: any
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  const { type, id }: LikeRequest = req.body;

  if (!type || !id || !['post', 'comment'].includes(type)) {
    return res.status(400).json({
      success: false,
      message: 'Valid type (post/comment) and ID are required',
    });
  }

  try {
    let document;
    let updatedDocument;

    if (type === 'post') {
      document = await prisma.forumPost.findUnique({
        where: { id }
      });
    } else {
      document = await prisma.forumComment.findUnique({
        where: { id }
      });
    }

    if (!document) {
      return res.status(404).json({
        success: false,
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} not found`,
      });
    }

    const userId = user.id;
    const likes = document.likes || [];
    const isLiked = likes.includes(userId);

    let updatedLikes: string[];

    if (isLiked) {
      // Unlike - remove user from likes array
      updatedLikes = likes.filter(likeUserId => likeUserId !== userId);
    } else {
      // Like - add user to likes array
      updatedLikes = [...likes, userId];
    }

    if (type === 'post') {
      updatedDocument = await prisma.forumPost.update({
        where: { id },
        data: {
          likes: updatedLikes,
          likesCount: updatedLikes.length
        }
      });
    } else {
      updatedDocument = await prisma.forumComment.update({
        where: { id },
        data: {
          likes: updatedLikes,
          likesCount: updatedLikes.length
        }
      });
    }

    res.status(200).json({
      success: true,
      liked: !isLiked,
      likesCount: updatedDocument.likesCount,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} ${!isLiked ? 'liked' : 'unliked'} successfully`,
    });
  } catch (error) {
    console.error('Like/unlike error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update like status',
    });
  }
};

export default apiMiddleware(['POST'], handler, true);
