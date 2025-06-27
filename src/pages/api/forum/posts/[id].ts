import type { NextApiRequest, NextApiResponse } from 'next';
import { apiMiddleware } from '../../../../lib/apiMiddleware';
import prisma from '../../../../lib/prisma';

interface PostResponse {
  success: boolean;
  post?: any;
  comments?: any[];
  message?: string;
}

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<PostResponse>,
  user: any
) => {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Invalid post ID',
    });
  }

  if (req.method === 'GET') {
    try {
      // Get the post
      const post = await prisma.forumPost.findUnique({
        where: { id: id as string },
        include: {
          user: {
            select: {
              name: true
            }
          }
        }
      });

      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found',
        });
      }

      // Get comments for the post
      const comments = await prisma.forumComment.findMany({
        where: {
          postId: id as string,
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
      const postWithUserData = {
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
      };

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
        post: postWithUserData,
        comments: commentsWithUserData,
      });
    } catch (error) {
      console.error('Fetch forum post error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch post',
      });
    }
  } else if (req.method === 'PUT') {
    try {
      const { title, content, tags } = req.body;

      // Get the post
      const post = await prisma.forumPost.findUnique({
        where: { id: id as string }
      });

      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found',
        });
      }

      // Check if user owns the post
      if (post.userId !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only edit your own posts',
        });
      }

      // Update the post
      const updateData: any = {};
      if (title) updateData.title = title.trim();
      if (content) updateData.content = content.trim();
      if (tags) updateData.tags = Array.isArray(tags) ? tags.map((tag: string) => tag.toLowerCase().trim()) : [];

      const updatedPost = await prisma.forumPost.update({
        where: { id: id as string },
        data: updateData
      });

      res.status(200).json({
        success: true,
        post: updatedPost,
        message: 'Post updated successfully',
      });
    } catch (error) {
      console.error('Update forum post error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update post',
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Get the post
      const post = await prisma.forumPost.findUnique({
        where: { id: id as string }
      });

      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found',
        });
      }

      // Check if user owns the post
      if (post.userId !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own posts',
        });
      }

      // Delete the post and mark its comments as deleted
      await prisma.forumPost.delete({
        where: { id: id as string }
      });

      await prisma.forumComment.updateMany({
        where: { postId: id as string },
        data: { isDeleted: true }
      });

      res.status(200).json({
        success: true,
        message: 'Post deleted successfully',
      });
    } catch (error) {
      console.error('Delete forum post error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete post',
      });
    }
  } else {
    res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }
};

export default apiMiddleware(['GET', 'PUT', 'DELETE'], handler, true);
