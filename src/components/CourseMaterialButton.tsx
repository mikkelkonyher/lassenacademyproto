/**
 * CourseMaterialButton — downloads the PDF material attached to a course.
 *
 * The PDF lives in the private `course-materials` bucket, so there is no URL to
 * link to directly. Clicking asks the `get-course-material` Edge Function for a
 * short-lived signed URL, which it only issues after re-checking that the caller
 * bought the course. Rendering this button is the caller's decision (see
 * LessonPlayer); the real gate is on the server.
 *
 * Styled to match WatchlistButton's 'pill' variant so the two sit together in
 * the lesson player's action row.
 */
import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { callEdgeFunction } from '../utils/callEdgeFunction';

interface CourseMaterialButtonProps {
  courseId: string;
  className?: string;
}

type Status = 'idle' | 'loading' | 'error';

export default function CourseMaterialButton({
  courseId,
  className = '',
}: CourseMaterialButtonProps) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<Status>('idle');

  const handleClick = async () => {
    setStatus('loading');

    const res = await callEdgeFunction('get-course-material', {
      course_id: courseId,
    });

    const url = typeof res.data?.url === 'string' ? res.data.url : null;
    if (!res.success || !url) {
      setStatus('error');
      return;
    }

    // A temporary anchor rather than location.assign: the signed URL carries
    // Content-Disposition: attachment, and clicking a link keeps the viewer on
    // the lesson page while the browser fetches the file.
    const link = document.createElement('a');
    link.href = url;
    link.download =
      typeof res.data?.filename === 'string' ? res.data.filename : '';
    document.body.appendChild(link);
    link.click();
    link.remove();

    setStatus('idle');
  };

  const loading = status === 'loading';

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all glass border-white/20 text-white hover:border-primary/50 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span>{loading ? t.courseMaterial.preparing : t.courseMaterial.download}</span>
      </button>

      {status === 'error' && (
        <p role="alert" className="text-xs text-red-400">
          {t.courseMaterial.error}
        </p>
      )}
    </div>
  );
}
