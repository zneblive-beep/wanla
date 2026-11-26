// "Sticker notebook" look: cream paper, ink outlines with hard shadows, lime as the brand colour.
// The brand is a paper notebook, so the app stays light even when the phone is in dark mode.
const paper = {
  bg: '#F7F1E3', surface: '#FFFFFF', surface2: '#EFE8D8', line: '#E3DCCB',
  ink: '#161616', muted: '#5E5A52', faint: '#8A8577',
  accent: '#C6F432', accentDeep: '#A9D61C', accentInk: '#161616',
  income: '#13804F', expense: '#D8432A', warn: '#B25E00',
  tabBar: '#161616', tabIdle: '#9A968C', shadow: '#161616',
  tomato: '#FF5A36', sun: '#FFD23F', sky: '#7CC4FF', pink: '#FF9EC7', mint: '#6EE7B7', lilac: '#C9B6FF', peach: '#FFB27A',
  heat: ['#EFE8D8', '#FFE1D6', '#FFB59E', '#FF8462', '#FF5A36'],
};
export type Theme = typeof paper;
export const useTheme = (): Theme => paper;

export const FONT = {
  regular: 'IBMPlexSansThai_400Regular',
  medium: 'IBMPlexSansThai_500Medium',
  semi: 'IBMPlexSansThai_600SemiBold',
  bold: 'IBMPlexSansThai_700Bold',
  head: 'Mitr_500Medium',
  headBold: 'Mitr_600SemiBold',
  num: 'BricolageGrotesque_700Bold',
  numBold: 'BricolageGrotesque_800ExtraBold',
};
