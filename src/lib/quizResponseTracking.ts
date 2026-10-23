import { supabase } from '@/integrations/supabase/client';

export interface QuizResponsePatch {
  last_question_index?: number;
  questions_answered?: number;
  completed?: boolean;
  time_to_complete_ms?: number;
  result_product_name?: string;
  country?: string | null;
  region?: string | null;
}

/**
 * Record progress on a visitor's quiz response.
 *
 * Visitors cannot read quiz_responses, and an UPDATE with a WHERE clause needs
 * read access, so a plain `.update()` matches nothing for them. The
 * `update_quiz_response` function does the update keyed on the visitor's own
 * session id. If that function is not deployed yet, fall back to the direct
 * update, which still works for a signed-in owner previewing their quiz.
 */
export const updateQuizResponse = async (
  responseId: string,
  sessionId: string,
  patch: QuizResponsePatch,
): Promise<void> => {
  const { error } = await supabase.rpc('update_quiz_response', {
    p_response_id: responseId,
    p_session_id: sessionId,
    p_patch: patch as never,
  });
  if (!error) return;

  const { completed, ...rest } = patch;
  await supabase
    .from('quiz_responses')
    .update({ ...rest, ...(completed ? { completed_at: new Date().toISOString() } : {}) })
    .eq('id', responseId);
};
