// Built-in text that quiz visitors see: the words the quiz itself supplies
// rather than the merchant. A quiz picks its language in Settings > Behaviour.

export type VisitorLanguage = 'en' | 'vi';

export const VISITOR_LANGUAGES: { value: VisitorLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'vi', label: 'Tiếng Việt' },
];

const en = {
  next: 'Next',
  continue: 'Continue',
  skip: 'Skip Quiz',
  yes: 'Yes',
  no: 'No',
  previous: 'Previous question',
  selectAll: 'Select all that apply',
  loading: 'Loading quiz',
  finishedTitle: 'Thanks for completing the quiz!',
  finishedBody: 'Your answers have been recorded.',
  emptyTitle: 'This quiz has no questions yet',
  emptyBody: 'Please check back later',
  notFound: 'Quiz not found',
  notPublished: 'This quiz is not published',
  loadFailed: 'Failed to load quiz',
  goHome: 'Go back home',
};

export type VisitorText = typeof en;

const vi: VisitorText = {
  next: 'Tiếp tục',
  continue: 'Tiếp tục',
  skip: 'Bỏ qua',
  yes: 'Có',
  no: 'Không',
  previous: 'Câu trước',
  selectAll: 'Chọn tất cả đáp án phù hợp',
  loading: 'Đang tải',
  finishedTitle: 'Cảm ơn bạn đã hoàn thành!',
  finishedBody: 'Câu trả lời của bạn đã được ghi lại.',
  emptyTitle: 'Bài trắc nghiệm này chưa có câu hỏi',
  emptyBody: 'Vui lòng quay lại sau',
  notFound: 'Không tìm thấy bài trắc nghiệm',
  notPublished: 'Bài trắc nghiệm này chưa được xuất bản',
  loadFailed: 'Không tải được bài trắc nghiệm',
  goHome: 'Về trang chủ',
};

const TEXT: Record<VisitorLanguage, VisitorText> = { en, vi };

/** Before a quiz has loaded there is no setting yet; follow the browser. */
export const browserLanguage = (): VisitorLanguage =>
  typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('vi') ? 'vi' : 'en';

export const visitorText = (language: VisitorLanguage | undefined): VisitorText =>
  TEXT[language ?? 'en'] ?? en;

/**
 * A merchant-editable label, or the built-in one in the quiz's language.
 *
 * Quizzes store the English default ("Next") as a real value, so it counts
 * as untouched: switching the quiz to Vietnamese should translate it too.
 */
export const labelOr = (
  value: string | undefined,
  key: 'next' | 'continue' | 'skip' | 'yes' | 'no',
  text: VisitorText,
): string => {
  const trimmed = value?.trim();
  return !trimmed || trimmed === en[key] ? text[key] : trimmed;
};
