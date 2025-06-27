import type { NextApiRequest, NextApiResponse } from 'next';
import { apiMiddleware } from '../../../lib/apiMiddleware';
import prisma from '../../../lib/prisma';

interface CreateCommentRequest {
  postId: string;
  content: string;
  parentCommentId?: string;
}

interface CommentsResponse {
  success: boolean;
  comment?: any;
  comments?: any[];
  message?: string;
}

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<CommentsResponse>,
  user: any
) => {
  if (req.method === 'POST') {
    try {
      const { postId, content, parentCommentId }: CreateCommentRequest = req.body;

      // Validation
      if (!postId || !content) {
        return res.status(400).json({
          success: false,
          message: 'Post ID and content are required',
        });
      }

      // Check if post exists
      const post = await prisma.forumPost.findUnique({
        where: { id: postId }
      });
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found',
        });
      }

      // Check if post is locked
      if (post.isLocked) {
        return res.status(403).json({
          success: false,
          message: 'This post is locked and cannot receive new comments',
        });
      }

      // If replying to a comment, check if parent comment exists
      if (parentCommentId) {
        const parentComment = await prisma.forumComment.findUnique({
          where: { id: parentCommentId }
        });
        if (!parentComment || parentComment.postId !== postId) {
          return res.status(404).json({
            success: false,
            message: 'Parent comment not found',
          });
        }
      }

      // Get user info
      const userInfo = await prisma.user.findUnique({
        where: { id: user.id },
        select: { name: true }
      });

      // Create new comment
      const savedComment = await prisma.forumComment.create({
        data: {
          postId,
          content: content.trim(),
          userId: user.id,
          userName: userInfo?.name || 'Anonymous',
          parentCommentId: parentCommentId || null,
          likes: [],
          likesCount: 0,
          isDeleted: false,
        }
      });

      // Update post's comment count
      await prisma.forumPost.update({
        where: { id: postId },
        data: {
          commentsCount: {
            increment: 1
          }
        }
      });

      res.status(201).json({
        success: true,
        comment: savedComment,
        message: 'Comment created successfully',
      });
    } catch (error) {
      console.error('Create forum comment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create comment',
      });
    }
  } else if (req.method === 'GET') {
    try {
      const { postId } = req.query;

      if (!postId) {
        return res.status(400).json({
          success: false,
          message: 'Post ID is required',
        });
      }

      // Get comments for the post
      const comments = await prisma.forumComment.findMany({
        where: {
          postId: postId as string,
          isDeleted: false
        },
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              name: true
            }
          }
        }
      });

      // Add user interaction data
      const commentsWithUserData = comments.map(comment => ({
        id: comment.id,
        postId: comment.postId,
        content: comment.content,
        userId: comment.userId,
        userName: comment.user.name,
        parentCommentId: comment.parentCommentId,
        likes: comment.likes,
        likesCount: comment.likesCount,
        isDeleted: comment.isDeleted,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        isLikedByCurrentUser: user ? (comment.likes || []).includes(user.id) : false,
        isOwnComment: user ? comment.userId === user.id : false,
      }));

      res.status(200).json({
        success: true,
        comments: commentsWithUserData,
      });
    } catch (error) {
      console.error('Fetch forum comments error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch comments',
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
