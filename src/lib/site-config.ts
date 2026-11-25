import { unsplash, type SiteImage } from "@/lib/media";

/**
 * Studio branding, copy, and placeholder photography in one place.
 * Swap the Unsplash images for your own work as it's published; images
 * marked `is_public_portfolio` in Supabase replace the hero frames
 * automatically.
 */

export type NavLink = { label: string; href: string };

export type OfferingSlug = "weddings" | "portraits" | "events" | "editorial";

export type Offering = {
  slug: OfferingSlug;
  title: string;
  tagline: string;
  /** Starting session investment, in whole US dollars. */
  startingAt: number;
  description: string[];
  included: string[];
  coverImage: SiteImage;
  previewImages: [SiteImage, SiteImage, SiteImage];
};

export type HeroFrameSeed = SiteImage & { location: string };

/** Mirrors a `packages` row; shown when the live catalog is empty or unreachable. */
export type CollectionSeed = {
  name: string;
  description: string;
  priceCents: number;
  /** null means every finished photograph. */
  downloadLimit: number | null;
  includesPrints: boolean;
};

type SiteConfig = {
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  heroStatement: string;
  location: { eyebrow: string; short: string; base: string; note: string };
  intro: {
    lead: string;
    paragraphs: string[];
    signature: string;
    portrait: SiteImage;
    portraitCaption: string;
    detail: SiteImage;
  };
  philosophy: { title: string; description: string }[];
  contact: { email: string; phone: string; phoneHref: string; responseTime: string };
  social: NavLink[];
  nav: NavLink[];
  hero: { frames: HeroFrameSeed[] };
  offerings: Offering[];
  fallbackCollections: CollectionSeed[];
  clientAccess: { eyebrow: string; quote: string; image: SiteImage };
  booking: {
    lead: string;
    body: string;
    image: SiteImage;
    imageCaption: string;
    steps: { title: string; description: string }[];
  };
};

export const siteConfig: SiteConfig = {
  name: "Luke's Photography",
  shortName: "Luke Studio",
  tagline: "Editorial wedding, portrait & event photography",
  description:
    "Luke's Photography is a New Jersey studio creating quiet, cinematic photographs of weddings, portraits, private events and brands, at home and around the world.",
  heroStatement: "Quiet, cinematic photographs of the days you'll want to remember.",

  location: {
    eyebrow: "New Jersey & Destination Photography",
    short: "New Jersey & Destination",
    base: "Studio in Montclair, New Jersey",
    note: "Photographing throughout New Jersey, New York City and the Hudson Valley, and wherever your story takes us.",
  },

  intro: {
    lead: "We make photographs that feel the way the day felt: unhurried, honest, and quietly cinematic.",
    paragraphs: [
      "Luke's Photography began with a borrowed film camera and a habit of noticing the moments in between. A father straightening his daughter's veil. A hand finding another beneath a dinner table. The last light catching a glass of champagne. More than a decade later, that instinct still guides every frame we make.",
      "We work with a small number of couples, families and brands each season, so every story receives our full attention, from the first conversation to the heirloom album that arrives at your door.",
    ],
    signature: "Luke, Founder & Lead Photographer",
    portrait: unsplash(
      "1542038784456-1ea8e935640e",
      6000,
      4000,
      "Photographer raising a camera toward the lens in an autumn forest",
    ),
    portraitCaption: "On location, Hudson Valley",
    detail: unsplash(
      "1452587925148-ce544e77e70d",
      4608,
      3456,
      "Vintage film camera and instant prints resting on a travel map",
    ),
  },

  philosophy: [
    {
      title: "Editorial & Unscripted",
      description:
        "Gentle direction when it helps and none when it doesn't. Real moments, composed with an editor's eye for light.",
    },
    {
      title: "Curated Digital Galleries",
      description:
        "A private, beautifully presented online gallery for proofing, favoriting and sharing every finished image.",
    },
    {
      title: "Heirloom Print Quality",
      description:
        "Archival papers, linen albums and museum-grade prints, made to be handed down for generations.",
    },
  ],

  contact: {
    email: "hello@lukesphotography.com",
    phone: "(973) 555-0142",
    phoneHref: "tel:+19735550142",
    responseTime: "We reply to every inquiry within two business days.",
  },

  social: [
    { label: "Instagram", href: "https://www.instagram.com/" },
    { label: "Pinterest", href: "https://www.pinterest.com/" },
    { label: "Vimeo", href: "https://vimeo.com/" },
  ],

  nav: [
    { label: "Portfolio", href: "/#portfolio" },
    { label: "Offerings", href: "/#offerings" },
    { label: "Journal", href: "/journal" },
    { label: "About", href: "/#about" },
  ],

  hero: {
    frames: [
      {
        ...unsplash(
          "1546032996-6dfacbacbf3f",
          3705,
          5220,
          "Bride and groom wrapped together in her veil in a golden wheat field",
        ),
        location: "Hopewell",
      },
      {
        ...unsplash(
          "1591604466107-ec97de577aff",
          5861,
          3907,
          "Couple embracing beside a lake framed by autumn foliage",
        ),
        location: "Far Hills",
      },
      {
        ...unsplash(
          "1537633552985-df8429e8048b",
          4480,
          6720,
          "Newlyweds on a pebble beach with her cathedral veil trailing in the wind",
        ),
        location: "Cape May",
      },
      {
        ...unsplash(
          "1544078751-58fee2d8a03b",
          5283,
          3522,
          "Couple dancing on a black-sand beach beneath towering sea stacks",
        ),
        location: "Vík, Iceland",
      },
      {
        ...unsplash(
          "1526510747491-58f928ec870f",
          3638,
          5457,
          "Editorial portrait of a red-haired woman against a warm plaster wall",
        ),
        location: "Hoboken",
      },
      {
        ...unsplash(
          "1519225421980-715cb0215aed",
          5472,
          3648,
          "Long reception table dressed with linen, glassware and wildflowers",
        ),
        location: "Bernardsville",
      },
      {
        ...unsplash(
          "1606216794074-735e91aa2c92",
          4480,
          6720,
          "Bride and groom walking hand in hand beneath a palm tree",
        ),
        location: "Palm Beach",
      },
      {
        ...unsplash(
          "1460364157752-926555421a7e",
          5184,
          3456,
          "Couple sitting among the reeds at the water's edge at sunset",
        ),
        location: "Lake Hopatcong",
      },
      {
        ...unsplash(
          "1525258946800-98cfd641d0de",
          3648,
          5472,
          "Bride holding a bouquet of peach garden roses",
        ),
        location: "Spring Lake",
      },
      {
        ...unsplash(
          "1465847899084-d164df4dedc6",
          7360,
          4912,
          "String musicians performing in warm candlelight",
        ),
        location: "Morristown",
      },
    ],
  },

  offerings: [
    {
      slug: "weddings",
      title: "Weddings & Elopements",
      tagline: "Heirloom coverage of your wedding day, from the quiet first look to the last dance.",
      startingAt: 4800,
      description: [
        "Your wedding is a single day built from a thousand small moments. We document all of it, the nerves and the laughter, the grand gestures and the glances no one else saw, with a calm, unobtrusive presence and an editor's eye for light and composition.",
        "Whether you're planning a two-hundred-guest celebration at a Somerset Hills estate or an elopement on an Icelandic black-sand beach, we'll shape the timeline around the best light and the moments that matter most to you.",
      ],
      included: [
        "Eight hours of coverage with a second photographer",
        "A complimentary engagement session",
        "Timeline planning and location scouting",
        "A private online gallery of 600+ finished images",
        "Heirloom linen album design consultation",
      ],
      coverImage: unsplash(
        "1583939003579-730e3918a45a",
        3355,
        5032,
        "Newlyweds kissing beneath a shower of petals, surrounded by their bridal party",
      ),
      previewImages: [
        unsplash(
          "1515934751635-c81c6bc9a2d8",
          6000,
          4000,
          "Wedding bands resting on a bouquet of blush peonies",
        ),
        unsplash(
          "1494955870715-979ca4f13bf0",
          5184,
          3456,
          "Groom holding his bride's hand beside her bouquet",
        ),
        unsplash(
          "1529636798458-92182e662485",
          6016,
          4016,
          "Ceremony arch draped in chiffon and garden roses",
        ),
      ],
    },
    {
      slug: "portraits",
      title: "Portraits & Couples",
      tagline: "Engagements, anniversaries and portraits made with ease, on the coast, in the city or at home.",
      startingAt: 650,
      description: [
        "Some of our favorite photographs happen on an ordinary evening with the people you love. Portrait sessions are relaxed and lightly guided, timed for golden hour and planned around places that mean something to you.",
        "From an engagement session on the dunes of Cape May to a family portrait in your own backyard, we'll help with wardrobe, location and timing so you can simply be together.",
      ],
      included: [
        "Up to two hours across one or two locations",
        "Wardrobe, styling and location guidance",
        "A private gallery of 80+ finished images",
        "Print release and a fine-art print credit",
      ],
      coverImage: unsplash(
        "1544005313-94ddf0286df2",
        4912,
        7360,
        "Portrait of a woman in a striped shirt in golden evening light",
      ),
      previewImages: [
        unsplash(
          "1501901609772-df0848060b33",
          5184,
          3456,
          "Laughing couple sharing a piggyback ride beneath the trees",
        ),
        unsplash(
          "1438761681033-6461ffad8d80",
          5184,
          3456,
          "Natural-light portrait of a red-haired woman beside a lake",
        ),
        unsplash(
          "1539008835657-9e8e9680c956",
          4480,
          6720,
          "Woman in a flowing blue dress at the shoreline",
        ),
      ],
    },
    {
      slug: "events",
      title: "Private Events & Galas",
      tagline: "Discreet, elegant coverage of black-tie galas, milestone celebrations and private dinners.",
      startingAt: 1800,
      description: [
        "Galas, milestone birthdays, rehearsal dinners and intimate gatherings deserve more than snapshots. We move quietly through the room, capturing the atmosphere, the details your planners labored over, and the candid moments between guests.",
        "For foundations and private hosts alike, we deliver press-ready selects within 48 hours and a complete, color-graded gallery within two weeks.",
      ],
      included: [
        "A minimum of three hours of discreet coverage",
        "Candid, décor and portrait-station photography",
        "48-hour preview selects for press and social",
        "A complete gallery delivered within two weeks",
      ],
      coverImage: unsplash(
        "1519671482749-fd09be7ccebf",
        5760,
        3840,
        "Guests raising glasses of wine in a warm candlelit toast",
      ),
      previewImages: [
        unsplash(
          "1511795409834-ef04bbd61622",
          6016,
          4016,
          "Dinner table set with garden roses, candles and crystal",
        ),
        unsplash(
          "1543007630-9710e4a00a20",
          6144,
          8192,
          "Moody cocktail bar glowing beneath strands of Edison bulbs",
        ),
        unsplash(
          "1470337458703-46ad1756a187",
          6000,
          4008,
          "Bartender pouring an old fashioned over a clear ice cube",
        ),
      ],
    },
    {
      slug: "editorial",
      title: "Commercial & Editorial",
      tagline: "Brand, hospitality and editorial imagery with a fine-art sensibility.",
      startingAt: 2500,
      description: [
        "We partner with fashion houses, restaurants, hotels and creative founders who want imagery that feels considered rather than commercial. Every production begins with a creative brief and a shared moodboard, so the final photographs feel unmistakably yours.",
        "Half- and full-day productions include art direction, on-set previews and licensing tailored to web, social and print campaigns.",
      ],
      included: [
        "Creative direction and shot-list development",
        "Half- or full-day production with styling support",
        "Licensed imagery for web, social and print",
        "Retouched selects delivered within seven days",
      ],
      coverImage: unsplash(
        "1485462537746-965f33f7f6a7",
        3459,
        5188,
        "Woman in a blush wool coat beneath a stone colonnade",
      ),
      previewImages: [
        unsplash(
          "1558769132-cb1aea458c5e",
          4032,
          3024,
          "Neutral knitwear hanging beside dried pampas grass",
        ),
        unsplash(
          "1517248135467-4c7edcad34c4",
          5596,
          3731,
          "Dimly lit restaurant interior with leather banquettes",
        ),
        unsplash(
          "1509042239860-f550ce710b93",
          4480,
          6720,
          "Two cappuccinos with latte art among potted plants",
        ),
      ],
    },
  ],

  fallbackCollections: [
    {
      name: "The Essentials",
      description: "Ten finished photographs of your choosing, delivered in high resolution.",
      priceCents: 25000,
      downloadLimit: 10,
      includesPrints: false,
    },
    {
      name: "The Full Gallery",
      description: "Every finished photograph from your session, yours to download and share.",
      priceCents: 45000,
      downloadLimit: null,
      includesPrints: false,
    },
    {
      name: "The Heirloom Collection",
      description: "The full gallery, plus a credit toward archival prints and albums.",
      priceCents: 65000,
      downloadLimit: null,
      includesPrints: true,
    },
  ],

  clientAccess: {
    eyebrow: "Private Client Galleries",
    quote:
      "Every gallery is a quiet room of its own, a place to linger over the day, choose your favorites, and keep them forever.",
    image: unsplash(
      "1460978812857-470ed1c77af0",
      6256,
      3648,
      "Black-and-white photograph of a couple kissing beneath her windswept veil",
    ),
  },

  booking: {
    lead: "We take on a limited number of weddings and commissions each season, so every story receives our full attention.",
    body: "Tell us a little about your plans: the date, the place, the people, and the feeling you hope your photographs will hold. We'll reply with availability, collections and a few ideas of our own.",
    image: unsplash(
      "1550784718-990c6de52adf",
      3399,
      5140,
      "Bride and groom on the stone terrace of a historic estate in autumn",
    ),
    imageCaption: "Ashford Hall, Far Hills",
    steps: [
      {
        title: "Inquire",
        description:
          "Share your date, location and a little about your plans. We reply within two business days.",
      },
      {
        title: "Connect",
        description:
          "A relaxed call or coffee to talk through your vision, timeline and the collection that fits.",
      },
      {
        title: "Reserve",
        description:
          "A signed agreement and retainer secure your date, and the planning begins in earnest.",
      },
    ],
  },
};
