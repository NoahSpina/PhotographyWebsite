import { unsplash, type SiteImage } from "@/lib/media";
import type { OfferingSlug } from "@/lib/site-config";

export const JOURNAL_CATEGORIES = ["Weddings", "Events", "Portraits", "Editorial"] as const;

export type JournalCategory = (typeof JOURNAL_CATEGORIES)[number];

export type JournalStory = {
  slug: string;
  title: string;
  category: JournalCategory;
  /** `YYYY-MM-DD` the event was photographed. */
  date: string;
  location: string;
  coverImage: SiteImage;
  excerpt: string;
  readTime: string;
  storyParagraphs: string[];
  pullQuote: string;
  galleryImages: SiteImage[];
};

/** The offering a reader is sent to from a story's booking prompt. */
export const CATEGORY_OFFERING: Record<JournalCategory, OfferingSlug> = {
  Weddings: "weddings",
  Events: "events",
  Portraits: "portraits",
  Editorial: "editorial",
};

/** Newest first. */
export const journalStories: JournalStory[] = [
  {
    slug: "claire-and-james-autumn-estate-wedding",
    title: "Claire & James: An Autumn Estate Wedding in the Somerset Hills",
    category: "Weddings",
    date: "2026-10-17",
    location: "Ashford Hall, Far Hills, New Jersey",
    coverImage: unsplash(
      "1591604466107-ec97de577aff",
      5861,
      3907,
      "Claire and James embracing beside the reflecting pond, framed by autumn foliage",
    ),
    excerpt:
      "Copper leaves, a candlelit tent and a string trio playing Debussy as the sun went down over the Somerset Hills. A weekend celebration that felt like the final chapter of a long love letter.",
    readTime: "6 min read",
    storyParagraphs: [
      "Claire and James first met at a friend's harvest dinner in Far Hills, so when it came time to plan their wedding there was never really a question of where, or when. They wanted the same rolling hills, the same October light, and the same feeling of a long table surrounded by the people they love.",
      "The morning began quietly at the main house. Claire's gown, a silk crepe column with a cathedral-length veil, hung in the bay window of the bridal suite while her sisters steamed it and argued, lovingly, about the playlist. Across the lawn, James and his groomsmen pinned on dried-flower boutonnières their florist had tied with linen thread.",
      "We set aside twenty unhurried minutes for a first look beneath the copper beech at the edge of the reflecting pond. There was no script, just James turning around, a long exhale, and a laugh that carried across the water. Those twenty minutes became some of our favorite frames of the year.",
      "The ceremony took place on the south lawn beneath an arch of garden roses and amaranth, with a string trio playing Clair de Lune as Claire walked down the aisle on her father's arm. When the officiant asked for the rings, the youngest flower girl announced that she had been holding them \u201cvery carefully,\u201d and the whole lawn dissolved into laughter.",
      "As the sun dropped behind the tree line, guests made their way into a sailcloth tent dressed with draped chiffon, a crystal chandelier and long farm tables set with candles and late-season dahlias. The toasts were funny and tearful in equal measure; James's grandmother stole the evening with a story involving a canoe and a very determined swan.",
      "We closed the night with a sparkler exit down the gravel drive, but the photograph we keep returning to is a quieter one: Claire and James alone on the terrace for five minutes before dinner, foreheads touching, the house glowing gold behind them. It is, we think, exactly what the day felt like.",
    ],
    pullQuote: "There was no script, just a long exhale and a laugh that carried across the water.",
    galleryImages: [
      unsplash(
        "1519657337289-077653f724ed",
        5343,
        3562,
        "Wedding gown hanging in the bay window of the bridal suite",
      ),
      unsplash(
        "1517722014278-c256a91a6fba",
        4000,
        2667,
        "Dried-flower boutonnières laid out along a windowsill",
      ),
      unsplash(
        "1550784718-990c6de52adf",
        3399,
        5140,
        "The couple on the estate's stone terrace beneath turning leaves",
      ),
      unsplash(
        "1509927083803-4bd519298ac4",
        7163,
        4778,
        "The bride's ivory heels beside the groom's brown brogues on a wooden deck",
      ),
      unsplash(
        "1469371670807-013ccf25f16a",
        7360,
        4912,
        "Ceremony aisle lined with towering arrangements of garden roses",
      ),
      unsplash(
        "1465495976277-4387d4b0b4c6",
        6000,
        4000,
        "Newlyweds' hands and wedding bands resting on the bridal bouquet",
      ),
      unsplash(
        "1507371341162-763b5e419408",
        5906,
        4636,
        "Autumn trees reflected in the still water of the estate pond",
      ),
      unsplash(
        "1535254973040-607b474cb50d",
        4000,
        6000,
        "Four-tier wedding cake dressed with blush garden roses",
      ),
      unsplash(
        "1510076857177-7470076d4098",
        4256,
        2832,
        "Sailcloth reception tent draped in chiffon beneath a crystal chandelier",
      ),
      unsplash(
        "1502635385003-ee1e6a1a742d",
        3648,
        5472,
        "Candlelit reception table set with florals and crystal glassware",
      ),
    ],
  },
  {
    slug: "maya-and-theo-cape-may-engagement",
    title: "Maya & Theo: Golden Hour on the Cape",
    category: "Portraits",
    date: "2026-09-12",
    location: "Sunset Beach, Cape May, New Jersey",
    coverImage: unsplash(
      "1494774157365-9e04c6720e47",
      5472,
      3648,
      "Maya and Theo silhouetted against an amber sunset sky",
    ),
    excerpt:
      "Bicycles along Beach Avenue, a vintage wrap dress and the last warm light of summer. An engagement session at the very southern tip of New Jersey.",
    readTime: "4 min read",
    storyParagraphs: [
      "Maya and Theo got engaged on the jetty at Sunset Beach, so their engagement session had to begin there too. We met on a warm September evening, just after the summer crowds had gone home and the town had settled into its gentler, golden off-season rhythm.",
      "Theo had rented two cruiser bikes from a shop on Washington Street, and we spent the first half hour riding the length of Beach Avenue, stopping whenever the light did something interesting. Maya wore a floral wrap dress she'd found at a vintage shop in Collingswood; Theo wore the linen shirt he'd proposed in.",
      "We don't ask couples to pose so much as to pay attention to each other. A whispered joke, a piggyback ride along the shaded lane behind the lighthouse, Maya showing off her ring to the camera with mock seriousness. Those small, unguarded beats are where the real photographs live.",
      "By the time we reached the water, the sky had turned the soft peach and lavender Cape May is famous for. Maya waded into the shallows with her dress gathered in one hand while Theo kept an eye on the incoming tide and, more importantly, on her.",
      "We finished as the sun slipped beneath the horizon, two silhouettes on the sand reaching for each other. Their wedding is next June in the Hudson Valley, and we can't wait to see where the story goes from here.",
    ],
    pullQuote: "We don't ask couples to pose so much as to pay attention to each other.",
    galleryImages: [
      unsplash(
        "1501901609772-df0848060b33",
        5184,
        3456,
        "Theo giving Maya a piggyback ride as they both laugh",
      ),
      unsplash(
        "1529519195486-16945f0fb37f",
        3840,
        5760,
        "Close-up of Maya's engagement ring as Theo holds her hand",
      ),
      unsplash(
        "1496747611176-843222e1e57c",
        6016,
        4000,
        "Maya in a floral wrap dress with a woven bag on the seawall",
      ),
      unsplash(
        "1474552226712-ac0f0961a954",
        5315,
        3543,
        "The couple riding bicycles in silhouette, reaching for each other's hands",
      ),
      unsplash(
        "1539008835657-9e8e9680c956",
        4480,
        6720,
        "Maya in a flowing blue dress at the water's edge",
      ),
      unsplash(
        "1500375592092-40eb2168fd21",
        3945,
        5909,
        "A wave cresting in the soft evening light",
      ),
      unsplash(
        "1460364157752-926555421a7e",
        5184,
        3456,
        "The couple sitting together in the dune grass at sunset",
      ),
      unsplash(
        "1473116763249-2faaef81ccda",
        4904,
        3176,
        "Peach and lavender sky over the shoreline at dusk",
      ),
      unsplash(
        "1414609245224-afa02bfb3fda",
        2592,
        3872,
        "The sun setting over the bay, reflected on wet sand",
      ),
    ],
  },
  {
    slug: "atelier-mer-editorial-portraits",
    title: "Atelier Mer: Portraits for a Hoboken Fashion House",
    category: "Editorial",
    date: "2026-06-04",
    location: "Atelier Mer, Hoboken, New Jersey",
    coverImage: unsplash(
      "1532170579297-281918c8ae72",
      5923,
      3890,
      "Low-key portrait of a woman emerging from deep shadow",
    ),
    excerpt:
      "A two-day editorial production for an independent fashion house: chiaroscuro portraits of its founders, makers and muses, shot between a sunlit loft and a studio draped in black velvet.",
    readTime: "5 min read",
    storyParagraphs: [
      "When Atelier Mer's founders asked us to photograph the people behind their autumn collection, they were clear about one thing: no catalog smiles. They wanted portraits with the gravity of an old master painting and the ease of a conversation between friends.",
      "We built the production around two very different spaces. The first was their fourth-floor loft on Washington Street, with whitewashed walls, steel windows and morning light that falls across the floor in long, soft bars. The second was a small studio we wrapped entirely in black velvet, lit with a single large source to carve faces out of shadow.",
      "Over two days we photographed eleven people: the founders, their pattern cutter, two seamstresses who have been with the house since its first collection, and the friends and muses who wear the clothes. Each sitting began with coffee and a conversation about what the work means to them. The camera came out only once everyone had forgotten about it.",
      "Between portraits we documented the atelier itself: racks of undyed wool and silk, hand-finished seams, and the makeup table where artist Sofia Reyes worked quietly through both days. Those details became the connective tissue of the brand's lookbook and press kit.",
      "The final selection of forty images now anchors Atelier Mer's website, its autumn lookbook and a feature in a regional design magazine. More than any campaign we've shot, it reminded us that the most compelling brand imagery is simply honest portraiture of the people who make the thing.",
    ],
    pullQuote:
      "No catalog smiles. Portraits with the gravity of an old master painting and the ease of a conversation between friends.",
    galleryImages: [
      unsplash(
        "1513278974582-3e1b4a4fa21e",
        4480,
        6720,
        "Sunlit loft studio with tall windows and petals scattered across the floor",
      ),
      unsplash(
        "1487412947147-5cebf100ffc2",
        4088,
        2725,
        "Makeup artist applying lipstick to a model before her portrait",
      ),
      unsplash(
        "1526510747491-58f928ec870f",
        3638,
        5457,
        "Red-haired model glancing over her shoulder against a warm plaster wall",
      ),
      unsplash(
        "1558769132-cb1aea458c5e",
        4032,
        3024,
        "Rail of undyed knitwear beside dried pampas grass in the atelier",
      ),
      unsplash(
        "1508186225823-0963cf9ab0de",
        3166,
        4749,
        "Black-and-white portrait of a woman resting her face in her hands",
      ),
      unsplash(
        "1506863530036-1efeddceb993",
        3813,
        2975,
        "Black-and-white portrait of a seamstress with close-cropped hair",
      ),
      unsplash(
        "1552058544-f2b08422138a",
        3300,
        4800,
        "Black-and-white portrait of the house's bearded pattern cutter",
      ),
      unsplash(
        "1485462537746-965f33f7f6a7",
        3459,
        5188,
        "Model in a blush wool coat beneath a stone colonnade",
      ),
      unsplash(
        "1506794778202-cad84cf45f1d",
        3744,
        5616,
        "Moody portrait of a man in a shawl-collar sweater against a dark backdrop",
      ),
    ],
  },
  {
    slug: "evergreen-foundation-winter-gala",
    title: "The Evergreen Foundation Winter Gala",
    category: "Events",
    date: "2026-02-07",
    location: "The Grand Ballroom, Morristown, New Jersey",
    coverImage: unsplash(
      "1511795409834-ef04bbd61622",
      6016,
      4016,
      "Gala dinner table set with garden roses, candles and crystal",
    ),
    excerpt:
      "Black tie, a candlelit string quartet and a room full of generosity. Documenting an evening that raised more than $1.2 million for children's arts education across New Jersey.",
    readTime: "5 min read",
    storyParagraphs: [
      "Every February, the Evergreen Foundation fills a historic Morristown ballroom with four hundred guests in black tie for its annual Winter Gala. This year's evening raised more than $1.2 million for arts education programs in schools across the state, and our job was to tell the story of the night without ever getting in its way.",
      "We arrived three hours early to photograph the room before the doors opened: long tables of ivory linen and blush garden roses, hundreds of taper candles, and place cards hand-lettered by students from one of the foundation's partner schools. Details like these disappear the moment guests sit down, so we treat that quiet hour as its own assignment.",
      "Cocktail hour unfolded in the oak-paneled bar, where the bartenders poured a smoked old fashioned named for the foundation's founder. With two photographers working the room, we moved between candid conversation and the step-and-repeat, where honorees and board members posed for press portraits.",
      "Dinner opened with a performance by a student string quartet whose members first picked up their instruments in an Evergreen-funded program. There wasn't a dry eye in the ballroom by the final movement. The paddle raise that followed was electric, and the toasts ran long into the evening.",
      "By ten the next morning, the foundation's communications team had sixty edited selects for press and social; the full gallery of more than seven hundred images followed eight days later. Our favorite photograph from the night isn't of an honoree at all, but of those young musicians, still in their concert blacks, toasting with sparkling cider at the edge of the dance floor.",
    ],
    pullQuote:
      "Details like these disappear the moment guests sit down, so we treat that quiet hour as its own assignment.",
    galleryImages: [
      unsplash(
        "1519167758481-83f550bb49b3",
        5885,
        3802,
        "The ballroom set for dinner beneath glittering chandeliers",
      ),
      unsplash(
        "1465847899084-d164df4dedc6",
        7360,
        4912,
        "Student string quartet performing by candlelight",
      ),
      unsplash(
        "1519085360753-af0119f7cbe7",
        4000,
        6000,
        "Guest in a dark suit and burgundy tie arriving for the gala",
      ),
      unsplash(
        "1543007630-9710e4a00a20",
        6144,
        8192,
        "The oak-paneled bar glowing with Edison bulbs during cocktail hour",
      ),
      unsplash(
        "1470337458703-46ad1756a187",
        6000,
        4008,
        "Bartender pouring the signature smoked old fashioned",
      ),
      unsplash(
        "1529543544282-ea669407fca3",
        4000,
        6000,
        "Canapés served on a walnut board beside a glass of red wine",
      ),
      unsplash(
        "1519671482749-fd09be7ccebf",
        5760,
        3840,
        "Guests raising their glasses in a toast to the honorees",
      ),
      unsplash(
        "1510812431401-41d2bd2722f3",
        6000,
        4000,
        "Close-up of red wine glasses meeting in a celebratory toast",
      ),
    ],
  },
];

export function getStory(slug: string): JournalStory | undefined {
  return journalStories.find((story) => story.slug === slug);
}

/** The next older story, wrapping around to the newest. */
export function getNextStory(slug: string): JournalStory {
  const index = journalStories.findIndex((story) => story.slug === slug);
  return journalStories[(index + 1) % journalStories.length];
}
