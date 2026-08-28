// Colour themes for the quiz renderer, taken from the Quiz Palettes design.
//
// A theme carries more roles than the original settings did: the design uses a
// three-stop background gradient, a panel surface with its own border, separate
// heading and muted text colours, and tinted answer options. Applying a theme
// writes these values into the quiz's settings, so a user can still adjust any
// of them afterwards and a published quiz never changes because a preset did.

export interface QuizThemeColors {
  /** Page background, as three gradient stops (top, middle, bottom). */
  bgFrom: string;
  bgVia: string;
  bgTo: string;
  /** The card the question sits on. */
  panelBg: string;
  panelBorder: string;
  /** Brand colour: progress fill, selected states, badges. */
  accent: string;
  /** Question and page headings. */
  heading: string;
  /** Sub-copy and helper text. */
  muted: string;
  /** Answer options. */
  optionBg: string;
  optionBorder: string;
  optionText: string;
  headingFont: string;
  bodyFont: string;
}

export interface QuizThemePreset extends QuizThemeColors {
  id: string;
  name: string;
  group: 'Dark' | 'Light';
}

export const QUIZ_THEMES: QuizThemePreset[] = [
  {
    id: 'forest-mint',
    name: 'Forest Mint',
    group: 'Dark',
    bgFrom: '#04120c',
    bgVia: '#0a2318',
    bgTo: '#0d2c1e',
    panelBg: '#0e3323',
    panelBorder: '#1c4a34',
    accent: '#5bf2a5',
    heading: '#eafff3',
    muted: '#9dc6b0',
    optionBg: '#124029',
    optionBorder: '#1d5537',
    optionText: '#dcf7e8',
    headingFont: 'Nunito',
    bodyFont: 'DM Sans',
  },
  {
    id: 'deep-blue',
    name: 'Deep Blue',
    group: 'Dark',
    bgFrom: '#071a3d',
    bgVia: '#0d2f6b',
    bgTo: '#123b84',
    panelBg: 'rgba(255,255,255,.07)',
    panelBorder: 'rgba(255,255,255,.14)',
    accent: '#ffffff',
    heading: '#ffffff',
    muted: 'rgba(255,255,255,.78)',
    optionBg: 'rgba(255,255,255,.10)',
    optionBorder: 'rgba(255,255,255,.22)',
    optionText: '#ffffff',
    headingFont: 'Nunito',
    bodyFont: 'DM Sans',
  },
  {
    id: 'midnight-purple',
    name: 'Midnight Purple',
    group: 'Dark',
    bgFrom: '#060409',
    bgVia: '#0b0714',
    bgTo: '#100b1d',
    panelBg: '#120e1f',
    panelBorder: '#2f2452',
    accent: '#b18cff',
    heading: '#f1ecff',
    muted: '#a598cc',
    optionBg: '#1a1430',
    optionBorder: '#2a2049',
    optionText: '#ece5ff',
    headingFont: 'Nunito',
    bodyFont: 'DM Sans',
  },
  {
    id: 'midnight-coral',
    name: 'Midnight Coral',
    group: 'Dark',
    bgFrom: '#070405',
    bgVia: '#12090a',
    bgTo: '#180c0d',
    panelBg: '#150c0d',
    panelBorder: '#3a2124',
    accent: '#ff7a6b',
    heading: '#fdeceb',
    muted: '#bd9995',
    optionBg: '#1f1315',
    optionBorder: '#332022',
    optionText: '#f8e5e3',
    headingFont: 'Nunito',
    bodyFont: 'DM Sans',
  },
  {
    id: 'sage',
    name: 'Sage',
    group: 'Light',
    bgFrom: '#dfeadb',
    bgVia: '#eef2e7',
    bgTo: '#f7f5ee',
    panelBg: '#fbfaf4',
    panelBorder: '#e4e9dc',
    accent: '#3f7d5c',
    heading: '#21402f',
    muted: '#5d6f61',
    optionBg: '#f2f5e8',
    optionBorder: '#e2e8d5',
    optionText: '#21402f',
    headingFont: 'Nunito',
    bodyFont: 'DM Sans',
  },
  {
    id: 'teal-cream',
    name: 'Teal & Cream',
    group: 'Light',
    bgFrom: '#cfe6e4',
    bgVia: '#e6f0ea',
    bgTo: '#f6f2e7',
    panelBg: '#fcfbf6',
    panelBorder: '#e6e3d3',
    accent: '#0f6d68',
    heading: '#10403f',
    muted: '#57706f',
    optionBg: '#fdf6e0',
    optionBorder: '#efe3c4',
    optionText: '#10403f',
    headingFont: 'Nunito',
    bodyFont: 'DM Sans',
  },
  {
    id: 'terracotta',
    name: 'Terracotta',
    group: 'Light',
    bgFrom: '#f2ded3',
    bgVia: '#f8ebe0',
    bgTo: '#fcf6ee',
    panelBg: '#fdf8f2',
    panelBorder: '#f0dfd0',
    accent: '#c0552f',
    heading: '#4a2418',
    muted: '#7a5a4b',
    optionBg: '#fbeee3',
    optionBorder: '#f0d9c6',
    optionText: '#4a2418',
    headingFont: 'Nunito',
    bodyFont: 'DM Sans',
  },
  {
    id: 'ice-blue',
    name: 'Ice Blue',
    group: 'Light',
    bgFrom: '#d7e2f4',
    bgVia: '#e8eefa',
    bgTo: '#f6f8fc',
    panelBg: '#fdfdff',
    panelBorder: '#e2e8f5',
    accent: '#2b57c8',
    heading: '#14265a',
    muted: '#5c6a8c',
    optionBg: '#eef3fd',
    optionBorder: '#dae4f8',
    optionText: '#14265a',
    headingFont: 'Nunito',
    bodyFont: 'DM Sans',
  },
  {
    id: 'stone-lime',
    name: 'Stone & Lime',
    group: 'Light',
    bgFrom: '#e4e6dc',
    bgVia: '#eff0e9',
    bgTo: '#f8f8f5',
    panelBg: '#ffffff',
    panelBorder: '#e7e9de',
    accent: '#a8d600',
    heading: '#16180f',
    muted: '#63665a',
    optionBg: '#f5f7ea',
    optionBorder: '#e4e8d2',
    optionText: '#16180f',
    headingFont: 'Nunito',
    bodyFont: 'DM Sans',
  },
  {
    id: 'warm-amber',
    name: 'Warm Amber',
    group: 'Dark',
    bgFrom: '#050403',
    bgVia: '#0e0c0a',
    bgTo: '#14110d',
    panelBg: '#161311',
    panelBorder: '#352e26',
    accent: '#e08a4c',
    heading: '#f6ede4',
    muted: '#a99c8e',
    optionBg: '#1f1b16',
    optionBorder: '#2e2820',
    optionText: '#f2e8de',
    headingFont: 'Nunito',
    bodyFont: 'DM Sans',
  },
];

export const findTheme = (id?: string | null): QuizThemePreset | undefined =>
  QUIZ_THEMES.find((t) => t.id === id);
