import { WorkerProfile, CompanyCard, Job, AppNotification, ExpensePurchase } from '../types';

// Inline SVG and mock image presets for before/after project photos
export const MOCK_IMAGES = {
  kitchenBefore: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <rect width="600" height="400" fill="%234b5563"/>
    <rect x="50" y="50" width="500" height="300" fill="%231f2937" rx="10"/>
    <text x="300" y="100" fill="%239ca3af" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">Kitchen - BEFORE Remodel (Main)</text>
    <path d="M 100 150 L 500 150 M 100 250 L 500 250" stroke="%23374151" stroke-width="4"/>
    <rect x="120" y="180" width="80" height="120" fill="%236b7280" stroke="%234b5563"/>
    <rect x="220" y="180" width="160" height="120" fill="%23374151" stroke="%234b5563"/>
    <rect x="400" y="180" width="80" height="120" fill="%236b7280" stroke="%234b5563"/>
    <circle cx="200" cy="240" r="15" fill="%23ef4444" opacity="0.4"/>
    <text x="210" y="245" fill="%23fca5a5" font-family="sans-serif" font-size="10">Old Cabinetry</text>
    <text x="300" y="360" fill="%23f3f4f6" font-family="sans-serif" font-size="14" text-anchor="middle">Initial Site Demolition State</text>
  </svg>`,

  kitchenBefore2: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <rect width="600" height="400" fill="%23374151"/>
    <rect x="50" y="50" width="500" height="300" fill="%23111827" rx="10"/>
    <text x="300" y="100" fill="%23f59e0b" font-family="sans-serif" font-size="20" font-weight="bold" text-anchor="middle">Kitchen - BEFORE (Plumbing & Studs Angle)</text>
    <line x1="150" y1="140" x2="150" y2="320" stroke="%239ca3af" stroke-width="8"/>
    <line x1="250" y1="140" x2="250" y2="320" stroke="%239ca3af" stroke-width="8"/>
    <line x1="350" y1="140" x2="350" y2="320" stroke="%239ca3af" stroke-width="8"/>
    <line x1="450" y1="140" x2="450" y2="320" stroke="%239ca3af" stroke-width="8"/>
    <circle cx="250" cy="220" r="20" fill="%233b82f6" opacity="0.6"/>
    <text x="250" y="270" fill="%2393c5fd" font-family="sans-serif" font-size="12" text-anchor="middle">Exposed Rough Plumbing</text>
  </svg>`,

  kitchenBefore3: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <rect width="600" height="400" fill="%23475569"/>
    <rect x="50" y="50" width="500" height="300" fill="%230f172a" rx="10"/>
    <text x="300" y="100" fill="%23cbd5e1" font-family="sans-serif" font-size="20" font-weight="bold" text-anchor="middle">Kitchen - BEFORE (Subfloor & Electrical)</text>
    <rect x="100" y="240" width="400" height="80" fill="%23334155"/>
    <path d="M 120 180 Q 300 220 480 160" fill="none" stroke="%23eab308" stroke-width="4"/>
    <text x="300" y="280" fill="%23fde047" font-family="sans-serif" font-size="12" text-anchor="middle">Subfloor leveling and Romex cable prep</text>
  </svg>`,

  kitchenAfter: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <rect width="600" height="400" fill="%23065f46"/>
    <rect x="50" y="50" width="500" height="300" fill="%23022c22" rx="10"/>
    <text x="300" y="90" fill="%2334d399" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">Kitchen - AFTER Construction (Main Island)</text>
    <rect x="80" y="150" width="120" height="180" fill="%23b45309" rx="4"/>
    <rect x="220" y="200" width="160" height="130" fill="%231e3a8a" rx="4"/>
    <rect x="400" y="150" width="120" height="180" fill="%23b45309" rx="4"/>
    <text x="300" y="240" fill="%2393c5fd" font-family="sans-serif" font-size="12" text-anchor="middle">Marble Island Benchtop</text>
    <circle cx="300" cy="200" r="12" fill="%23fbbf24" stroke="%23fff" stroke-width="2"/>
    <text x="300" y="360" fill="%23f3f4f6" font-family="sans-serif" font-size="14" text-anchor="middle">Upgraded Oak Panel Finish</text>
  </svg>`,

  kitchenAfter2: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <rect width="600" height="400" fill="%23047857"/>
    <rect x="50" y="50" width="500" height="300" fill="%23064e3b" rx="10"/>
    <text x="300" y="90" fill="%23a7f3d0" font-family="sans-serif" font-size="20" font-weight="bold" text-anchor="middle">Kitchen - AFTER (Custom Cabinetry & Sinks)</text>
    <rect x="100" y="140" width="180" height="160" fill="%2378350f" rx="6"/>
    <rect x="320" y="140" width="180" height="160" fill="%2378350f" rx="6"/>
    <circle cx="190" cy="220" r="8" fill="%23fbbf24"/>
    <circle cx="410" cy="220" r="8" fill="%23fbbf24"/>
    <text x="300" y="340" fill="%23ecfdf5" font-family="sans-serif" font-size="13" text-anchor="middle">Soft-Close Solid Wood Millwork</text>
  </svg>`,

  deckBefore: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <rect width="600" height="400" fill="%2378350f"/>
    <rect x="40" y="40" width="520" height="320" fill="%23451a03" rx="8"/>
    <text x="300" y="100" fill="%23f59e0b" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">Yard Site - BEFORE Deck Extension</text>
    <path d="M 50 250 Q 300 150 550 250" fill="none" stroke="%23b45309" stroke-width="6"/>
    <rect x="150" y="250" width="300" height="70" fill="%233f1a04"/>
    <text x="300" y="290" fill="%23d97706" font-family="sans-serif" font-size="13" text-anchor="middle">Cleared lawn, raw topsoil prep area</text>
  </svg>`,

  deckBefore2: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <rect width="600" height="400" fill="%23854d0e"/>
    <rect x="40" y="40" width="520" height="320" fill="%23422006" rx="8"/>
    <text x="300" y="100" fill="%23fef08a" font-family="sans-serif" font-size="20" font-weight="bold" text-anchor="middle">Deck - BEFORE (Foundation Footings Excavation)</text>
    <circle cx="150" cy="220" r="30" fill="%23713f12"/>
    <circle cx="300" cy="220" r="30" fill="%23713f12"/>
    <circle cx="450" cy="220" r="30" fill="%23713f12"/>
    <text x="300" y="280" fill="%23fef9c3" font-family="sans-serif" font-size="12" text-anchor="middle">Concrete Sonotube Footings Bored</text>
  </svg>`,

  deckAfter: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <rect width="600" height="400" fill="%231e3a8a"/>
    <rect x="40" y="40" width="520" height="320" fill="%23172554" rx="8"/>
    <text x="300" y="100" fill="%2360a5fa" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">Cedar Deck - COMPLETE</text>
    <rect x="100" y="180" width="400" height="140" fill="%23d97706" rx="4"/>
    <path d="M 120 180 L 120 320 M 160 180 L 160 320 M 200 180 L 200 320 M 240 180 L 240 320 M 280 180 L 280 320 M 320 180 L 320 320 M 360 180 L 360 320 M 400 180 L 400 320 M 440 180 L 440 320 M 480 180 L 480 320" stroke="%2378350f" stroke-width="2"/>
    <text x="300" y="260" fill="%23fef3c7" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="middle">16x24 Treated Cedar Expansion</text>
  </svg>`
};

export const INITIAL_WORKERS: WorkerProfile[] = [
  {
    id: 'w1',
    name: 'Luis Alvarez',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150',
    position: 'Lead Carpenter',
    jobRole: 'Lead Carpenter',
    isAtJob: false,
    assignedCardIds: []
  },
  {
    id: 'w2',
    name: 'Marcus Chen',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150',
    position: 'Lead Plumber / Electrician',
    jobRole: 'Lead Plumber / Electrician',
    isAtJob: false,
    assignedCardIds: []
  },
  {
    id: 'w3',
    name: 'Devin Jenkins',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
    position: 'Site Coordinator / Framer',
    jobRole: 'Site Coordinator / Framer',
    isAtJob: false,
    assignedCardIds: []
  }
];

export const INITIAL_CARDS: CompanyCard[] = [];

export const INITIAL_EXPENSES: ExpensePurchase[] = [];

export const INITIAL_JOBS: Job[] = [];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];
