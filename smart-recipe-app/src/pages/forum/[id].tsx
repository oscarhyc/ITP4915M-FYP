import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';

interface ForumPost {
  id: string;
  title: string;
  content: string;
  category: string;
  userName: string;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  isLikedByCurrentUser: boolean;
  isOwnPost: boolean;
  createdAt: string;
}

interface Comment {
  id: string;
  content: string;
  userName: string;
  parentCommentId?: string;
  likesCount: number;
  isLikedByCurrentUser: boolean;
  isOwnComment: boolean;
  createdAt: string;
  replies?: Comment[];
}

export default function ForumPost() {
  const { user } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPost();
    }
  }, [id]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/forum/posts/${id}`);
      if (response.data.success) {
        setPost(response.data.post);
        setComments(response.data.comments);
      }
    } catch (error) {
      console.error('Error fetching post:', error);
      router.push('/forum');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (type: 'post' | 'comment', itemId: string) => {
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    try {
      const response = await axios.post('/api/forum/like', {
        type,
        id: itemId,
      });

      if (response.data.success) {
        if (type === 'post' && post) {
          setPost({
            ...post,
            isLikedByCurrentUser: response.data.liked,
            likesCount: response.data.likesCount,
          });
        } else {
          setComments(comments.map(comment =>
            comment.id === itemId
              ? {
                  ...comment,
                  isLikedByCurrentUser: response.data.liked,
                  likesCount: response.data.likesCount
                }
              : comment
          ));
        }
      }
    } catch (error) {
      console.error('Error liking:', error);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const response = await axios.post('/api/forum/comments', {
        postId: id,
        content: newComment,
        parentCommentId: replyTo,
      });

      if (response.data.success) {
        setNewComment('');
        setReplyTo(null);
        fetchPost(); // Refresh to get updated comments
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      tips: '💡',
      ingredients: '🛒',
      questions: '❓',
      reviews: '⭐',
    };
    return icons[category] || '📋';
  };

  const organizeComments = (comments: Comment[]) => {
    const topLevel = comments.filter(c => !c.parentCommentId);
    const replies = comments.filter(c => c.parentCommentId);

    return topLevel.map(comment => ({
      ...comment,
      replies: replies.filter(r => r.parentCommentId === comment.id),
    }));
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading post...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!post) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">❌</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Post not found</h3>
            <p className="text-gray-600 mb-4">The post you&apos;re looking for doesn&apos;t exist.</p>
            <button
              onClick={() => router.push('/forum')}
              className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
            >
              Back to Forum
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const organizedComments = organizeComments(comments);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/forum')}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <span>←</span> Back to Forum
        </button>

        {/* Post */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">{getCategoryIcon(post.category)}</span>
              <span className="text-sm text-gray-500 capitalize">{post.category}</span>
            </div>
            <span className="text-sm text-gray-500">{formatDate(post.createdAt)}</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">{post.title}</h1>
          
          <div className="prose max-w-none mb-4">
            <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
          </div>

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {post.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>By {post.userName}</span>
              <span>{post.commentsCount} comments</span>
            </div>

            <button
              onClick={() => handleLike('post', post.id)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors ${
                post.isLikedByCurrentUser
                  ? 'bg-red-100 text-red-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{post.isLikedByCurrentUser ? '❤️' : '🤍'}</span>
              <span>{post.likesCount}</span>
            </button>
          </div>
        </div>

        {/* Comment Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {replyTo ? 'Reply to Comment' : 'Add Comment'}
          </h3>
          
          {replyTo && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Replying to a comment</p>
              <button
                onClick={() => setReplyTo(null)}
                className="text-sm text-orange-500 hover:text-orange-600"
              >
                Cancel Reply
              </button>
            </div>
          )}

          <form onSubmit={handleSubmitComment}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write your comment..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-4"
              required
            />
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Posting...' : 'Post Comment'}
              </button>
              {replyTo && (
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Comments */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Comments ({comments.length})</h3>
          
          {organizedComments.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-gray-600">No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            organizedComments.map(comment => (
              <div key={comment.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="font-medium text-gray-900">{comment.userName}</span>
                  <span className="text-sm text-gray-500">{formatDate(comment.createdAt)}</span>
                </div>
                
                <p className="text-gray-700 mb-3 whitespace-pre-wrap">{comment.content}</p>
                
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleLike('comment', comment.id)}
                    className={`flex items-center gap-1 text-sm transition-colors ${
                      comment.isLikedByCurrentUser
                        ? 'text-red-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span>{comment.isLikedByCurrentUser ? '❤️' : '🤍'}</span>
                    <span>{comment.likesCount}</span>
                  </button>
                  
                  <button
                    onClick={() => setReplyTo(comment.id)}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Reply
                  </button>
                </div>

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-6 mt-4 space-y-3 border-l-2 border-gray-100 pl-4">
                    {comment.replies.map((reply: any) => (
                      <div key={reply.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-medium text-gray-900">{reply.userName}</span>
                          <span className="text-sm text-gray-500">{formatDate(reply.createdAt)}</span>
                        </div>
                        
                        <p className="text-gray-700 mb-2 whitespace-pre-wrap">{reply.content}</p>
                        
                        <button
                          onClick={() => handleLike('comment', reply.id)}
                          className={`flex items-center gap-1 text-sm transition-colors ${
                            reply.isLikedByCurrentUser
                              ? 'text-red-600'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <span>{reply.isLikedByCurrentUser ? '❤️' : '🤍'}</span>
                          <span>{reply.likesCount}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
