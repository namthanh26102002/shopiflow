import React, { useState } from 'react';
import { Copy, Check, Link, Code, BarChart3, Loader2, ExternalLink } from 'lucide-react';
import { useQuiz } from '@/contexts/QuizContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PublishDialog: React.FC<PublishDialogProps> = ({ open, onOpenChange }) => {
  const { quiz, saveQuiz, refreshQuiz } = useQuiz();
  const [copied, setCopied] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const publishedBase = 'https://shopiflow-quiz.lovable.app';
  const quizUrl = `${publishedBase}/quiz/${quiz.id}`;
  const embedCode = `<iframe src="${quizUrl}" width="100%" height="700" frameborder="0" style="border-radius: 8px;"></iframe>`;

  const isPublished = !!quiz.publishedUrl;

  const handleCopy = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handlePublish = async () => {
    // Validate quiz has questions
    if (quiz.questions.length === 0) {
      toast.error('Add at least one question before publishing');
      return;
    }

    setPublishing(true);
    try {
      // Save all local changes first to prevent data loss (e.g. CTA URL)
      await saveQuiz();

      const { error } = await supabase
        .from('quizzes')
        .update({ published_url: quizUrl })
        .eq('id', quiz.id);

      if (error) throw error;

      // Refresh quiz to get updated publishedUrl
      await refreshQuiz();

      toast.success('Quiz published successfully!');
      
      // Copy link to clipboard
      await navigator.clipboard.writeText(quizUrl);
      setCopied('link');
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Error publishing quiz:', error);
      toast.error('Failed to publish quiz');
    } finally {
      setPublishing(false);
    }
  };

  const handleUpdate = async () => {
    setPublishing(true);
    try {
      await saveQuiz();
      toast.success('Live quiz updated successfully!');
    } catch (error) {
      console.error('Error updating quiz:', error);
      toast.error('Failed to update live quiz');
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    setPublishing(true);
    try {
      const { error } = await supabase
        .from('quizzes')
        .update({ published_url: null })
        .eq('id', quiz.id);

      if (error) throw error;

      await refreshQuiz();
      toast.success('Quiz unpublished');
    } catch (error) {
      console.error('Error unpublishing quiz:', error);
      toast.error('Failed to unpublish quiz');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Publish Quiz</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="share" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="share" className="flex items-center gap-1.5">
              <Link className="w-4 h-4" />
              Share
            </TabsTrigger>
            <TabsTrigger value="embed" className="flex items-center gap-1.5">
              <Code className="w-4 h-4" />
              Embed
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="share" className="mt-4 space-y-4">
            {!isPublished ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
                  <Link className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Ready to publish?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Once published, your quiz will be accessible via a public link.
                </p>
                <Button
                  onClick={handlePublish}
                  disabled={publishing || quiz.questions.length === 0}
                  className="w-full"
                  style={{ backgroundColor: quiz.settings.primaryColor }}
                >
                  {publishing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    'Publish Quiz'
                  )}
                </Button>
                {quiz.questions.length === 0 && (
                  <p className="text-xs text-destructive mt-2">Add questions to publish</p>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium text-green-600">Live</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Share this link with your customers to start the quiz.
                </p>
                <div className="flex gap-2">
                  <Input 
                    value={quizUrl} 
                    readOnly 
                    className="input-clean font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy(quizUrl, 'link')}
                    className="flex-shrink-0"
                  >
                    {copied === 'link' ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                
                <div className="mt-4 flex flex-col gap-2">
                  <Button
                    onClick={handleUpdate}
                    disabled={publishing}
                    className="w-full"
                    style={{ backgroundColor: quiz.settings.primaryColor }}
                  >
                    {publishing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Live Quiz'
                    )}
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => window.open(quizUrl, '_blank')}
                      className="flex-1"
                    >
                      Preview Quiz
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleUnpublish}
                      disabled={publishing}
                      className="text-destructive hover:text-destructive"
                    >
                      Unpublish
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 bg-secondary/50 rounded-xl">
              <p className="text-sm font-medium text-foreground mb-1">Pro tip</p>
              <p className="text-xs text-muted-foreground">
                Add UTM parameters to track where your quiz traffic comes from.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="embed" className="mt-4 space-y-4">
            {!isPublished ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">
                  Publish your quiz first to get the embed code.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  Paste this code on your website to embed the quiz.
                </p>
                <div className="relative">
                  <pre className="p-3 bg-secondary/50 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                    {embedCode}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(embedCode, 'embed')}
                    className="absolute top-2 right-2"
                  >
                    {copied === 'embed' ? (
                      <>
                        <Check className="w-3 h-3 mr-1 text-green-500" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="card-elevated p-4 text-center">
                <p className="text-3xl font-bold text-foreground">{quiz.analytics.starts}</p>
                <p className="text-sm text-muted-foreground">Quiz Starts</p>
              </div>
              <div className="card-elevated p-4 text-center">
                <p className="text-3xl font-bold text-foreground">{quiz.analytics.completions}</p>
                <p className="text-sm text-muted-foreground">Completions</p>
              </div>
            </div>

            {quiz.analytics.starts > 0 && (
              <div className="card-elevated p-4 text-center">
                <p className="text-3xl font-bold text-foreground">
                  {quiz.analytics.starts > 0 
                    ? Math.round((quiz.analytics.completions / quiz.analytics.starts) * 100) 
                    : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
              </div>
            )}

            <div className="card-elevated p-4">
              <p className="text-sm font-medium text-foreground mb-3">Top Recommended Products</p>
              {quiz.analytics.topProducts.length > 0 ? (
                <div className="space-y-2">
                  {quiz.analytics.topProducts.slice(0, 5).map((item, index) => {
                    const product = quiz.products.find(p => p.id === item.productId);
                    return (
                      <div key={item.productId} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {index + 1}. {product?.name || 'Unknown Product'}
                        </span>
                        <span className="font-medium">{item.count}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No data yet</p>
              )}
            </div>

            {!isPublished && (
              <div className="p-4 bg-primary/10 rounded-xl">
                <p className="text-sm font-medium text-foreground mb-1">
                  Publish to see analytics
                </p>
                <p className="text-xs text-muted-foreground">
                  Analytics will populate once your quiz is published and receiving responses.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border-subtle">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
