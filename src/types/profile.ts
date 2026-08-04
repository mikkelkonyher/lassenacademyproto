/**
 * Row shapes for the joined queries behind the MyProfile page sections.
 */

// "Continue Watching" card — lesson + parent course info
export type ContinueWatchingRow = {
  lessonId: string;
  lessonSlug: string;
  titleDa: string;
  titleEn: string;
  courseSlug: string;
  courseTitleDa: string;
  courseTitleEn: string;
  courseImageUrl: string;
  sortOrder: number;
  positionSeconds: number;
  durationSeconds: number;
  completed: boolean;
  // Stored poster from Supabase Storage. Replaces the old image.mux.com URL,
  // which cannot be built for a lesson using signed playback.
  lessonThumbnailUrl: string | null;
};

// Course summary embedded in both the purchases and watchlist queries
export type EmbeddedCourse = {
  id: string;
  slug: string;
  title_da: string;
  title_en: string;
  image_url: string;
  instructor: string;
};

// Backs the "My purchases" section
export type PurchaseRow = {
  id: string;
  purchased_at: string;
  price_paid_dkk: number;
  courses: EmbeddedCourse | null;
};

// Backs the Watchlist section. Watchlist only supports courses now — lessons
// are reached via their parent course.
export type WatchlistRow = {
  id: string;
  created_at: string;
  courses: EmbeddedCourse | null;
};
