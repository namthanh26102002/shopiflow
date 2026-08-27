import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const InfoLessonEditor: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (lessonId) {
      navigate(`/info/lesson/${lessonId}/view`, { replace: true });
    } else {
      navigate('/info', { replace: true });
    }
  }, [lessonId, navigate]);

  return null;
};

export default InfoLessonEditor;
