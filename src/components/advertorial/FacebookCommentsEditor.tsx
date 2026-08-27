import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FacebookComment, FacebookCommentsBlock, generateBlockId } from '@/types/advertorial';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Pencil, Trash2, Plus, User, Check, X, MessageCircle, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FacebookCommentsEditorProps {
  block: FacebookCommentsBlock;
  updateBlock: <T>(id: string, updates: Partial<T>) => void;
}

const createEmptyComment = (): FacebookComment => ({
  id: generateBlockId(),
  avatarUrl: '',
  name: '',
  text: '',
  timestamp: '1 d',
  likeCount: 0,
  loveCount: 0,
  hahaCount: 0,
  wowCount: 0,
  replies: [],
});

interface CommentFormData {
  avatarUrl: string;
  name: string;
  text: string;
  imageUrl?: string;
  timestamp: string;
  likeCount: number;
  loveCount: number;
  hahaCount: number;
  wowCount: number;
}

export const FacebookCommentsEditor: React.FC<FacebookCommentsEditorProps> = ({ block, updateBlock }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingParentId, setEditingParentId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CommentFormData | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => prev ? { ...prev, avatarUrl: reader.result as string } : prev);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => prev ? { ...prev, imageUrl: reader.result as string } : prev);
      };
      reader.readAsDataURL(file);
    }
  };

  // Live-sync formData changes to the block so the preview updates in real-time
  useEffect(() => {
    if (!editingId || !formData) return;

    const updatedComment: Partial<FacebookComment> = {
      avatarUrl: formData.avatarUrl,
      name: formData.name,
      text: formData.text,
      imageUrl: formData.imageUrl || undefined,
      timestamp: formData.timestamp,
      likeCount: formData.likeCount,
      loveCount: formData.loveCount,
      hahaCount: formData.hahaCount,
      wowCount: formData.wowCount,
    };

    if (editingParentId) {
      const newComments = block.comments.map(c => {
        if (c.id === editingParentId) {
          return {
            ...c,
            replies: c.replies?.map(r => r.id === editingId ? { ...r, ...updatedComment } : r) || [],
          };
        }
        return c;
      });
      updateBlock(block.id, { comments: newComments });
    } else {
      const newComments = block.comments.map(c =>
        c.id === editingId ? { ...c, ...updatedComment } : c
      );
      updateBlock(block.id, { comments: newComments });
    }
  }, [formData]);

  const findComment = (id: string): { comment: FacebookComment; parentId: string | null } | null => {
    for (const comment of block.comments) {
      if (comment.id === id) return { comment, parentId: null };
      if (comment.replies) {
        for (const reply of comment.replies) {
          if (reply.id === id) return { comment: reply, parentId: comment.id };
        }
      }
    }
    return null;
  };

  const handleEditComment = (id: string) => {
    const found = findComment(id);
    if (found) {
      setEditingId(id);
      setEditingParentId(found.parentId);
      setFormData({
        avatarUrl: found.comment.avatarUrl,
        name: found.comment.name,
        text: found.comment.text,
        imageUrl: found.comment.imageUrl,
        timestamp: found.comment.timestamp,
        likeCount: found.comment.likeCount,
        loveCount: found.comment.loveCount,
        hahaCount: found.comment.hahaCount,
        wowCount: found.comment.wowCount,
      });
    }
  };

  const handleAddComment = () => {
    const newComment = createEmptyComment();
    const newComments = [...block.comments, newComment];
    updateBlock(block.id, { comments: newComments });
    handleEditComment(newComment.id);
  };

  const handleAddReply = (parentId: string) => {
    const newReply = createEmptyComment();
    const newComments = block.comments.map(c => {
      if (c.id === parentId) {
        return { ...c, replies: [...(c.replies || []), newReply] };
      }
      return c;
    });
    updateBlock(block.id, { comments: newComments });
    handleEditComment(newReply.id);
  };

  const handleDeleteComment = (id: string) => {
    const found = findComment(id);
    if (!found) return;

    if (found.parentId) {
      // It's a reply
      const newComments = block.comments.map(c => {
        if (c.id === found.parentId) {
          return { ...c, replies: c.replies?.filter(r => r.id !== id) || [] };
        }
        return c;
      });
      updateBlock(block.id, { comments: newComments });
    } else {
      // It's a top-level comment
      const newComments = block.comments.filter(c => c.id !== id);
      updateBlock(block.id, { comments: newComments });
    }

    if (editingId === id) {
      setEditingId(null);
      setFormData(null);
    }
  };

  const handleSaveComment = () => {
    if (!editingId || !formData) return;

    const updatedComment: Partial<FacebookComment> = {
      avatarUrl: formData.avatarUrl,
      name: formData.name,
      text: formData.text,
      imageUrl: formData.imageUrl || undefined,
      timestamp: formData.timestamp,
      likeCount: formData.likeCount,
      loveCount: formData.loveCount,
      hahaCount: formData.hahaCount,
      wowCount: formData.wowCount,
    };

    if (editingParentId) {
      // It's a reply
      const newComments = block.comments.map(c => {
        if (c.id === editingParentId) {
          return {
            ...c,
            replies: c.replies?.map(r => r.id === editingId ? { ...r, ...updatedComment } : r) || [],
          };
        }
        return c;
      });
      updateBlock(block.id, { comments: newComments });
    } else {
      // It's a top-level comment
      const newComments = block.comments.map(c => 
        c.id === editingId ? { ...c, ...updatedComment } : c
      );
      updateBlock(block.id, { comments: newComments });
    }

    setEditingId(null);
    setFormData(null);
    setEditingParentId(null);
  };

  const handleCancelEdit = () => {
    // If it's a new empty comment, delete it
    if (formData && !formData.name && !formData.text) {
      handleDeleteComment(editingId!);
    }
    setEditingId(null);
    setFormData(null);
    setEditingParentId(null);
  };

  return (
    <div className="space-y-4 pb-4 pr-1">
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Comments</Label>
        <div className="space-y-2 pr-2">
          {block.comments.map((comment) => (
            <div key={comment.id} className="space-y-1">
              {/* Main comment */}
              <div 
                className={cn(
                  "flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors",
                  editingId === comment.id ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"
                )}
                onClick={() => handleEditComment(comment.id)}
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {comment.avatarUrl ? (
                    <img src={comment.avatarUrl} alt={comment.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{comment.name || 'Unnamed'}</p>
                  <p className="text-xs text-muted-foreground truncate">{comment.text || 'No text...'}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => { e.stopPropagation(); handleEditComment(comment.id); }}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); handleDeleteComment(comment.id); }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-6 space-y-1">
                  {comment.replies.map((reply) => (
                    <div 
                      key={reply.id}
                      className={cn(
                        "flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors",
                        editingId === reply.id ? "border-primary bg-primary/5" : "border-border/50 hover:bg-secondary/50"
                      )}
                      onClick={() => handleEditComment(reply.id)}
                    >
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {reply.avatarUrl ? (
                          <img src={reply.avatarUrl} alt={reply.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold truncate">{reply.name || 'Unnamed'}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{reply.text || 'No text...'}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={(e) => { e.stopPropagation(); handleEditComment(reply.id); }}
                        >
                          <Pencil className="w-2.5 h-2.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); handleDeleteComment(reply.id); }}
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Reply button */}
              {editingId !== comment.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-6 h-6 text-xs text-muted-foreground"
                  onClick={() => handleAddReply(comment.id)}
                >
                  <MessageCircle className="w-3 h-3 mr-1" />
                  Add Reply
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={handleAddComment}
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Comment
        </Button>
      </div>

      {/* Edit Form */}
      {editingId && formData && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">
                Editing: {formData.name || 'New Comment'}
                {editingParentId && <span className="text-muted-foreground ml-1">(Reply)</span>}
              </Label>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Avatar Image</Label>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-9 text-sm"
                onClick={() => avatarInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                {formData.avatarUrl ? 'Change Avatar' : 'Upload Avatar'}
              </Button>
              {formData.avatarUrl && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-border">
                    <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-destructive"
                    onClick={() => setFormData({ ...formData, avatarUrl: '' })}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Comment Text</Label>
              <Textarea
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                placeholder="Write a comment..."
                className="text-sm min-h-[80px] resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Comment Image (Optional)</Label>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-9 text-sm"
                onClick={() => imageInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                {formData.imageUrl ? 'Change Image' : 'Upload Image'}
              </Button>
              {formData.imageUrl && (
                <div className="space-y-1">
                  <div className="rounded-md border border-border overflow-hidden">
                    <img src={formData.imageUrl} alt="Comment" className="w-full h-20 object-cover" />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-destructive"
                    onClick={() => setFormData({ ...formData, imageUrl: '' })}
                  >
                    Remove Image
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Timestamp</Label>
              <Input
                value={formData.timestamp}
                onChange={(e) => setFormData({ ...formData, timestamp: e.target.value })}
                placeholder="5 d"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">👍 Like Count</Label>
              <Input
                type="number"
                min={0}
                value={formData.likeCount}
                onChange={(e) => setFormData({ ...formData, likeCount: Number(e.target.value) || 0 })}
                className="h-9 text-sm"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Button 
                size="sm" 
                className="w-full"
                onClick={handleSaveComment}
              >
                <Check className="w-3 h-3 mr-1" />
                Done
              </Button>
              <Button 
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleCancelEdit}
              >
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
              <Button 
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => handleDeleteComment(editingId)}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
