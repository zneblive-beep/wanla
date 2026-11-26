/**
 * Feature switches.
 *
 * slips: slip scanning, reading new slips from the photo album, and the Claude API key setting.
 * Off for the closed beta, because it needs each tester to bring their own API key.
 * Turn it back on once slips are read through Wanla's own server.
 */
export const FEATURES = {
  slips: false,
} as const;
