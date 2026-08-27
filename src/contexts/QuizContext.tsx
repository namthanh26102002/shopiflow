// Quiz Context - provides global state for quiz builder with database persistence
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Quiz, Question, Product, QuizSettings, ResultsConfig, ResultQuestionConfig, createDefaultQuiz, generateId, AnswerOption } from '@/types/quiz';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface QuizContextType {
  quiz: Quiz;
  selectedQuestionId: string | null;
  setSelectedQuestionId: (id: string | null) => void;
  loading: boolean;
  saving: boolean;
  
  // Question operations
  addQuestion: (question: Question) => void;
  updateQuestion: (id: string, updates: Partial<Question>) => void;
  updateResultConfig: (questionId: string, updates: Partial<ResultQuestionConfig>) => void;
  deleteQuestion: (id: string) => void;
  reorderQuestions: (startIndex: number, endIndex: number) => void;
  
  // Option operations
  addOption: (questionId: string) => void;
  updateOption: (questionId: string, optionId: string, updates: Partial<AnswerOption>) => void;
  deleteOption: (questionId: string, optionId: string) => void;
  
  // Product operations
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  
  // Settings operations
  updateSettings: (updates: Partial<QuizSettings>) => void;
  updateResults: (updates: Partial<ResultsConfig>) => void;
  
  // Persistence
  saveQuiz: () => Promise<void>;
  resetQuiz: () => void;
  refreshQuiz: () => Promise<void>;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

export const QuizProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<Quiz>(createDefaultQuiz());
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbQuizId, setDbQuizId] = useState<string | null>(null);

  // Load quiz from database when user logs in
  useEffect(() => {
    const loadQuiz = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('quizzes')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setDbQuizId(data.id);
          setQuiz({
            id: data.id,
            settings: data.settings as unknown as QuizSettings,
            questions: data.questions as unknown as Question[],
            products: data.products as unknown as Product[],
            results: data.results as unknown as ResultsConfig,
            analytics: data.analytics as unknown as Quiz['analytics'],
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            publishedUrl: data.published_url || undefined,
          });
        }
      } catch (error) {
        console.error('Error loading quiz:', error);
        toast.error('Failed to load your quiz');
      } finally {
        setLoading(false);
      }
    };

    loadQuiz();
  }, [user]);

  const saveQuiz = useCallback(async () => {
    if (!user) return;

    setSaving(true);
    try {
      const quizData: Record<string, unknown> = {
        user_id: user.id,
        title: quiz.settings.title,
        settings: quiz.settings,
        questions: quiz.questions,
        products: quiz.products,
        results: quiz.results,
        analytics: quiz.analytics,
        published_url: quiz.publishedUrl || null,
      };

      if (dbQuizId) {
        // Update existing quiz
        const { error } = await supabase
          .from('quizzes')
          .update(quizData)
          .eq('id', dbQuizId);

        if (error) throw error;
      } else {
        // Create new quiz
        const { data, error } = await supabase
          .from('quizzes')
          .insert([quizData as { user_id: string }])
          .select('id')
          .single();

        if (error) throw error;
        if (data) setDbQuizId(data.id);
      }
    } catch (error) {
      console.error('Error saving quiz:', error);
    } finally {
      setSaving(false);
    }
  }, [user, quiz, dbQuizId]);

  // Auto-save quiz when it changes (debounced) — uses ref to avoid stale closure
  const saveQuizRef = useRef(saveQuiz);
  useEffect(() => { saveQuizRef.current = saveQuiz; });

  useEffect(() => {
    if (!user || loading) return;

    const timeoutId = setTimeout(() => {
      saveQuizRef.current();
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [quiz, user, loading]);


  const addQuestion = useCallback((question: Question) => {
    setQuiz(prev => ({
      ...prev,
      questions: [...prev.questions, question],
      updatedAt: new Date(),
    }));
    setSelectedQuestionId(question.id);
  }, []);

  const updateQuestion = useCallback((id: string, updates: Partial<Question>) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === id ? { ...q, ...updates } : q),
      updatedAt: new Date(),
    }));
  }, []);

  // Stale-closure-safe updater for resultConfig fields
  const updateResultConfig = useCallback((questionId: string, updates: Partial<ResultQuestionConfig>) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId && q.resultConfig
          ? { ...q, resultConfig: { ...q.resultConfig, ...updates } }
          : q
      ),
      updatedAt: new Date(),
    }));
  }, []);

  const deleteQuestion = useCallback((id: string) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== id),
      updatedAt: new Date(),
    }));
    if (selectedQuestionId === id) {
      setSelectedQuestionId(null);
    }
  }, [selectedQuestionId]);

  const reorderQuestions = useCallback((startIndex: number, endIndex: number) => {
    setQuiz(prev => {
      const questions = [...prev.questions];
      const [removed] = questions.splice(startIndex, 1);
      questions.splice(endIndex, 0, removed);
      return { ...prev, questions, updatedAt: new Date() };
    });
  }, []);

  const addOption = useCallback((questionId: string) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id === questionId && q.options.length < 6) {
          return {
            ...q,
            options: [...q.options, { id: generateId(), text: `Option ${q.options.length + 1}`, productIds: [] }],
          };
        }
        return q;
      }),
      updatedAt: new Date(),
    }));
  }, []);

  const updateOption = useCallback((questionId: string, optionId: string, updates: Partial<AnswerOption>) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id === questionId) {
          return {
            ...q,
            options: q.options.map(o => o.id === optionId ? { ...o, ...updates } : o),
          };
        }
        return q;
      }),
      updatedAt: new Date(),
    }));
  }, []);

  const deleteOption = useCallback((questionId: string, optionId: string) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id === questionId && q.options.length > 2) {
          return {
            ...q,
            options: q.options.filter(o => o.id !== optionId),
          };
        }
        return q;
      }),
      updatedAt: new Date(),
    }));
  }, []);

  const addProduct = useCallback((product: Product) => {
    setQuiz(prev => ({
      ...prev,
      products: [...prev.products, product],
      updatedAt: new Date(),
    }));
  }, []);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    setQuiz(prev => ({
      ...prev,
      products: prev.products.map(p => p.id === id ? { ...p, ...updates } : p),
      updatedAt: new Date(),
    }));
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setQuiz(prev => ({
      ...prev,
      products: prev.products.filter(p => p.id !== id),
      updatedAt: new Date(),
    }));
  }, []);

  const updateSettings = useCallback((updates: Partial<QuizSettings>) => {
    setQuiz(prev => ({
      ...prev,
      settings: { ...prev.settings, ...updates },
      updatedAt: new Date(),
    }));
  }, []);

  const updateResults = useCallback((updates: Partial<ResultsConfig>) => {
    setQuiz(prev => ({
      ...prev,
      results: { ...prev.results, ...updates },
      updatedAt: new Date(),
    }));
  }, []);

  const resetQuiz = useCallback(() => {
    setQuiz(createDefaultQuiz());
    setSelectedQuestionId(null);
    setDbQuizId(null);
  }, []);

  const refreshQuiz = useCallback(async () => {
    if (!dbQuizId) return;

    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', dbQuizId)
        .single();

      if (error) throw error;

      if (data) {
        setQuiz({
          id: data.id,
          settings: data.settings as unknown as QuizSettings,
          questions: data.questions as unknown as Question[],
          products: data.products as unknown as Product[],
          results: data.results as unknown as ResultsConfig,
          analytics: data.analytics as unknown as Quiz['analytics'],
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
          publishedUrl: data.published_url || undefined,
        });
      }
    } catch (error) {
      console.error('Error refreshing quiz:', error);
    }
  }, [dbQuizId]);

  return (
    <QuizContext.Provider value={{
      quiz,
      selectedQuestionId,
      setSelectedQuestionId,
      loading,
      saving,
      addQuestion,
      updateQuestion,
      updateResultConfig,
      deleteQuestion,
      reorderQuestions,
      addOption,
      updateOption,
      deleteOption,
      addProduct,
      updateProduct,
      deleteProduct,
      updateSettings,
      updateResults,
      saveQuiz,
      resetQuiz,
      refreshQuiz,
    }}>
      {children}
    </QuizContext.Provider>
  );
};

export const useQuiz = () => {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error('useQuiz must be used within a QuizProvider');
  }
  return context;
};
