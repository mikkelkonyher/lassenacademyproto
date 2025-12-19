export type Language = "da" | "en";

export const translations = {
  da: {
    navbar: {
      subtitle: "EN DEL AF KRISTIAN LASSEN MUSIK APS",
      startHere: "Start Her",
      courses: "Kurser",
      podcast: "Podcast",
      community: "Fællesskab",
      pricing: "Priser",
      about: "Om",
      contact: "Kontakt",
      login: "Log ind",
      freeTrial: "Prøv Gratis",
    },
    hero: {
      newMasterclass: "Nyhed: Masterclass med Kristian Lassen",
      headline: "Mestrer dit instrument.",
      subheadline: "Find din lyd.",
      description: "It's all about the music we love",
      ctaMain: "Kom i gang",
      ctaSecondary: "Se Trailer",
      benefits: [
        "Ubegrænset adgang",
        "Personlig feedback",
        "Eksklusivt community",
      ],
    },
    featured: {
      expertsTitle: "Undervisere",
      expertsHeadline: "Vores undervisere",
      viewInstructors: "Se alle undervisere",
      libraryTitle: "Biblioteket",
      libraryHeadline: "Nyeste Kurser",
      viewAllCourses: "Se alle kurser",
      instructorRoles: {
        kristian: "Bas og grundlæggende teknik",
        ludwig: "Guitar og teori",
        elena: "Piano & Composition",
      },
      courseData: {
        guitarTitle: "Begynder Guitar: Fra 0 til Helt",
        guitarLevel: "Begynder",
        bassTitle: "Groove & Rytmisk Forståelse",
        bassLevel: "Mellem",
        pianoTitle: "Jazz Piano og Improvisation",
        pianoLevel: "Avanceret",
      },
      tags: {
        teknik: "Teknik",
        teori: "Teori",
        groove: "Groove",
        rytme: "Rytme",
        harmoni: "Harmoni",
        impro: "Impro",
      },
      with: "med",
    },
    footer: {
      description:
        "Din vej til musikalsk mesterskab. Vi hjælper dig med at nå dine mål gennem struktureret undervisning og et støttende fællesskab.",
      partOf: "En del af",
      explore: "Udforsk",
      community: "Fællesskab",
      contact: "Kontakt",
      rights: "Alle rettigheder forbeholdes.",
      links: {
        startHere: "Start Her",
        allCourses: "Alle Kurser",
        learningPaths: "Læringsstier",
        prices: "Priser",
        forum: "Forum",
        events: "Events",
        showcase: "Studenter Showcase",
        support: "Support",
      },
    },
    socialProof: {
      headline: "Elsket af musikere i hele Danmark",
      subheadline:
        "Slut dig til tusindvis af tilfredse elever på Lassen Music Academy.",
    },
    videoSection: {
      subtitle: "Mød Stifteren",
      founderName: "Kristian Lassen",
      role: "Stifter, Bassist (Master fra SDMK) & Indehaver af Kristian Lassen Musik ApS",
      context: "Hør ham spille bas med The Sonic Flow:",
      headline: "Start din rejse i dag",
      description:
        "THE SONIC FLOW. Lassen i en optagelse fra 2016 sammen med Sidsel Marie Søholm, Steffen Schackinger, Hans Mydtskov & Adam Winberg.",
    },
    auth: {
      registerTitle: "Opret profil",
      registerSubtitle:
        "Start din rejse. Tilmeld dig gratis og begynd at lære.",
      nameLabel: "Navn",
      emailLabel: "Email",
      passwordLabel: "Adgangskode",
      submitButton: "Opret profil",
      loginLink: "Har du allerede en bruger? Log ind",
      close: "Luk",
      goBack: "Tilbage",
      goBackHome: "Gå tilbage til forsiden",
    },
    teachers: {
      specialties: "Specialer",
      experience: "Erfaring",
      achievements: "Præstationer",
      kristianlassen: {
        bio: "Kristian Lassen er en passioneret bassist og musikpædagog med en dyb forståelse for rytme og groove. Med mange års erfaring både på scenen og i undervisningssammenhæng, hjælper han elever med at udvikle deres tekniske færdigheder og musikalske forståelse.",
        specialties: [
          "Bas teknik",
          "Groove & Rytme",
          "Improvisation",
          "Musik teori",
        ],
        experience:
          "Master fra SDMK med speciale i bas. Har spillet med adskillige bands og kunstnere gennem årene, inklusive The Sonic Flow. Grundlægger af Lassen Music Academy og indehaver af Kristian Lassen Musik ApS.",
        achievements: [
          "Master fra SDMK",
          "Grundlægger af Lassen Music Academy",
          "Erfaren live og studiomusiker",
        ],
      },
      ludwighamiltonwittendorff: {
        bio: "Ludwig Hamilton-Wittendorff er en dedikeret guitarinstruktør med en stærk passion for musikteori og teknik. Han specialiserer sig i at hjælpe elever med at forstå komplekse musikalske koncepter på en tilgængelig måde.",
        specialties: [
          "Guitar teknik",
          "Musik teori",
          "Akkorder & Scalaer",
          "Komposition",
        ],
        experience:
          "Erfaren guitarinstruktør med fokus på både teknik og teori. Har undervist elever på alle niveauer og hjælper med at bygge en solid fundament i musikalsk forståelse.",
        achievements: [
          "Specialist i guitar og teori",
          "Erfaren underviser på alle niveauer",
          "Ekspert i akkorder og scalaer",
        ],
      },
      elenarossi: {
        bio: "Elena Rossi er en talentfuld pianist og komponist med en unik tilgang til jazz og improvisation. Hendes undervisning kombinerer tekniske færdigheder med kreativ udfoldelse.",
        specialties: ["Jazz piano", "Improvisation", "Komposition", "Harmoni"],
        experience:
          "Professionel pianist med omfattende erfaring inden for jazz og improvisation. Har optrådt på adskillige scener og deltager aktivt i det musikalske miljø.",
        achievements: [
          "Ekspert i jazz piano",
          "Erfaren komponist",
          "Aktiv performer i musikmiljøet",
        ],
      },
    },
    learningPaths: {
      subtitle: "Struktureret Læring",
      headline: "Læringsstier",
      description:
        "Følg en struktureret vej fra begynder til mester. Vores læringsstier guider dig gennem hvert trin af din musikalske rejse.",
      beginner: {
        title: "Begynder stien",
        description:
          "Perfekt for dem der starter fra bunden. Lær fundamenterne og byg en solid base for din musikalske rejse.",
        duration: "20+ timer video",
        courses: "8+ kurser",
      },
      intermediate: {
        title: "Mellem stien",
        description:
          "For dem der har grundlæggende færdigheder og er klar til at udvide deres horisont med avancerede teknikker.",
        duration: "40+ timer video",
        courses: "12+ kurser",
      },
      advanced: {
        title: "Avanceret sti",
        description:
          "Mester niveau læring for erfarne musikere der ønsker at perfektionere deres kunst og udforske nye dimensioner.",
        duration: "60+ timer video",
        courses: "15+ kurser",
      },
      cta: "Start stien",
      viewAll: "Se alle læringsstier",
    },
  },
  en: {
    navbar: {
      subtitle: "PART OF KRISTIAN LASSEN MUSIK APS",
      startHere: "Start Here",
      courses: "Courses",
      podcast: "Podcast",
      community: "Community",
      pricing: "Pricing",
      about: "About",
      contact: "Contact",
      login: "Log in",
      freeTrial: "Try for Free",
    },
    hero: {
      newMasterclass: "New: Masterclass with Kristian Lassen",
      headline: "Master your instrument.",
      subheadline: "Find your sound.",
      description: "It's all about the music we love",
      ctaMain: "Get Started",
      ctaSecondary: "Watch Trailer",
      benefits: [
        "Unlimited access",
        "Personal feedback",
        "Exclusive community",
      ],
    },
    featured: {
      expertsTitle: "Instructors",
      expertsHeadline: "Our instructors",
      viewInstructors: "View all instructors",
      libraryTitle: "The Library",
      libraryHeadline: "Latest Courses",
      viewAllCourses: "View All Courses",
      instructorRoles: {
        kristian: "Bass for all levels",
        ludwig: "Guitar and theory",
        elena: "Piano & Composition",
      },
      courseData: {
        guitarTitle: "Beginner Guitar: From 0 to Hero",
        guitarLevel: "Beginner",
        bassTitle: "Groove & Rhythmic Understanding",
        bassLevel: "Intermediate",
        pianoTitle: "Jazz Piano and Improvisation",
        pianoLevel: "Advanced",
      },
      tags: {
        teknik: "Technique",
        teori: "Theory",
        groove: "Groove",
        rytme: "Rhythm",
        harmoni: "Harmony",
        impro: "Impro",
      },
      with: "with",
    },
    footer: {
      description:
        "Your path to musical mastery. We help you reach your goals through structured education and a supportive community.",
      partOf: "Part of",
      explore: "Explore",
      community: "Community",
      contact: "Contact",
      rights: "All rights reserved.",
      links: {
        startHere: "Start Here",
        allCourses: "All Courses",
        learningPaths: "Learning Paths",
        prices: "Pricing",
        forum: "Forum",
        events: "Events",
        showcase: "Student Showcase",
        support: "Support",
      },
    },
    socialProof: {
      headline: "Loved by musicians across Denmark",
      subheadline:
        "Join thousands of satisfied students at Lassen Music Academy.",
    },
    videoSection: {
      subtitle: "Meet the Founder",
      founderName: "Kristian Lassen",
      role: "Founder, Bassist (Master from SDMK) & Owner of Kristian Lassen Musik ApS",
      context: "Hear him play bass with The Sonic Flow:",
      headline: "Start your journey today",
      description:
        "THE SONIC FLOW. Lassen in a recording from 2016 together with Sidsel Marie Søholm, Steffen Schackinger, Hans Mydtskov & Adam Winberg.",
    },
    auth: {
      registerTitle: "Create Account",
      registerSubtitle:
        "Start your journey. Sign up for free and begin to learn.",
      nameLabel: "Name",
      emailLabel: "Email",
      passwordLabel: "Password",
      submitButton: "Sign Up",
      loginLink: "Already have an account? Log in",
      close: "Close",
      goBack: "Go back",
      goBackHome: "Go back home",
    },
    teachers: {
      specialties: "Specialties",
      experience: "Experience",
      achievements: "Achievements",
      kristianlassen: {
        bio: "Kristian Lassen is a passionate bassist and music educator with a deep understanding of rhythm and groove. With many years of experience both on stage and in teaching contexts, he helps students develop their technical skills and musical understanding.",
        specialties: [
          "Bass technique",
          "Groove & Rhythm",
          "Improvisation",
          "Music theory",
        ],
        experience:
          "Master from SDMK specializing in bass. Has played with numerous bands and artists over the years, including The Sonic Flow. Founder of Lassen Music Academy and owner of Kristian Lassen Musik ApS.",
        achievements: [
          "Master from SDMK",
          "Founder of Lassen Music Academy",
          "Experienced live and studio musician",
        ],
      },
      ludwighamiltonwittendorff: {
        bio: "Ludwig Hamilton-Wittendorff is a dedicated guitar instructor with a strong passion for music theory and technique. He specializes in helping students understand complex musical concepts in an accessible way.",
        specialties: [
          "Guitar technique",
          "Music theory",
          "Chords & Scales",
          "Composition",
        ],
        experience:
          "Experienced guitar instructor with focus on both technique and theory. Has taught students at all levels and helps build a solid foundation in musical understanding.",
        achievements: [
          "Specialist in guitar and theory",
          "Experienced teacher at all levels",
          "Expert in chords and scales",
        ],
      },
      elenarossi: {
        bio: "Elena Rossi is a talented pianist and composer with a unique approach to jazz and improvisation. Her teaching combines technical skills with creative expression.",
        specialties: ["Jazz piano", "Improvisation", "Composition", "Harmony"],
        experience:
          "Professional pianist with extensive experience in jazz and improvisation. Has performed on numerous stages and actively participates in the music scene.",
        achievements: [
          "Expert in jazz piano",
          "Experienced composer",
          "Active performer in music scene",
        ],
      },
    },
    learningPaths: {
      subtitle: "Structured Learning",
      headline: "Learning Paths",
      description:
        "Follow a structured path from beginner to master. Our learning paths guide you through every step of your musical journey.",
      beginner: {
        title: "Beginner Path",
        description:
          "Perfect for those starting from scratch. Learn the fundamentals and build a solid foundation for your musical journey.",
        duration: "20+ hours of video",
        courses: "8+ courses",
      },
      intermediate: {
        title: "Intermediate Path",
        description:
          "For those with basic skills ready to expand their horizons with advanced techniques and deeper understanding.",
        duration: "40+ hours of video",
        courses: "12+ courses",
      },
      advanced: {
        title: "Advanced Path",
        description:
          "Master level learning for experienced musicians who want to perfect their craft and explore new dimensions.",
        duration: "60+ hours of video",
        courses: "15+ courses",
      },
      cta: "Start Path",
      viewAll: "View All Learning Paths",
    },
  },
};
