/**
 * Forum category metadata shared by the filter bar, the create/edit forms and
 * the category tag on each post.
 */
import { Music, Guitar, Piano, Mic2, BookOpen, Users } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

// Map each forum category to its Lucide icon for use in tags and filters
export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  general: <Users className="w-4 h-4" />,
  guitar: <Guitar className="w-4 h-4" />,
  bass: <Music className="w-4 h-4" />,
  piano: <Piano className="w-4 h-4" />,
  vocals: <Mic2 className="w-4 h-4" />,
  theory: <BookOpen className="w-4 h-4" />,
};

export type Category = { key: string; label: string };

/** The category list in display order, with labels in the active language. */
export function useCategories(): Category[] {
  const { t } = useLanguage();
  const ct = t.communityPage;

  return [
    { key: "all", label: ct.categories.all },
    { key: "general", label: ct.categories.general },
    { key: "guitar", label: ct.categories.guitar },
    { key: "bass", label: ct.categories.bass },
    { key: "piano", label: ct.categories.piano },
    { key: "vocals", label: ct.categories.vocals },
    { key: "theory", label: ct.categories.theory },
  ];
}
