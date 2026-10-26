export interface CompanyProfile {
  id: string;
  name: string;
  avatar: string;
  trades: string[];
  rating: number;
  serviceArea: string;
  inspectionFee: number;
  overview: string;
  avgResponseTime: string;
  licenseNumber: string;
  insuranceCover: string;
  projectPhotos: string[];
  favoritesCount: number;
  stripeConnectedAccountId?: string;
  stripeConnectStatus?: 'connected' | 'pending' | 'not_connected';
  reviews: {
    author: string;
    rating: number;
    text: string;
    date: string;
  }[];
}

export const BUILDER_COMPANIES: CompanyProfile[] = [
  {
    id: 'co-1',
    name: 'ProSite Contractors',
    avatar: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=300',
    trades: ['General Remodeling', 'Framing', 'Decks', 'Plumbing'],
    rating: 4.9,
    serviceArea: 'San Francisco & Bay Area',
    inspectionFee: 150,
    favoritesCount: 42,
    stripeConnectedAccountId: 'acct_1ProSiteCA984210',
    stripeConnectStatus: 'connected',
    overview: 'Premier full-service building contractors specializing in high-end structural woodwork, deck extensions, kitchen overhauls, and complete custom home renovations. Backed by 15+ years of local craftsmanship.',
    avgResponseTime: 'Under 1 hour',
    licenseNumber: 'CSLB-902110-A',
    insuranceCover: '$5,000,000 General Liability',
    projectPhotos: [
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=400',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=400',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&q=80&w=400'
    ],
    reviews: [
      {
        author: 'Elena Vance',
        rating: 5,
        text: 'The crew was incredibly tidy and framing was so precise. Absolutely flawless custom oak cabinets!',
        date: '2026-06-18'
      },
      {
        author: 'Robert G.',
        rating: 4.8,
        text: 'Built an incredible backyard patio. Professional team that updates via the app constantly. Prevents any scope surprise.',
        date: '2026-05-12'
      }
    ]
  },
  {
    id: 'co-2',
    name: 'Apex Structural Framing',
    avatar: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=300',
    trades: ['Framing', 'Roofing', 'Concrete Foundation'],
    rating: 4.7,
    serviceArea: 'San Mateo & Peninsula',
    inspectionFee: 220,
    favoritesCount: 28,
    stripeConnectedAccountId: 'acct_2ApexStrCA742215',
    stripeConnectStatus: 'connected',
    overview: 'Heavy structural engineers and custom framing crews. We specialize in foundations, grade-beams, retrofitting, seismic strengthening, and commercial shell carpentry.',
    avgResponseTime: 'Under 2 hours',
    licenseNumber: 'CSLB-742215-B',
    insuranceCover: '$2,000,000 General Liability',
    projectPhotos: [
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=400',
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=400'
    ],
    reviews: [
      {
        author: 'Michael T.',
        rating: 5,
        text: 'Best framing crew on the Peninsula. Scheduled inspection on Tuesday, approved on Wednesday, start next week. Fast bids!',
        date: '2026-04-30'
      }
    ]
  },
  {
    id: 'co-3',
    name: 'Mosaic Premium Finishes',
    avatar: 'https://images.unsplash.com/photo-1502005229762-fc1b2b812ca5?auto=format&fit=crop&q=80&w=300',
    trades: ['Tile & Tiling', 'Marble Mosaic', 'Bathroom Remodeling'],
    rating: 4.8,
    serviceArea: 'Marin County & SF Base',
    inspectionFee: 120,
    favoritesCount: 35,
    stripeConnectedAccountId: 'acct_3MosaicCA881290',
    stripeConnectStatus: 'connected',
    overview: 'Artisanal masonry and tile-setters focusing on high-precision luxury mosaics, herringbone marble backsplashes, microcement, and wet-room waterproofing systems.',
    avgResponseTime: 'Within 3 hours',
    licenseNumber: 'CSLB-881290-C15',
    insuranceCover: '$1,000,000 General Liability',
    projectPhotos: [
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&q=80&w=400',
      'https://images.unsplash.com/photo-1620626011761-996317b6979a?auto=format&fit=crop&q=80&w=400'
    ],
    reviews: [
      {
        author: 'Harold Vance',
        rating: 5,
        text: 'Completed an immaculate bathroom tiling job. Subfloor leveler was super flat and herringbone tiles aligned beautifully.',
        date: '2026-06-18'
      }
    ]
  }
];
