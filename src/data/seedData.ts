import {
  AdPlacement,
  AnalyticsSummary,
  Article,
  ArticleComment,
  Author,
  BreakingNewsConfig,
  Category,
  MediaItem,
  SiteSettings,
} from '../types/editorial';

function createEditorialSvgDataUri(
  title: string,
  subtitle: string,
  primaryHex: string,
  secondaryHex: string,
  accentHex: string
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" width="1200" height="900">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${primaryHex}" />
        <stop offset="65%" stop-color="${secondaryHex}" />
        <stop offset="100%" stop-color="#111111" />
      </linearGradient>
      <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
        <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="1200" height="900" fill="url(#bg)" />
    <rect width="1200" height="900" fill="url(#grid)" />
    <circle cx="950" cy="240" r="290" fill="${accentHex}" opacity="0.18" />
    <circle cx="950" cy="240" r="180" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.5" />
    <circle cx="950" cy="240" r="90" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1" stroke-dasharray="6 6" />
    <line x1="90" y1="120" x2="1110" y2="120" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
    <rect x="90" y="155" width="140" height="6" fill="${accentHex}" />
    <text x="90" y="210" fill="rgba(255,255,255,0.75)" font-family="sans-serif" font-size="18" font-weight="600" letter-spacing="4">${subtitle.toUpperCase()}</text>
    <text x="90" y="680" fill="#FFFFFF" font-family="Georgia, serif" font-size="54" font-weight="600">${title}</text>
    <line x1="90" y1="740" x2="1110" y2="740" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
    <text x="90" y="790" fill="rgba(255,255,255,0.6)" font-family="monospace" font-size="16" letter-spacing="2">WORLDPULSE EDITORIAL ARCHIVE PLATE · SAMPLE VISUAL</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function createAvatarSvgDataUri(initials: string, bgHex: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
    <rect width="240" height="240" rx="120" fill="${bgHex}" />
    <circle cx="120" cy="120" r="110" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2" />
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#FFFFFF" font-family="Georgia, serif" font-size="76" font-weight="600">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-world',
    name: 'World',
    slug: 'world',
    description: 'Diplomatic summits, cross-border policy, regional security, and international affairs.',
    showInNav: true,
    showOnHomepage: true,
    order: 1,
  },
  {
    id: 'cat-politics',
    name: 'Politics',
    slug: 'politics',
    description: 'Elections, legislative debates, governance reforms, and multilateral institutions.',
    showInNav: true,
    showOnHomepage: true,
    order: 2,
  },
  {
    id: 'cat-business',
    name: 'Business',
    slug: 'business',
    description: 'Global trade corridors, central banking, supply chains, corporate strategy, and markets.',
    showInNav: true,
    showOnHomepage: true,
    order: 3,
  },
  {
    id: 'cat-technology',
    name: 'Technology',
    slug: 'technology',
    description: 'Semiconductors, quantum computing, digital infrastructure, AI governance, and cybersecurity.',
    showInNav: true,
    showOnHomepage: true,
    order: 4,
  },
  {
    id: 'cat-science',
    name: 'Science',
    slug: 'science',
    description: 'Space exploration, physics breakthroughs, deep-earth research, and fundamental discovery.',
    showInNav: true,
    showOnHomepage: true,
    order: 5,
  },
  {
    id: 'cat-health',
    name: 'Health',
    slug: 'health',
    description: 'Public health preparedness, biotechnology, clinical research, and global longevity.',
    showInNav: true,
    showOnHomepage: true,
    order: 6,
  },
  {
    id: 'cat-sports',
    name: 'Sports',
    slug: 'sports',
    description: 'International championships, athletic science, tournament economics, and global federations.',
    showInNav: true,
    showOnHomepage: true,
    order: 7,
  },
  {
    id: 'cat-entertainment',
    name: 'Entertainment',
    slug: 'entertainment',
    description: 'World cinema festivals, streaming economics, music, and contemporary media.',
    showInNav: true,
    showOnHomepage: true,
    order: 8,
  },
  {
    id: 'cat-culture',
    name: 'Culture',
    slug: 'culture',
    description: 'Architecture biennales, museum exhibitions, literature, design, and heritage preservation.',
    showInNav: true,
    showOnHomepage: true,
    order: 9,
  },
  {
    id: 'cat-environment',
    name: 'Environment',
    slug: 'environment',
    description: 'Glaciology, clean energy grids, biodiversity treaties, and planetary resilience.',
    showInNav: false,
    showOnHomepage: true,
    order: 10,
  },
  {
    id: 'cat-lifestyle',
    name: 'Lifestyle',
    slug: 'lifestyle',
    description: 'Urban living, modern work culture, culinary traditions, and sustainable design.',
    showInNav: false,
    showOnHomepage: false,
    order: 11,
  },
  {
    id: 'cat-travel',
    name: 'Travel',
    slug: 'travel',
    description: 'High-speed rail networks, cultural corridors, aviation, and responsible global exploration.',
    showInNav: false,
    showOnHomepage: false,
    order: 12,
  },
];

export const INITIAL_AUTHORS: Author[] = [
  {
    id: 'author-elena-rostova',
    name: 'Elena Rostova',
    slug: 'elena-rostova',
    role: 'Chief Diplomatic Correspondent',
    location: 'Geneva & Brussels',
    bio: 'Elena Rostova covers multilateral diplomacy, international treaties, and European security architecture for WORLDPULSE. Over 14 years she has reported from Geneva, Vienna, and New York.',
    photo: createAvatarSvgDataUri('ER', '#6E1723'),
    email: 'elena.rostova@worldpulse.example',
    social: {
      x: 'https://x.com/worldpulse',
      linkedin: 'https://linkedin.com',
    },
  },
  {
    id: 'author-marcus-vance',
    name: 'Marcus Vance',
    slug: 'marcus-vance',
    role: 'Senior Technology & Semiconductor Editor',
    location: 'Zurich & Taipei',
    bio: 'Marcus Vance writes on deep technology, lithography supply chains, quantum hardware, and sovereign compute infrastructure.',
    photo: createAvatarSvgDataUri('MV', '#23395B'),
    email: 'marcus.vance@worldpulse.example',
    social: {
      x: 'https://x.com/worldpulse',
      linkedin: 'https://linkedin.com',
    },
  },
  {
    id: 'author-nadia-al-mansoor',
    name: 'Nadia Al-Mansoor',
    slug: 'nadia-al-mansoor',
    role: 'Global Trade & Maritime Economics Editor',
    location: 'Singapore & Dubai',
    bio: 'Nadia Al-Mansoor tracks maritime freight corridors, sovereign debt markets, commodity logistics, and central bank monetary policy.',
    photo: createAvatarSvgDataUri('NA', '#4A0F18'),
    email: 'nadia.almansoor@worldpulse.example',
    social: {
      x: 'https://x.com/worldpulse',
      linkedin: 'https://linkedin.com',
    },
  },
  {
    id: 'author-henrik-lindqvist',
    name: 'Dr. Henrik Lindqvist',
    slug: 'henrik-lindqvist',
    role: 'Science & Planetary Systems Correspondent',
    location: 'Stockholm & Tromsø',
    bio: 'Dr. Henrik Lindqvist is a former polar researcher and science journalist covering glaciology, clean energy grids, and space observation.',
    photo: createAvatarSvgDataUri('HL', '#1F4E5B'),
    email: 'henrik.lindqvist@worldpulse.example',
    social: {
      x: 'https://x.com/worldpulse',
      linkedin: 'https://linkedin.com',
    },
  },
  {
    id: 'author-claire-beaumont',
    name: 'Claire Beaumont',
    slug: 'claire-beaumont',
    role: 'Culture, Architecture & Design Critic',
    location: 'Paris & Venice',
    bio: 'Claire Beaumont reports on public architecture, museum curation, world cinema, and urban cultural movements across five continents.',
    photo: createAvatarSvgDataUri('CB', '#3D2B1F'),
    email: 'claire.beaumont@worldpulse.example',
    social: {
      x: 'https://x.com/worldpulse',
      linkedin: 'https://linkedin.com',
    },
  },
];

export const INITIAL_BREAKING_NEWS: BreakingNewsConfig = {
  enabled: true,
  label: 'EDITORIAL DEMO BRIEFING',
  headline:
    'Geneva Multilateral Forum Unveils Cross-Border Framework for Sovereign Digital & Maritime Corridors [Sample Demo Article]',
  articleSlug: 'geneva-accord-digital-maritime-corridors-demo',
  categorySlug: 'world',
  startTime: '2026-10-08T00:00:00Z',
  endTime: '2026-12-31T23:59:59Z',
};

export const INITIAL_ARTICLES: Article[] = [
  {
    id: 'art-1',
    title: 'Inside the Geneva Accord: How 42 Nations Drafted a New Blueprint for Digital and Maritime Trade Corridors',
    subtitle:
      'EDITORIAL DEMO SAMPLE — After fourteen months of closed-door negotiations, diplomats have proposed unified customs telemetry and subsea cable protection standards.',
    slug: 'geneva-accord-digital-maritime-corridors-demo',
    category: 'world',
    categoryName: 'World',
    tags: ['Diplomacy', 'Global Trade', 'Geneva', 'Infrastructure', 'Demo Sample'],
    authorId: 'author-elena-rostova',
    authorName: 'Elena Rostova',
    authorRole: 'Chief Diplomatic Correspondent',
    featuredImage: '/src/assets/images/editorial_summit_diplomacy_1791455442775.jpg',
    imageCaption:
      'Fig. 1 — Delegates confer inside the main travertine assembly concourse in Geneva during the final plenary review. (WORLDPULSE Editorial Demo Visual)',
    body: `<p><em>Editor’s Note: This article is clearly labeled sample demonstration content created to showcase the WORLDPULSE editorial publishing platform. It can be edited or removed at any time from the Admin Dashboard.</em></p>
<p>Across the sunlit travertine halls of Geneva’s multilateral district, senior trade envoys and infrastructure ministers spent the past week finalizing a document that few outside technical ministries expected to survive its third draft. The proposed framework—informally dubbed the Corridor Resilience Protocol—seeks to harmonize how forty-two participating states protect subsea telecommunications cables while digitizing customs clearance across seven major maritime choke points.</p>
<h2>A Convergence of Physical and Digital Arteries</h2>
<p>For decades, international maritime conventions and telecommunications treaties operated in separate legal silos. Shipping insurers worried about port congestion and draught limits; telecommunications regulators focused on spectrum allocation and landing stations. Yet the past three years of supply-chain bottlenecks demonstrated that modern cargo vessels move only as fast as the cryptographic customs manifests preceding them.</p>
<blockquote>“When a single subsea fiber conduit or customs clearinghouse experiences latency, forty container vessels wait at anchor within twelve hours. Infrastructure resilience is no longer divisible into sea and silicon.”</blockquote>
<p>Under the draft protocol, participating port authorities will adopt an open, zero-trust verification standard for bills of lading, reducing average container dwell times by an estimated 28 percent while maintaining sovereign audit controls.</p>
<h3>Key Provisions Under Review</h3>
<ul>
  <li><strong>Joint Subsea Repair Corridors:</strong> Pre-authorized maritime maintenance zones allowing specialized cable-repair ships expedited transit through exclusive economic zones within 18 hours of a fault alert.</li>
  <li><strong>Interoperable Customs Ledger:</strong> Standardized cryptographic manifests recognized simultaneously by port authorities in Europe, East Asia, the Gulf, and the Americas.</li>
  <li><strong>Emergency Bulk Commodity Lanes:</strong> Priority berth allocation for grain, pharmaceutical cold-chain shipments, and grid-scale energy components during regional disruptions.</li>
</ul>
<table>
  <thead>
    <tr>
      <th>Corridor Region</th>
      <th>Participating Ports (Sample Data)</th>
      <th>Projected Dwell Reduction</th>
      <th>Target Ratification</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>North Sea – Mediterranean</td>
      <td>14 Deepwater Terminals</td>
      <td>-31.0%</td>
      <td>Q2 2027</td>
    </tr>
    <tr>
      <td>Red Sea – Indian Ocean</td>
      <td>11 Deepwater Terminals</td>
      <td>-26.5%</td>
      <td>Q3 2027</td>
    </tr>
    <tr>
      <td>Trans-Pacific East-West</td>
      <td>17 Deepwater Terminals</td>
      <td>-24.0%</td>
      <td>Q4 2027</td>
    </tr>
  </tbody>
</table>
<h2>The Road to Parliamentary Ratification</h2>
<p>While technical delegations have initialed the annex schedules, domestic ratification remains a complex hurdle. Several industrial federations have requested transitional subsidies to upgrade legacy port terminal operating systems. Formal ministerial signatures are scheduled for the upcoming winter session.</p>`,
    status: 'published',
    publishedAt: '2026-10-08T08:30:00Z',
    updatedAt: '2026-10-08T10:15:00Z',
    readingTime: 6,
    views: 18420,
    isLead: true,
    isTrending: true,
    isDeveloping: true,
    developingUpdates: [
      {
        id: 'upd-1',
        timestamp: '10:15 UTC',
        summary: 'Technical working group releases Annex IV covering subsea fiber repair vessel permits.',
      },
      {
        id: 'upd-2',
        timestamp: '08:45 UTC',
        summary: 'Joint communique endorsed by 42 ministerial delegations in Geneva morning session.',
      },
    ],
    isDemo: true,
    seo: {
      title: 'Inside the Geneva Accord: Digital and Maritime Trade Corridors | WORLDPULSE',
      description:
        'Sample Demo Article: How 42 nations drafted a blueprint for digital customs telemetry and subsea cable protection.',
      canonicalUrl: '/world/geneva-accord-digital-maritime-corridors-demo',
      ogTitle: 'Inside the Geneva Accord: Digital and Maritime Trade Corridors',
      ogDescription:
        'Sample Demo Article: How 42 nations drafted a blueprint for digital customs telemetry and subsea cable protection.',
      ogImage: '/src/assets/images/editorial_summit_diplomacy_1791455442775.jpg',
    },
  },
  {
    id: 'art-2',
    title: 'Sub-Nanometer Horizons: Inside the Cleanrooms Building Fault-Tolerant Quantum Interconnects',
    subtitle:
      'EDITORIAL DEMO SAMPLE — European and Asian photonics consortia demonstrate cryogenic optical links capable of bridging modular quantum processors.',
    slug: 'sub-nanometer-quantum-interconnects-cleanroom-demo',
    category: 'technology',
    categoryName: 'Technology',
    tags: ['Quantum Computing', 'Semiconductors', 'Photonics', 'Hardware', 'Demo Sample'],
    authorId: 'author-marcus-vance',
    authorName: 'Marcus Vance',
    authorRole: 'Senior Technology & Semiconductor Editor',
    featuredImage: '/src/assets/images/editorial_quantum_semiconductor_1791455487056.jpg',
    imageCaption:
      'Fig. 2 — Optical metrology inspection inside a vibration-isolated lithography bay. (WORLDPULSE Editorial Demo Visual)',
    body: `<p><em>Editor’s Note: This article is sample demonstration content created for WORLDPULSE and can be removed in one click from the Admin Dashboard.</em></p>
<p>For the past decade, the race to build practical quantum computers focused almost entirely on cramming more qubits onto a single dilution-refrigerator chip. Now, materials engineers in Zurich, Delft, and Hsinchu are tackling a different bottleneck: how to network multiple cryogenic processors together without destroying fragile quantum states.</p>
<h2>Why Modularity Changes the Scaling Curve</h2>
<p>Just as classical supercomputers rely on high-speed optical interconnects to link thousands of server blades, fault-tolerant quantum systems will require low-loss photonic bridges operating near absolute zero. By converting microwave excitations into telecom-wavelength photons, researchers have demonstrated coherent state transfer across thirty meters of specialized cryogenic waveguide.</p>
<blockquote>“Scaling a single monolithic wafer beyond ten thousand physical qubits introduces severe thermal and crosstalk penalties. Modular optical backplanes turn a fabrication wall into a systems-engineering problem.”</blockquote>
<h2>Industrial Lithography Meets Cryogenic Packaging</h2>
<p>The breakthrough relies on manufacturing silicon-nitride waveguides using standard 300-millimeter Extreme Ultraviolet (EUV) foundry tooling. That compatibility means research laboratories no longer need bespoke artisanal fabrication lines to produce ultra-low-loss resonators.</p>`,
    status: 'published',
    publishedAt: '2026-10-08T07:10:00Z',
    updatedAt: '2026-10-08T07:10:00Z',
    readingTime: 5,
    views: 14290,
    isLead: false,
    isTrending: true,
    isDeveloping: false,
    isDemo: true,
    seo: {
      title: 'Sub-Nanometer Horizons: Fault-Tolerant Quantum Interconnects | WORLDPULSE',
      description:
        'Sample Demo Article: How photonics consortia are bridging modular quantum processors using standard foundry lithography.',
      canonicalUrl: '/technology/sub-nanometer-quantum-interconnects-cleanroom-demo',
      ogTitle: 'Sub-Nanometer Horizons: Fault-Tolerant Quantum Interconnects',
      ogDescription:
        'Sample Demo Article: How photonics consortia are bridging modular quantum processors using standard foundry lithography.',
      ogImage: '/src/assets/images/editorial_quantum_semiconductor_1791455487056.jpg',
    },
  },
  {
    id: 'art-3',
    title: 'The New Maritime Calculus: Why Global Container Lines Are Investing in Green Methanol Corridors',
    subtitle:
      'EDITORIAL DEMO SAMPLE — Port authorities from Rotterdam to Singapore are re-engineering bunkering infrastructure as dual-fuel vessels enter service.',
    slug: 'maritime-green-methanol-corridors-global-trade-demo',
    category: 'business',
    categoryName: 'Business',
    tags: ['Global Trade', 'Shipping', 'Energy Transition', 'Logistics', 'Demo Sample'],
    authorId: 'author-nadia-al-mansoor',
    authorName: 'Nadia Al-Mansoor',
    authorRole: 'Global Trade & Maritime Economics Editor',
    featuredImage: '/src/assets/images/editorial_global_shipping_trade_1791455503732.jpg',
    imageCaption:
      'Fig. 3 — An ultra-large container vessel transits a misty deepwater strait at dawn. (WORLDPULSE Editorial Demo Visual)',
    body: `<p><em>Editor’s Note: This article is sample demonstration content created for WORLDPULSE.</em></p>
<p>Maritime shipping carries more than eighty percent of global merchandise trade by volume, yet decarbonizing long-haul ocean freight has long been considered one of industrial economics’ hardest problems. Over the past eighteen months, however, vessel orderbooks have tilted decisively toward dual-fuel propulsion capable of burning e-methanol and bio-methanol.</p>
<h2>Supply Chains Behind the Fuel Bunkers</h2>
<p>Buying a dual-fuel container ship is straightforward compared with guaranteeing fuel availability across twelve ports of call. In response, major port authorities have formed bilateral "green bunkering corridors," synchronizing safety protocols, mass-balance certification, and long-term offtake agreements with renewable hydrogen producers.</p>
<blockquote>“Fleet renewal is no longer dictated solely by slot-cost economics; cargo owners are locking in multi-year freight contracts indexed to verified lifecycle emissions.”</blockquote>
<p>Financial analysts note that sovereign green bonds have increasingly underwritten terminal storage tanks, narrowing the cost spread between conventional marine gasoil and synthetic fuels.</p>`,
    status: 'published',
    publishedAt: '2026-10-07T19:45:00Z',
    updatedAt: '2026-10-07T19:45:00Z',
    readingTime: 5,
    views: 11950,
    isLead: false,
    isTrending: true,
    isDeveloping: false,
    isDemo: true,
    seo: {
      title: 'The New Maritime Calculus: Green Methanol Shipping Corridors | WORLDPULSE',
      description:
        'Sample Demo Article: Port authorities from Rotterdam to Singapore re-engineer bunkering infrastructure.',
      canonicalUrl: '/business/maritime-green-methanol-corridors-global-trade-demo',
      ogTitle: 'The New Maritime Calculus: Green Methanol Shipping Corridors',
      ogDescription:
        'Sample Demo Article: Port authorities from Rotterdam to Singapore re-engineer bunkering infrastructure.',
      ogImage: '/src/assets/images/editorial_global_shipping_trade_1791455503732.jpg',
    },
  },
  {
    id: 'art-4',
    title: 'Deep Ice Archives: What Svalbard’s Two-Kilometer Glacial Cores Reveal About Atmospheric Shifts',
    subtitle:
      'EDITORIAL DEMO SAMPLE — International glaciology teams complete a three-season drilling campaign to preserve ancient trapped air bubbles before seasonal melt accelerates.',
    slug: 'svalbard-deep-ice-core-climate-archive-demo',
    category: 'environment',
    categoryName: 'Environment',
    tags: ['Climate', 'Glaciology', 'Arctic', 'Science', 'Demo Sample'],
    authorId: 'author-henrik-lindqvist',
    authorName: 'Dr. Henrik Lindqvist',
    authorRole: 'Science & Planetary Systems Correspondent',
    featuredImage: '/src/assets/images/editorial_arctic_climate_glacier_1791455521756.jpg',
    imageCaption:
      'Fig. 4 — Researchers monitor telemetry stations along an Arctic glacial ridge at polar twilight. (WORLDPULSE Editorial Demo Visual)',
    body: `<p><em>Editor’s Note: This article is sample demonstration content created for WORLDPULSE.</em></p>
<p>High on a wind-scoured ice divide in the Svalbard archipelago, glaciologists have extracted the final cylindrical sections of a 1,980-meter ice core. Sealed in insulated aluminum crates and transported to sub-zero vaults, the cylinders hold a continuous, high-resolution chemical record of northern hemisphere atmospheric circulation spanning millennia.</p>
<h2>Reading the Microscopic的气泡</h2>
<p>Using continuous-flow laser spectroscopy, paleoclimatologists can measure trace greenhouse gases, volcanic sulfate layers, and Saharan dust particulates at sub-annual resolution. Those measurements help calibrate regional climate models that predict how rapidly high-latitude warming alters jet-stream stability.</p>
<blockquote>“Every meter of deep polar ice is an irreplaceable library of Earth’s atmospheric memory. Preserving these cores in international cold vaults ensures future instruments can analyze isotopes we cannot yet measure.”</blockquote>`,
    status: 'published',
    publishedAt: '2026-10-07T16:20:00Z',
    updatedAt: '2026-10-07T16:20:00Z',
    readingTime: 7,
    views: 9840,
    isLead: false,
    isTrending: true,
    isDeveloping: false,
    isDemo: true,
    seo: {
      title: 'Deep Ice Archives: Svalbard Glacial Cores & Atmospheric Shifts | WORLDPULSE',
      description:
        'Sample Demo Article: International glaciology teams preserve ancient ice cores for high-resolution climate modeling.',
      canonicalUrl: '/environment/svalbard-deep-ice-core-climate-archive-demo',
      ogTitle: 'Deep Ice Archives: Svalbard Glacial Cores & Atmospheric Shifts',
      ogDescription:
        'Sample Demo Article: International glaciology teams preserve ancient ice cores for high-resolution climate modeling.',
      ogImage: '/src/assets/images/editorial_arctic_climate_glacier_1791455521756.jpg',
    },
  },
  {
    id: 'art-5',
    title: 'Stone, Timber, and Shadow: How Civic Architecture Returned to Low-Carbon Vernacular Materials',
    subtitle:
      'EDITORIAL DEMO SAMPLE — At this year’s international architectural exhibition, structural stone and cross-laminated timber replace high-embodied-carbon glass towers.',
    slug: 'civic-architecture-stone-timber-biennale-demo',
    category: 'culture',
    categoryName: 'Culture',
    tags: ['Architecture', 'Design', 'Sustainability', 'Culture', 'Demo Sample'],
    authorId: 'author-claire-beaumont',
    authorName: 'Claire Beaumont',
    authorRole: 'Culture, Architecture & Design Critic',
    featuredImage: '/src/assets/images/editorial_cultural_biennale_architecture_1791455538345.jpg',
    imageCaption:
      'Fig. 5 — Visitors walk through a load-bearing limestone and timber pavilion illuminated by natural clerestory light. (WORLDPULSE Editorial Demo Visual)',
    body: `<p><em>Editor’s Note: This article is sample demonstration content created for WORLDPULSE.</em></p>
<p>For nearly half a century, global civic architecture spoke a uniform language of steel trusses, poured concrete, and sealed glass curtain walls. Walking through the pavilions of this season’s international architecture forum reveals a striking reversal: architects are rediscovering quarried load-bearing stone, rammed earth, and precision-milled mass timber.</p>
<h2>Structural Honesty and Thermal Mass</h2>
<p>By tensioning quarried limestone blocks with post-tensioned steel cables, structural engineers can span generous public concourses with a fraction of the embodied carbon of reinforced concrete. At the same time, thick masonry walls provide natural thermal inertia, reducing mechanical cooling loads in Mediterranean and subtropical climates.</p>`,
    status: 'published',
    publishedAt: '2026-10-07T12:00:00Z',
    updatedAt: '2026-10-07T12:00:00Z',
    readingTime: 5,
    views: 8320,
    isLead: false,
    isTrending: false,
    isDeveloping: false,
    isDemo: true,
    seo: {
      title: 'Stone, Timber, and Shadow: Low-Carbon Civic Architecture | WORLDPULSE',
      description:
        'Sample Demo Article: Load-bearing limestone and cross-laminated timber take center stage in contemporary civic architecture.',
      canonicalUrl: '/culture/civic-architecture-stone-timber-biennale-demo',
      ogTitle: 'Stone, Timber, and Shadow: Low-Carbon Civic Architecture',
      ogDescription:
        'Sample Demo Article: Load-bearing limestone and cross-laminated timber take center stage in contemporary civic architecture.',
      ogImage: '/src/assets/images/editorial_cultural_biennale_architecture_1791455538345.jpg',
    },
  },
  {
    id: 'art-6',
    title: 'Parliaments in the Age of Algorithmic Auditing: Why Legislatures Are Hiring Public-Interest Technologists',
    subtitle:
      'EDITORIAL DEMO SAMPLE — Comparative policy review shows seventeen national assemblies have established non-partisan technical assessment bureaus since 2024.',
    slug: 'parliaments-algorithmic-auditing-bureaus-demo',
    category: 'politics',
    categoryName: 'Politics',
    tags: ['Governance', 'Policy', 'Digital Rights', 'Parliaments', 'Demo Sample'],
    authorId: 'author-elena-rostova',
    authorName: 'Elena Rostova',
    authorRole: 'Chief Diplomatic Correspondent',
    featuredImage: createEditorialSvgDataUri(
      'Legislative Tech Bureaus',
      'Politics & Governance Report',
      '#4A0F18',
      '#1F242D',
      '#8C2634'
    ),
    imageCaption:
      'Fig. 6 —WORLDPULSE Policy Graphic: Parliamentary scientific & technical assessment units worldwide. (Demo Sample)',
    body: `<p><em>Editor’s Note: This article is sample demonstration content created for WORLDPULSE.</em></p>
<p>When legislative committees scrutinize fiscal budgets, they rely on independent parliamentary budget offices staffed by career economists. Now, a growing cohort of national legislatures is applying that same institutional model to complex technological legislation—establishing permanent, non-partisan engineering and algorithmic auditing bureaus.</p>
<h2>Bridging the Technical Asymmetry</h2>
<p>Rather than relying solely on external industry testimony, parliamentary technologists conduct independent stress tests of public-sector procurement systems, digital identity wallets, and critical infrastructure resilience rules before bills reach a floor vote.</p>`,
    status: 'published',
    publishedAt: '2026-10-06T18:30:00Z',
    updatedAt: '2026-10-06T18:30:00Z',
    readingTime: 4,
    views: 7410,
    isLead: false,
    isTrending: false,
    isDeveloping: false,
    isDemo: true,
    seo: {
      title: 'Parliaments in the Age of Algorithmic Auditing | WORLDPULSE',
      description: 'Sample Demo Article: How national legislatures are building non-partisan technical assessment offices.',
      canonicalUrl: '/politics/parliaments-algorithmic-auditing-bureaus-demo',
      ogTitle: 'Parliaments in the Age of Algorithmic Auditing',
      ogDescription: 'Sample Demo Article: How national legislatures are building non-partisan technical assessment offices.',
      ogImage: '',
    },
  },
  {
    id: 'art-7',
    title: 'Next-Generation Deep Space Interferometry: Mapping Exoplanet Atmospheres in the Mid-Infrared',
    subtitle:
      'EDITORIAL DEMO SAMPLE — Consortium of space agencies completes cryogenic mirror alignment tests for formation-flying orbital telescopes.',
    slug: 'deep-space-interferometry-exoplanet-atmospheres-demo',
    category: 'science',
    categoryName: 'Science',
    tags: ['Space', 'Astronomy', 'Astrophysics', 'Science', 'Demo Sample'],
    authorId: 'author-henrik-lindqvist',
    authorName: 'Dr. Henrik Lindqvist',
    authorRole: 'Science & Planetary Systems Correspondent',
    featuredImage: createEditorialSvgDataUri(
      'Orbital Interferometry',
      'Space & Astrophysics Briefing',
      '#13293D',
      '#0B132B',
      '#6E1723'
    ),
    imageCaption:
      'Fig. 7 — Schematic representation of formation-flying mid-infrared collector arrays. (WORLDPULSE Demo Sample)',
    body: `<p><em>Editor’s Note: This article is sample demonstration content created for WORLDPULSE.</em></p>
<p>By flying multiple collector spacecraft in laser-locked formation separated by hundreds of meters, astrophysicists can synthesize an effective telescope aperture far larger than any single rocket fairing could launch. New vacuum-chamber trials confirm that picometer-scale laser metrology can null out the blinding glare of host stars to isolate thermal emission spectra from rocky exoplanets.</p>`,
    status: 'published',
    publishedAt: '2026-10-06T14:15:00Z',
    updatedAt: '2026-10-06T14:15:00Z',
    readingTime: 6,
    views: 6890,
    isLead: false,
    isTrending: false,
    isDeveloping: false,
    isDemo: true,
    seo: {
      title: 'Deep Space Interferometry: Mapping Exoplanet Atmospheres | WORLDPULSE',
      description: 'Sample Demo Article: Cryogenic mirror alignment tests for formation-flying orbital telescopes.',
      canonicalUrl: '/science/deep-space-interferometry-exoplanet-atmospheres-demo',
      ogTitle: 'Deep Space Interferometry: Mapping Exoplanet Atmospheres',
      ogDescription: 'Sample Demo Article: Cryogenic mirror alignment tests for formation-flying orbital telescopes.',
      ogImage: '',
    },
  },
  {
    id: 'art-8',
    title: 'Decentralized Cold-Chain Diagnostics: How Thermostable Reagents Are Transforming Rural Clinics',
    subtitle:
      'EDITORIAL DEMO SAMPLE — Lyophilized molecular assays allow rapid pathogen screening without sub-zero freezer logistics.',
    slug: 'thermostable-diagnostics-rural-health-clinics-demo',
    category: 'health',
    categoryName: 'Health',
    tags: ['Public Health', 'Biotech', 'Diagnostics', 'Global Health', 'Demo Sample'],
    authorId: 'author-henrik-lindqvist',
    authorName: 'Dr. Henrik Lindqvist',
    authorRole: 'Science & Planetary Systems Correspondent',
    featuredImage: createEditorialSvgDataUri(
      'Thermostable Diagnostics',
      'Global Health & Biotech',
      '#1B4332',
      '#081C15',
      '#8C2634'
    ),
    imageCaption:
      'Fig. 8 — Field-ready lyophilized assay cartridges designed for ambient-temperature storage. (WORLDPULSE Demo Sample)',
    body: `<p><em>Editor’s Note: This article is sample demonstration content created for WORLDPULSE.</em></p>
<p>Historically, advanced molecular diagnostics required an unbroken cold chain from factory floor to regional hospital. By freeze-drying enzyme cascades inside microfluidic cartridges stabilized with trehalose matrices, biomedical teams have demonstrated twelve-month shelf stability at temperatures up to 40 degrees Celsius.</p>`,
    status: 'published',
    publishedAt: '2026-10-05T17:00:00Z',
    updatedAt: '2026-10-05T17:00:00Z',
    readingTime: 4,
    views: 5920,
    isLead: false,
    isTrending: false,
    isDeveloping: false,
    isDemo: true,
    seo: {
      title: 'Thermostable Diagnostics in Global Health Clinics | WORLDPULSE',
      description: 'Sample Demo Article: Lyophilized molecular assays enable rapid screening without sub-zero cold chains.',
      canonicalUrl: '/health/thermostable-diagnostics-rural-health-clinics-demo',
      ogTitle: 'Thermostable Diagnostics in Global Health Clinics',
      ogDescription: 'Sample Demo Article: Lyophilized molecular assays enable rapid screening without sub-zero cold chains.',
      ogImage: '',
    },
  },
  {
    id: 'art-9',
    title: 'Biomechanics of the Marathon Calendar: How High-Altitude Telemetry Reshaped Endurance Pacing',
    subtitle:
      'EDITORIAL DEMO SAMPLE — Sports physiologists examine metabolic lactate thresholds and carbon-composite midsole energy return across major city courses.',
    slug: 'biomechanics-marathon-altitude-telemetry-sports-demo',
    category: 'sports',
    categoryName: 'Sports',
    tags: ['Athletics', 'Sports Science', 'Marathon', 'Endurance', 'Demo Sample'],
    authorId: 'author-marcus-vance',
    authorName: 'Marcus Vance',
    authorRole: 'Senior Technology & Semiconductor Editor',
    featuredImage: createEditorialSvgDataUri(
      'Endurance Biomechanics',
      'Sports Science & Athletics',
      '#2B2D42',
      '#141622',
      '#6E1723'
    ),
    imageCaption:
      'Fig. 9 — Stride economy and metabolic telemetry across international marathon courses. (WORLDPULSE Demo Sample)',
    body: `<p><em>Editor’s Note: This article is sample demonstration content created for WORLDPULSE.</em></p>
<p>Elite distance running has undergone a quiet scientific revolution. Combining continuous interstitial glucose and lactate monitoring with wind-tunnel cadence analysis, endurance coaching staffs now calibrate kilometer-by-kilometer pacing strategies tailored to specific course elevation profiles and microclimates.</p>`,
    status: 'published',
    publishedAt: '2026-10-05T11:20:00Z',
    updatedAt: '2026-10-05T11:20:00Z',
    readingTime: 4,
    views: 6450,
    isLead: false,
    isTrending: false,
    isDeveloping: false,
    isDemo: true,
    seo: {
      title: 'Biomechanics of the Marathon Calendar | WORLDPULSE',
      description: 'Sample Demo Article: How physiological telemetry and footwear physics reshaped distance running.',
      canonicalUrl: '/sports/biomechanics-marathon-altitude-telemetry-sports-demo',
      ogTitle: 'Biomechanics of the Marathon Calendar',
      ogDescription: 'Sample Demo Article: How physiological telemetry and footwear physics reshaped distance running.',
      ogImage: '',
    },
  },
  {
    id: 'art-10',
    title: 'The Restoration of Celluloid Archives: Why Film Festivals Are Funding Photochemical Vaults',
    subtitle:
      'EDITORIAL DEMO SAMPLE — International cinémathèques collaborate on 4K wet-gate scanning and silver-halide preservation of twentieth-century world cinema.',
    slug: 'restoration-celluloid-archives-world-cinema-demo',
    category: 'entertainment',
    categoryName: 'Entertainment',
    tags: ['Cinema', 'Film Preservation', 'Festivals', 'Archives', 'Demo Sample'],
    authorId: 'author-claire-beaumont',
    authorName: 'Claire Beaumont',
    authorRole: 'Culture, Architecture & Design Critic',
    featuredImage: createEditorialSvgDataUri(
      'World Cinema Vaults',
      'Entertainment & Film Heritage',
      '#3D131A',
      '#1A1415',
      '#8C2634'
    ),
    imageCaption:
      'Fig. 10 — Photochemical inspection bench at an international film archive restoration laboratory. (WORLDPULSE Demo Sample)',
    body: `<p><em>Editor’s Note: This article is sample demonstration content created for WORLDPULSE.</em></p>
<p>Even in an era of ubiquitous cloud streaming, archivists agree that properly stored polyester-base 35mm film remains one of humanity’s most durable long-term storage mediums. Across Bologna, Tokyo, Dakar, and Mexico City, non-profit film foundations are pooling resources to rescue fragile acetate negatives and strike new archival interpositives.</p>`,
    status: 'published',
    publishedAt: '2026-10-04T15:40:00Z',
    updatedAt: '2026-10-04T15:40:00Z',
    readingTime: 5,
    views: 5380,
    isLead: false,
    isTrending: false,
    isDeveloping: false,
    isDemo: true,
    seo: {
      title: 'The Restoration of Celluloid Archives in World Cinema | WORLDPULSE',
      description: 'Sample Demo Article: International cinémathèques collaborate on photochemical preservation.',
      canonicalUrl: '/entertainment/restoration-celluloid-archives-world-cinema-demo',
      ogTitle: 'The Restoration of Celluloid Archives in World Cinema',
      ogDescription: 'Sample Demo Article: International cinémathèques collaborate on photochemical preservation.',
      ogImage: '',
    },
  },
];

export const INITIAL_MEDIA: MediaItem[] = [
  {
    id: 'media-1',
    title: 'Geneva Multilateral Diplomatic Summit Concourse',
    url: '/src/assets/images/editorial_summit_diplomacy_1791455442775.jpg',
    altText: 'Delegates in discussion inside a modern glass and travertine assembly hall in Geneva',
    caption: 'Delegates confer inside the main travertine assembly concourse in Geneva.',
    mimeType: 'image/jpeg',
    dimensions: '1600 × 900 (16:9)',
    uploadedAt: '2026-10-08T03:31:00Z',
    sizeKb: 340,
  },
  {
    id: 'media-2',
    title: 'Quantum Computing & Semiconductor Lithography Cleanroom',
    url: '/src/assets/images/editorial_quantum_semiconductor_1791455487056.jpg',
    altText: 'Engineer inspecting precision optical machinery inside a quantum lithography cleanroom',
    caption: 'Optical metrology inspection inside a vibration-isolated lithography bay.',
    mimeType: 'image/jpeg',
    dimensions: '1200 × 900 (4:3)',
    uploadedAt: '2026-10-08T03:31:30Z',
    sizeKb: 310,
  },
  {
    id: 'media-3',
    title: 'Global Maritime Trade Container Vessel at Dawn',
    url: '/src/assets/images/editorial_global_shipping_trade_1791455503732.jpg',
    altText: 'Cargo container ship navigating through a strategic maritime strait at dawn',
    caption: 'An ultra-large container vessel transits a misty deepwater strait at dawn.',
    mimeType: 'image/jpeg',
    dimensions: '1200 × 900 (4:3)',
    uploadedAt: '2026-10-08T03:31:50Z',
    sizeKb: 295,
  },
  {
    id: 'media-4',
    title: 'Arctic Glacier Ice-Core Research Station',
    url: '/src/assets/images/editorial_arctic_climate_glacier_1791455521756.jpg',
    altText: 'Scientific researchers monitoring ice-core equipment on an Arctic glacier',
    caption: 'Researchers monitor telemetry stations along an Arctic glacial ridge.',
    mimeType: 'image/jpeg',
    dimensions: '1200 × 900 (4:3)',
    uploadedAt: '2026-10-08T03:32:08Z',
    sizeKb: 325,
  },
  {
    id: 'media-5',
    title: 'International Architecture Biennale Stone & Timber Pavilion',
    url: '/src/assets/images/editorial_cultural_biennale_architecture_1791455538345.jpg',
    altText: 'Contemporary limestone and timber pavilion at an international architecture biennale',
    caption: 'Load-bearing limestone and timber pavilion illuminated by natural light.',
    mimeType: 'image/jpeg',
    dimensions: '1200 × 900 (4:3)',
    uploadedAt: '2026-10-08T03:32:26Z',
    sizeKb: 318,
  },
];

export const INITIAL_ADS: AdPlacement[] = [
  {
    id: 'ad-header',
    name: 'Header Leaderboard Banner',
    slotKey: 'header',
    enabled: false,
    network: 'house',
    publisherId: 'ca-pub-0000000000000000',
    adSlotId: '1000000001',
    format: 'horizontal',
    customCode: '',
    sponsorLabel: 'WORLDPULSE ANNUAL BRIEFING',
    headline: 'Subscribe to the WORLDPULSE Global Morning Dispatch — Free daily intelligence.',
    ctaText: 'Subscribe',
    ctaUrl: '#newsletter',
  },
  {
    id: 'ad-home-top',
    name: 'Homepage Top Placement',
    slotKey: 'homepage_top',
    enabled: false,
    network: 'adsense',
    publisherId: 'ca-pub-0000000000000000',
    adSlotId: '1000000002',
    format: 'responsive',
    customCode: '',
    sponsorLabel: 'ADVERTISEMENT',
    headline: 'Global Institutional Research & Market Data',
    ctaText: 'Learn More',
    ctaUrl: '/about',
  },
  {
    id: 'ad-home-middle',
    name: 'Homepage Middle Editorial Band',
    slotKey: 'homepage_middle',
    enabled: true,
    network: 'house',
    publisherId: 'ca-pub-0000000000000000',
    adSlotId: '1000000003',
    format: 'horizontal',
    customCode: '',
    sponsorLabel: 'WORLDPULSE INSTITUTIONAL EDITIONS',
    headline: 'Download the 2026 Global Infrastructure & Trade Outlook Report — Complimentary Reader Edition',
    ctaText: 'Explore Report',
    ctaUrl: '/business',
  },
  {
    id: 'ad-home-bottom',
    name: 'Homepage Bottom Placement',
    slotKey: 'homepage_bottom',
    enabled: false,
    network: 'adsense',
    publisherId: 'ca-pub-0000000000000000',
    adSlotId: '1000000004',
    format: 'responsive',
    customCode: '',
  },
  {
    id: 'ad-article-top',
    name: 'Article Top Placement',
    slotKey: 'article_top',
    enabled: false,
    network: 'adsense',
    publisherId: 'ca-pub-0000000000000000',
    adSlotId: '1000000005',
    format: 'horizontal',
    customCode: '',
  },
  {
    id: 'ad-article-middle',
    name: 'Article Inline Middle Placement',
    slotKey: 'article_middle',
    enabled: true,
    network: 'house',
    publisherId: 'ca-pub-0000000000000000',
    adSlotId: '1000000006',
    format: 'responsive',
    customCode: '',
    sponsorLabel: 'READER ACCESSIBILITY FEATURE',
    headline: 'Reading from a low-connectivity region? Save any WORLDPULSE dispatch to your Offline Vault.',
    ctaText: 'Open Offline Vault',
    ctaUrl: '#offline',
  },
  {
    id: 'ad-article-bottom',
    name: 'Article Bottom Placement',
    slotKey: 'article_bottom',
    enabled: false,
    network: 'adsense',
    publisherId: 'ca-pub-0000000000000000',
    adSlotId: '1000000007',
    format: 'responsive',
    customCode: '',
  },
  {
    id: 'ad-sidebar',
    name: 'Sidebar Executive Placement',
    slotKey: 'sidebar',
    enabled: true,
    network: 'house',
    publisherId: 'ca-pub-0000000000000000',
    adSlotId: '1000000008',
    format: 'rectangle',
    customCode: '',
    sponsorLabel: 'WORLDPULSE SYMPOSIUM',
    headline: 'Geneva & Singapore Editorial Forums 2026: Global Trade, Compute & Climate Resilience.',
    ctaText: 'View Editorial Mission',
    ctaUrl: '/about',
  },
  {
    id: 'ad-category',
    name: 'Category Archive Banner',
    slotKey: 'category_page',
    enabled: false,
    network: 'adsense',
    publisherId: 'ca-pub-0000000000000000',
    adSlotId: '1000000009',
    format: 'horizontal',
    customCode: '',
  },
  {
    id: 'ad-footer',
    name: 'Footer Banner Placement',
    slotKey: 'footer',
    enabled: false,
    network: 'adsense',
    publisherId: 'ca-pub-0000000000000000',
    adSlotId: '1000000010',
    format: 'horizontal',
    customCode: '',
  },
];

export const INITIAL_COMMENTS: ArticleComment[] = [
  {
    id: 'cmt-1',
    articleId: 'art-1',
    articleTitle: 'Inside the Geneva Accord: How 42 Nations Drafted a New Blueprint for Digital and Maritime Trade Corridors',
    authorName: 'Dr. Lukas Meyer, Maritime Law Fellow',
    authorEmail: 'lukas.meyer@example.org',
    content:
      'The distinction between exclusive economic zone maintenance permits and port customs telemetry is the most practical element of Annex IV. Strong synthesis of the technical working group.',
    createdAt: '2026-10-08T09:20:00Z',
    status: 'approved',
  },
  {
    id: 'cmt-2',
    articleId: 'art-2',
    articleTitle: 'Sub-Nanometer Horizons: Inside the Cleanrooms Building Fault-Tolerant Quantum Interconnects',
    authorName: 'Sora Takahashi, Photonics Engineer',
    authorEmail: 'sora.t@example.jp',
    content:
      'Silicon-nitride waveguide loss below 0.5 dB/m at millikelvin temperatures is the real milestone here. Looking forward to follow-up coverage on cryo-CMOS control multiplexers.',
    createdAt: '2026-10-08T08:05:00Z',
    status: 'approved',
  },
  {
    id: 'cmt-3',
    articleId: 'art-1',
    articleTitle: 'Inside the Geneva Accord: How 42 Nations Drafted a New Blueprint for Digital and Maritime Trade Corridors',
    authorName: 'Amira Haddad',
    authorEmail: 'amira.h@example.com',
    content:
      'Does the draft protocol include transitional financing for smaller Mediterranean and West African container terminals?',
    createdAt: '2026-10-08T10:02:00Z',
    status: 'pending',
  },
];

export const INITIAL_SITE_SETTINGS: SiteSettings = {
  siteName: 'WORLDPULSE',
  tagline: 'The world. In focus.',
  siteDescription:
    'WORLDPULSE is an independent international digital news and trends publication covering world events, politics, business, technology, science, health, culture, and the environment.',
  editorialEmail: 'editorial@worldpulse.press',
  pressEmail: 'press@worldpulse.press',
  headquarters: 'International Editorial Desk · London · Geneva · Singapore · New York',
  commentsEnabled: true,
  demoBannerVisible: true,
  googleAnalyticsId: 'G-WP2026GLOBAL',
  googleSearchConsoleCode: 'wp-site-verification-2026-global',
  adsensePublisherId: 'ca-pub-0000000000000000',
  newsletter: {
    title: 'Stay informed.',
    description: "Get the world's important stories in your inbox.",
    provider: 'internal',
    formActionUrl: '',
  },
  social: {
    facebook: 'https://facebook.com/worldpulse',
    instagram: 'https://instagram.com/worldpulse',
    x: 'https://x.com/worldpulse',
    youtube: 'https://youtube.com/@worldpulse',
    linkedin: 'https://linkedin.com/company/worldpulse',
    tiktok: 'https://tiktok.com/@worldpulse',
  },
};

export const INITIAL_ANALYTICS: AnalyticsSummary = {
  totalPageViews: 94860,
  uniqueVisitors: 61420,
  avgReadingTimeSec: 268,
  NewsletterSubscribersCount: 14820,
  topCountries: [
    { country: 'United States', code: 'US', percentage: 26.4, views: 25043 },
    { country: 'United Kingdom', code: 'GB', percentage: 16.8, views: 15936 },
    { country: 'Germany & Switzerland', code: 'CH', percentage: 14.2, views: 13470 },
    { country: 'Singapore & APAC', code: 'SG', percentage: 13.5, views: 12806 },
    { country: 'Canada', code: 'CA', percentage: 9.1, views: 8632 },
    { country: 'Rest of World', code: 'GLOBAL', percentage: 20.0, views: 18973 },
  ],
  trafficSources: [
    { source: 'Direct & Bookmarks', percentage: 38.5 },
    { source: 'Organic Search & Google News', percentage: 33.2 },
    { source: 'Social Referrals (X, LinkedIn, Instagram)', percentage: 16.8 },
    { source: 'Daily Briefing Newsletter', percentage: 11.5 },
  ],
  deviceBreakdown: [
    { device: 'Mobile Editorial Web', percentage: 56.4 },
    { device: 'Desktop & Workstation', percentage: 37.8 },
    { device: 'Tablet & E-Readers', percentage: 5.8 },
  ],
  topSearchQueries: [
    { query: 'Geneva maritime digital corridor', count: 1420 },
    { query: 'quantum photonic interconnects EUV', count: 980 },
    { query: 'green methanol shipping ports', count: 845 },
    { query: 'Svalbard deep ice core archive', count: 710 },
    { query: 'limestone timber architecture biennale', count: 590 },
  ],
  dailyTraffic: [
    { date: 'Oct 02', views: 11200, visitors: 7400 },
    { date: 'Oct 03', views: 12450, visitors: 8100 },
    { date: 'Oct 04', views: 11890, visitors: 7850 },
    { date: 'Oct 05', views: 13600, visitors: 8920 },
    { date: 'Oct 06', views: 14920, visitors: 9640 },
    { date: 'Oct 07', views: 15100, visitors: 9810 },
    { date: 'Oct 08', views: 15700, visitors: 9700 },
  ],
};
