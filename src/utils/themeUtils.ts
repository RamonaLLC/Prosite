import { ConstructionTheme } from '../types';

export interface ThemeDefinition {
  id: ConstructionTheme;
  name: string;
  tagline: string;
  className: string;
  isDark: boolean;
  palette: {
    bg: string;
    card: string;
    border: string;
    accent: string;
    text: string;
    badgeBg: string;
    badgeText: string;
  };
  samplePreview: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    cardBg: string;
    textColor: string;
  };
}

export const CONSTRUCTION_THEMES: ThemeDefinition[] = [
  {
    id: 'wood_grain',
    name: 'Wood Grain',
    tagline: 'Warm timber tones with rich cedar & walnut craftsmanship accents',
    className: 'theme-wood-grain',
    isDark: true,
    palette: {
      bg: '#1c130c',
      card: 'rgba(38, 26, 18, 0.94)',
      border: '#78350f',
      accent: '#f59e0b',
      text: '#fef3c7',
      badgeBg: '#78350f',
      badgeText: '#fde68a'
    },
    samplePreview: {
      primaryColor: '#b45309',
      secondaryColor: '#2b1b11',
      accentColor: '#f59e0b',
      cardBg: '#1f150e',
      textColor: '#fef3c7'
    }
  },
  {
    id: 'concrete',
    name: 'Concrete',
    tagline: 'Industrial architectural stone & smooth masonry cool gray',
    className: 'theme-concrete',
    isDark: true,
    palette: {
      bg: '#181d24',
      card: 'rgba(30, 36, 44, 0.94)',
      border: '#475569',
      accent: '#94a3b8',
      text: '#f8fafc',
      badgeBg: '#334155',
      badgeText: '#e2e8f0'
    },
    samplePreview: {
      primaryColor: '#64748b',
      secondaryColor: '#1e242c',
      accentColor: '#cbd5e1',
      cardBg: '#232a34',
      textColor: '#f8fafc'
    }
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    tagline: 'Deep technical cobalt with drafting grid lines & cyan precision',
    className: 'theme-blueprint',
    isDark: true,
    palette: {
      bg: '#08172c',
      card: 'rgba(12, 32, 60, 0.94)',
      border: '#0284c7',
      accent: '#38bdf8',
      text: '#f0f9ff',
      badgeBg: '#0369a1',
      badgeText: '#e0f2fe'
    },
    samplePreview: {
      primaryColor: '#0284c7',
      secondaryColor: '#0c223f',
      accentColor: '#38bdf8',
      cardBg: '#0e2748',
      textColor: '#ffffff'
    }
  },
  {
    id: 'steel',
    name: 'Steel',
    tagline: 'Precision brushed metallic graphite & cool alloy surfaces',
    className: 'theme-steel',
    isDark: true,
    palette: {
      bg: '#14171d',
      card: 'rgba(26, 31, 39, 0.94)',
      border: '#64748b',
      accent: '#94a3b8',
      text: '#f1f5f9',
      badgeBg: '#334155',
      badgeText: '#f8fafc'
    },
    samplePreview: {
      primaryColor: '#475569',
      secondaryColor: '#1e232b',
      accentColor: '#94a3b8',
      cardBg: '#212630',
      textColor: '#f1f5f9'
    }
  },
  {
    id: 'industrial_orange',
    name: 'Industrial Orange',
    tagline: 'High-visibility safety orange & heavy equipment charcoal contrast',
    className: 'theme-industrial-orange',
    isDark: true,
    palette: {
      bg: '#121417',
      card: 'rgba(24, 27, 33, 0.94)',
      border: '#ea580c',
      accent: '#f97316',
      text: '#ffffff',
      badgeBg: '#9a3412',
      badgeText: '#ffedd5'
    },
    samplePreview: {
      primaryColor: '#ea580c',
      secondaryColor: '#1a1d24',
      accentColor: '#fb923c',
      cardBg: '#1f232b',
      textColor: '#ffffff'
    }
  },
  {
    id: 'clean_jobsite',
    name: 'Clean Jobsite',
    tagline: 'Crisp contractor white/linen, deep slate text & safety green accents',
    className: 'theme-clean-jobsite',
    isDark: false,
    palette: {
      bg: '#f8fafc',
      card: 'rgba(255, 255, 255, 0.96)',
      border: '#cbd5e1',
      accent: '#059669',
      text: '#0f172a',
      badgeBg: '#d1fae5',
      badgeText: '#065f46'
    },
    samplePreview: {
      primaryColor: '#059669',
      secondaryColor: '#f1f5f9',
      accentColor: '#10b981',
      cardBg: '#ffffff',
      textColor: '#0f172a'
    }
  },
  {
    id: 'asphalt',
    name: 'Asphalt',
    tagline: 'Deep bitumen matte black with crisp road-stripe yellow accents',
    className: 'theme-asphalt',
    isDark: true,
    palette: {
      bg: '#0a0b0d',
      card: 'rgba(18, 19, 23, 0.96)',
      border: '#ca8a04',
      accent: '#eab308',
      text: '#ffffff',
      badgeBg: '#854d0e',
      badgeText: '#fef08a'
    },
    samplePreview: {
      primaryColor: '#ca8a04',
      secondaryColor: '#16171c',
      accentColor: '#facc15',
      cardBg: '#1a1c22',
      textColor: '#ffffff'
    }
  },
  {
    id: 'natural_stone',
    name: 'Natural Stone',
    tagline: 'Earthy granite, sandstone & shale neutrals with organic warmth',
    className: 'theme-natural-stone',
    isDark: true,
    palette: {
      bg: '#1c1917',
      card: 'rgba(34, 30, 27, 0.94)',
      border: '#78716c',
      accent: '#d6d3d1',
      text: '#fafaf9',
      badgeBg: '#44403c',
      badgeText: '#f5f5f4'
    },
    samplePreview: {
      primaryColor: '#78716c',
      secondaryColor: '#282420',
      accentColor: '#a8a29e',
      cardBg: '#2a2622',
      textColor: '#fafaf9'
    }
  }
];

export function getThemeDefinition(themeId: ConstructionTheme = 'wood_grain'): ThemeDefinition {
  return CONSTRUCTION_THEMES.find(t => t.id === themeId) || CONSTRUCTION_THEMES[0];
}

export function getSavedTheme(role: string): ConstructionTheme {
  try {
    const saved = localStorage.getItem(`prosite_theme_${role}`);
    if (saved && CONSTRUCTION_THEMES.some(t => t.id === saved)) {
      return saved as ConstructionTheme;
    }
  } catch (e) {
    // fallback
  }

  // Default theme per role:
  switch (role) {
    case 'client':
    case 'customer':
      return 'wood_grain';
    case 'company':
    case 'admin':
      return 'blueprint';
    case 'manager':
      return 'concrete';
    case 'worker':
    case 'employee':
      return 'industrial_orange';
    default:
      return 'wood_grain';
  }
}

export function saveTheme(role: string, theme: ConstructionTheme): void {
  try {
    localStorage.setItem(`prosite_theme_${role}`, theme);
  } catch (e) {
    // ignore
  }
}
