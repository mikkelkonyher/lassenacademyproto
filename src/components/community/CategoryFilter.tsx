/**
 * CategoryFilter — the row of category pills plus the "My posts" toggle.
 *
 * Note: `community.test.tsx` locates these buttons via
 * `document.querySelectorAll("button.rounded-full")`, so the `rounded-full`
 * class is part of the test contract and must stay on every pill.
 */
import { User } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { CATEGORY_ICONS, useCategories } from "./categories";

interface CategoryFilterProps {
  activeCategory: string;
  showMyPosts: boolean;
  /** Renders the "My posts" toggle only when someone is signed in. */
  isLoggedIn: boolean;
  onSelectCategory: (key: string) => void;
  onToggleMyPosts: () => void;
}

export default function CategoryFilter({
  activeCategory,
  showMyPosts,
  isLoggedIn,
  onSelectCategory,
  onToggleMyPosts,
}: CategoryFilterProps) {
  const { t } = useLanguage();
  const ct = t.communityPage;
  const categories = useCategories();

  return (
    <div className="flex flex-wrap items-center gap-2 mb-8">
      {categories.map((cat) => (
        <button
          key={cat.key}
          onClick={() => onSelectCategory(cat.key)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeCategory === cat.key && !showMyPosts
              ? "bg-primary text-white shadow-lg shadow-primary/30"
              : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
          }`}
        >
          {cat.key !== "all" && CATEGORY_ICONS[cat.key]}
          {cat.label}
        </button>
      ))}

      {/* My Posts filter */}
      {isLoggedIn && (
        <button
          onClick={onToggleMyPosts}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            showMyPosts
              ? "bg-accent text-white shadow-lg shadow-accent/30"
              : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
          }`}
        >
          <User className="w-4 h-4" />
          {ct.myPosts}
        </button>
      )}
    </div>
  );
}
