/**
 * CreatePostForm — the "new post" form shown under the page header.
 *
 * Field values live in the parent so a draft survives closing and reopening
 * the form; this component only renders them.
 */
import { Loader2 } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useCategories } from "./categories";

interface CreatePostFormProps {
  title: string;
  body: string;
  category: string;
  creating: boolean;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function CreatePostForm({
  title,
  body,
  category,
  creating,
  onTitleChange,
  onBodyChange,
  onCategoryChange,
  onSubmit,
}: CreatePostFormProps) {
  const { t } = useLanguage();
  const ct = t.communityPage;
  const categories = useCategories();

  return (
    <form
      onSubmit={onSubmit}
      className="mb-8 p-6 rounded-2xl border border-white/10 bg-white/[0.03] space-y-4"
    >
      {/* Stacks on mobile — the category select has a wide intrinsic width and
          would otherwise squeeze the title field to nothing. */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
        >
          {categories
            .filter((c) => c.key !== "all")
            .map((cat) => (
              <option
                key={cat.key}
                value={cat.key}
                className="bg-[#1a2030]"
              >
                {cat.label}
              </option>
            ))}
        </select>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={ct.titlePlaceholder}
          maxLength={200}
          required
          className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
        />
      </div>
      <textarea
        value={body}
        onChange={(e) => onBodyChange(e.target.value)}
        placeholder={ct.bodyPlaceholder}
        maxLength={5000}
        required
        rows={4}
        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all resize-none"
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={creating || !title.trim() || !body.trim()}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating && <Loader2 className="w-4 h-4 animate-spin" />}
          {creating ? ct.posting : ct.createPost}
        </button>
      </div>
    </form>
  );
}
