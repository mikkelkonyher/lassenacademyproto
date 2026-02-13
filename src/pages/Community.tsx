import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MessageSquare,
  ThumbsUp,
  Clock,
  ChevronRight,
  Search,
  Music,
  Guitar,
  Piano,
  Mic2,
  BookOpen,
  Users,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import RegisterModal from "../components/RegisterModal";

interface Comment {
  author: string;
  avatar: string;
  text: string;
  timeAgo: string;
}

interface Post {
  id: number;
  category: string;
  title: string;
  author: string;
  avatar: string;
  timeAgo: string;
  body: string;
  likes: number;
  comments: Comment[];
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  general: <Users className="w-4 h-4" />,
  guitar: <Guitar className="w-4 h-4" />,
  bass: <Music className="w-4 h-4" />,
  piano: <Piano className="w-4 h-4" />,
  vocals: <Mic2 className="w-4 h-4" />,
  theory: <BookOpen className="w-4 h-4" />,
};

export default function Community() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [expandedPost, setExpandedPost] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const openRegister = () => setIsRegisterOpen(true);
  const closeRegister = () => setIsRegisterOpen(false);

  const ct = t.communityPage;

  const categories = [
    { key: "all", label: ct.categories.all },
    { key: "general", label: ct.categories.general },
    { key: "guitar", label: ct.categories.guitar },
    { key: "bass", label: ct.categories.bass },
    { key: "piano", label: ct.categories.piano },
    { key: "vocals", label: ct.categories.vocals },
    { key: "theory", label: ct.categories.theory },
  ];

  const posts: Post[] = [
    {
      id: 1,
      category: "general",
      title:
        language === "da"
          ? "Tips til at øve mere effektivt?"
          : "Tips for practicing more effectively?",
      author: "Mikkel J.",
      avatar: "MJ",
      timeAgo: language === "da" ? "2 timer siden" : "2 hours ago",
      body:
        language === "da"
          ? "Jeg har svært ved at holde motivationen oppe, når jeg øver. Har I nogle tips til at gøre øvesessionerne mere produktive?"
          : "I'm struggling to stay motivated during practice. Do you have any tips for making practice sessions more productive?",
      likes: 12,
      comments: [
        {
          author: "Elena R.",
          avatar: "ER",
          text:
            language === "da"
              ? "Prøv at sætte små mål for hver session — det hjælper enormt!"
              : "Try setting small goals for each session — it helps enormously!",
          timeAgo: language === "da" ? "1 time siden" : "1 hour ago",
        },
        {
          author: "Ludwig H.",
          avatar: "LH",
          text:
            language === "da"
              ? "Jeg bruger en timer og øver i 25 min blokke med pauser."
              : "I use a timer and practice in 25 min blocks with breaks.",
          timeAgo: language === "da" ? "45 min siden" : "45 min ago",
        },
      ],
    },
    {
      id: 2,
      category: "guitar",
      title:
        language === "da"
          ? "Bedste øvelser for fingerpicking?"
          : "Best exercises for fingerpicking?",
      author: "Anna K.",
      avatar: "AK",
      timeAgo: language === "da" ? "5 timer siden" : "5 hours ago",
      body:
        language === "da"
          ? "Jeg er begyndt at lære fingerpicking og leder efter gode øvelser til at opbygge teknikken. Hvad anbefaler I?"
          : "I've started learning fingerpicking and I'm looking for good exercises to build technique. What do you recommend?",
      likes: 8,
      comments: [
        {
          author: "Ludwig H.",
          avatar: "LH",
          text:
            language === "da"
              ? "Start med Travis picking-mønsteret — det er fundamentet for alt fingerpicking."
              : "Start with the Travis picking pattern — it's the foundation for all fingerpicking.",
          timeAgo: language === "da" ? "3 timer siden" : "3 hours ago",
        },
      ],
    },
    {
      id: 3,
      category: "bass",
      title:
        language === "da"
          ? "Hvordan forbedrer jeg min slap-teknik?"
          : "How do I improve my slap technique?",
      author: "Jonas P.",
      avatar: "JP",
      timeAgo: language === "da" ? "1 dag siden" : "1 day ago",
      body:
        language === "da"
          ? "Min slap-bas lyder stadig lidt mudret. Har nogen gode råd til at få en renere tone?"
          : "My slap bass still sounds a bit muddy. Does anyone have good advice for getting a cleaner tone?",
      likes: 15,
      comments: [
        {
          author: "Kristian L.",
          avatar: "KL",
          text:
            language === "da"
              ? "Fokusér på at ramme strengen med tommelfingerens knogle, ikke hele tommelen. Og husk muting!"
              : "Focus on hitting the string with the thumb knuckle, not the whole thumb. And remember muting!",
          timeAgo: language === "da" ? "20 timer siden" : "20 hours ago",
        },
        {
          author: "Mikkel J.",
          avatar: "MJ",
          text:
            language === "da"
              ? "Kristians kursus om groove hjalp mig virkelig med dette!"
              : "Kristian's course on groove really helped me with this!",
          timeAgo: language === "da" ? "18 timer siden" : "18 hours ago",
        },
      ],
    },
    {
      id: 4,
      category: "piano",
      title:
        language === "da"
          ? "Jazz voicings for begyndere"
          : "Jazz voicings for beginners",
      author: "Sofia M.",
      avatar: "SM",
      timeAgo: language === "da" ? "2 dage siden" : "2 days ago",
      body:
        language === "da"
          ? "Kan nogen anbefale et godt sted at starte med jazz voicings? Jeg kan grundlæggende akkorder men vil gerne lyde mere 'jazzy'."
          : "Can anyone recommend a good place to start with jazz voicings? I know basic chords but want to sound more 'jazzy'.",
      likes: 21,
      comments: [
        {
          author: "Elena R.",
          avatar: "ER",
          text:
            language === "da"
              ? "Start med shell voicings (root, 3rd, 7th). De lyder fantastisk og er nemme at lære!"
              : "Start with shell voicings (root, 3rd, 7th). They sound great and are easy to learn!",
          timeAgo: language === "da" ? "1 dag siden" : "1 day ago",
        },
      ],
    },
    {
      id: 5,
      category: "vocals",
      title:
        language === "da"
          ? "Opvarmningsøvelser til sang?"
          : "Warm-up exercises for singing?",
      author: "Sidsel S.",
      avatar: "SS",
      timeAgo: language === "da" ? "3 dage siden" : "3 days ago",
      body:
        language === "da"
          ? "Hvad er jeres go-to opvarmningsrutine før en optræden eller øvesession? Jeg leder efter noget der tager ca. 10 min."
          : "What's your go-to warm-up routine before a performance or practice session? I'm looking for something that takes about 10 min.",
      likes: 9,
      comments: [
        {
          author: "Anna K.",
          avatar: "AK",
          text:
            language === "da"
              ? "Lip trills og sirener er mine favoritter. Enkle men super effektive!"
              : "Lip trills and sirens are my favorites. Simple but super effective!",
          timeAgo: language === "da" ? "2 dage siden" : "2 days ago",
        },
      ],
    },
    {
      id: 6,
      category: "theory",
      title:
        language === "da"
          ? "Forstå modes — en simpel forklaring?"
          : "Understanding modes — a simple explanation?",
      author: "Hans M.",
      avatar: "HM",
      timeAgo: language === "da" ? "4 dage siden" : "4 days ago",
      body:
        language === "da"
          ? "Modes forvirrer mig altid. Kan nogen forklare det på en enkel måde, der rent faktisk giver mening?"
          : "Modes always confuse me. Can someone explain them in a simple way that actually makes sense?",
      likes: 34,
      comments: [
        {
          author: "Ludwig H.",
          avatar: "LH",
          text:
            language === "da"
              ? "Tænk på det som at starte en dur-skala fra en anden tone. Dorisk = dur-skala fra 2. trin. Spil C dur fra D til D — det er D dorisk!"
              : "Think of it as starting a major scale from a different note. Dorian = major scale from the 2nd degree. Play C major from D to D — that's D Dorian!",
          timeAgo: language === "da" ? "3 dage siden" : "3 days ago",
        },
        {
          author: "Elena R.",
          avatar: "ER",
          text:
            language === "da"
              ? "Ludwigs forklaring er perfekt. Prøv at lytte til hvert mode og mærk stemningen — det er nøglen."
              : "Ludwig's explanation is perfect. Try listening to each mode and feel the mood — that's the key.",
          timeAgo: language === "da" ? "3 dage siden" : "3 days ago",
        },
        {
          author: "Jonas P.",
          avatar: "JP",
          text:
            language === "da"
              ? "Modes-kurset her på akademiet forklarer det super godt med lyd-eksempler!"
              : "The modes course here on the academy explains it super well with audio examples!",
          timeAgo: language === "da" ? "2 dage siden" : "2 days ago",
        },
      ],
    },
  ];

  const filteredPosts = posts.filter((post) => {
    const matchesCategory =
      activeCategory === "all" || post.category === activeCategory;
    const matchesSearch =
      searchQuery === "" ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.body.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar onOpenRegister={openRegister} />

      <div className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t.auth.goBack}</span>
          </button>

          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">
              {ct.pageTitle}
            </h1>
            <p className="text-lg text-gray-400">{ct.pageSubtitle}</p>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={ct.searchPlaceholder}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
            />
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat.key
                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
                }`}
              >
                {cat.key !== "all" && CATEGORY_ICONS[cat.key]}
                {cat.label}
              </button>
            ))}
          </div>

          {/* Post Count */}
          <p className="text-sm text-gray-500 mb-4">
            {filteredPosts.length === 1
              ? ct.showingOne
              : ct.showingResults.replace(
                  "{count}",
                  String(filteredPosts.length)
                )}
          </p>

          {/* Posts */}
          <div className="space-y-4">
            {filteredPosts.map((post) => {
              const isExpanded = expandedPost === post.id;
              return (
                <div
                  key={post.id}
                  className="rounded-2xl border border-white/10 hover:border-white/20 transition-all bg-white/[0.02]"
                >
                  {/* Post Header */}
                  <button
                    onClick={() =>
                      setExpandedPost(isExpanded ? null : post.id)
                    }
                    className="w-full text-left p-5 sm:p-6"
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {post.avatar}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Category Tag */}
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20 mb-2">
                          {CATEGORY_ICONS[post.category]}
                          {
                            categories.find((c) => c.key === post.category)
                              ?.label
                          }
                        </span>

                        <h3 className="text-base sm:text-lg font-semibold text-white mb-1 leading-tight">
                          {post.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span className="font-medium text-gray-400">
                            {post.author}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {post.timeAgo}
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" />
                            {post.likes}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {post.comments.length}
                          </span>
                          <ChevronRight
                            className={`w-4 h-4 ml-auto transition-transform ${
                              isExpanded ? "rotate-90" : ""
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-white/5">
                      {/* Post Body */}
                      <p className="text-sm text-gray-300 mt-4 mb-6 leading-relaxed">
                        {post.body}
                      </p>

                      {/* Comments */}
                      {post.comments.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {ct.replies} ({post.comments.length})
                          </h4>
                          {post.comments.map((comment, idx) => (
                            <div
                              key={idx}
                              className="flex gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5"
                            >
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/30 to-primary/30 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                                {comment.avatar}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-semibold text-white">
                                    {comment.author}
                                  </span>
                                  <span className="text-[10px] text-gray-600">
                                    {comment.timeAgo}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                  {comment.text}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply Input (visual only) */}
                      <div className="mt-4 flex gap-3">
                        <input
                          type="text"
                          placeholder={ct.replyPlaceholder}
                          className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/40 transition-colors"
                        />
                        <button className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors">
                          {ct.reply}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredPosts.length === 0 && (
            <div className="text-center py-16">
              <MessageSquare className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500">{ct.noPosts}</p>
            </div>
          )}
        </div>
      </div>

      <Footer />
      <RegisterModal isOpen={isRegisterOpen} onClose={closeRegister} />
    </div>
  );
}
