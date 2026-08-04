/**
 * ProfileHeader — avatar with hover-to-upload overlay, name, email, member-since
 * date, bio, and the link to the public profile.
 */
import { useRef } from "react";
import { Link } from "react-router-dom";
import { Camera, ExternalLink, Calendar } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

interface ProfileHeaderProps {
  userId: string | undefined;
  email: string | undefined;
  fullName: string | undefined;
  bio: string | null | undefined;
  imageUrl: string | null | undefined;
  createdAt: string | null | undefined;
  isUploadingPhoto: boolean;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ProfileHeader({
  userId,
  email,
  fullName,
  bio,
  imageUrl,
  createdAt,
  isUploadingPhoto,
  onPhotoChange,
}: ProfileHeaderProps) {
  const { t, language } = useLanguage();
  // Hidden file input triggered by the avatar overlay button
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="glass border border-white/20 rounded-2xl p-8 mb-8">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative group">
          <img
            src={imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || 'U')}&size=200&background=f97316&color=fff&bold=true`}
            alt={fullName ?? ''}
            className="w-28 h-28 rounded-full object-cover border-2 border-primary/50 shadow-lg shadow-primary/20"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingPhoto}
            className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            {isUploadingPhoto ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera className="w-6 h-6 text-white" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={onPhotoChange}
            className="hidden"
          />
        </div>
        <div className="text-center sm:text-left flex-1">
          <h1 className="text-3xl font-bold text-white mb-1">{fullName}</h1>
          <p className="text-gray-400 mb-1">{email}</p>
          {createdAt && (
            <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-3">
              <Calendar className="w-3.5 h-3.5" />
              <span>{t.myProfile.memberSince} {new Date(createdAt).toLocaleDateString(language === 'da' ? 'da-DK' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          )}
          {bio && (
            <p className="text-gray-300 leading-relaxed max-w-xl mb-3">{bio}</p>
          )}
          <Link
            to={`/profile/${userId}`}
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {t.myProfile.viewPublicProfile}
          </Link>
        </div>
      </div>
    </div>
  );
}
