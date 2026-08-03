import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";
import { MessageSquare, User, Clock } from "lucide-react";

interface CommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: any;
  onCommentAdded: () => void;
}

export function CommentDialog({ open, onOpenChange, task, onCommentAdded }: CommentDialogProps) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && task) {
      fetchComments();
    }
  }, [open, task]);

  const fetchComments = async () => {
    if (!task?._id && !task?.id) return;
    
    setLoadingComments(true);
    try {
      const response: any = await apiClient.getTask(task._id || task.id);
      console.log(' Task with comments:', response);
      
      let taskData = response;
      if (response?.data) {
        taskData = response.data;
      }
      
      const taskComments = taskData?.comments || [];
      console.log(' Comments:', taskComments);
      setComments(taskComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comment.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a comment",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await apiClient.addComment(task._id || task.id, comment);
      
      toast({
        title: "Comment Added",
        description: "Comment has been added successfully",
      });
      
      setComment("");
      await fetchComments(); // Refresh comments
      onCommentAdded();
      // Don't close dialog, let user see their comment
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to add comment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCommentDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return "Invalid date";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments - {task?.title}
          </DialogTitle>
          <DialogDescription>
            View and add comments to this task
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Comments Display */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground">
              Comments ({comments.length})
            </h3>
            
            {loadingComments ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                <span className="ml-2 text-sm text-muted-foreground">Loading comments...</span>
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No comments yet. Be the first to comment!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {comments.map((comment, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          {comment.author?.fullName || comment.author?.name || 'Unknown User'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatCommentDate(comment.createdAt)}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {comment.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Comment Form */}
          <div className="border-t pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="comment">Add a Comment *</Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Enter your comment..."
                  rows={3}
                  required
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Adding..." : "Add Comment"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
