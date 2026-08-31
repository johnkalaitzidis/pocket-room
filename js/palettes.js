/** Unique slots already present on japanese room.glb — never add extra hues. */
export const slotOrder = [
  "black",
  "night",
  "wood",
  "katana",
  "timber",
  "iron",
  "milk",
  "moss",
  "jade",
  "wrap",
  "leaf",
  "ceramic",
  "gold",
  "lamp",
];

export const colorLabels = {
  black: "Frame",
  night: "Alcove",
  wood: "Walls",
  katana: "Katana",
  timber: "Table",
  iron: "Hardware",
  milk: "Cushions",
  moss: "Tatami",
  jade: "Bonsai",
  wrap: "Binding",
  leaf: "Plant",
  ceramic: "Cups",
  gold: "Accents",
  lamp: "Lantern",
};

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]) {
  const h = (c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function mix(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(A.map((v, i) => v + (B[i] - v) * t));
}

function shade(hex, t) {
  return mix(hex, "#000000", t);
}

function tint(hex, t) {
  return mix(hex, "#ffffff", t);
}

/**
 * Expand a Happy Hues set into the model's 14 existing slots
 * using only tints / shades / mixes of those hues.
 */
function fromHues({
  ink,
  paper,
  highlight,
  secondary,
  tertiary,
  mute,
  wash,
}) {
  const wood = mix(ink, mute ?? wash ?? paper, 0.28);
  return {
    black: ink,
    night: mix(ink, secondary, 0.22),
    wood,
    katana: tertiary,
    timber: mix(wood, mute ?? wash ?? paper, 0.45),
    iron: mix(ink, paper, 0.38),
    milk: mix(mute ?? wash ?? paper, paper, 0.55),
    moss: mix(highlight, ink, 0.42),
    jade: mix(highlight, secondary, 0.28),
    wrap: secondary,
    leaf: highlight,
    ceramic: mix(paper, mute ?? tertiary, 0.22),
    gold: mix(highlight, tertiary, 0.35),
    lamp: paper,
  };
}

const original = {
  black: "#1f2200",
  night: "#131051",
  wood: "#37362a",
  katana: "#6c1c14",
  timber: "#7b6240",
  iron: "#626262",
  milk: "#919191",
  moss: "#00990d",
  jade: "#3ca76b",
  wrap: "#bc6ed2",
  leaf: "#00d104",
  ceramic: "#d1bca7",
  gold: "#cad100",
  lamp: "#fffffe",
};

export const palettes = [
  {
    id: "original",
    name: "Green Tatami",
    source: "japanese room.glb",
    quote: "Same 14 colors.",
    page: { bg: "#1a1610", bgMid: "#2c261c", paper: "#fff8ef", ink: "#1a120e" },
    colors: original,
  },
  {
    id: "goddess",
    name: "Cyan Plant",
    source: "Happy Hues · palette 1",
    quote: "Soft lilac clay.",
    page: { bg: "#1b1425", bgMid: "#2e2438", paper: "#fffffe", ink: "#181818" },
    colors: fromHues({
      ink: "#181818",
      paper: "#fffffe",
      highlight: "#4fc4cf",
      secondary: "#994ff3",
      tertiary: "#fbdd74",
      mute: "#f2eef5",
      wash: "#f6efef",
    }),
  },
  {
    id: "cheese",
    name: "Mint Plant",
    source: "Happy Hues · palette 2",
    quote: "Navy, mint, punch.",
    page: { bg: "#001534", bgMid: "#00214d", paper: "#fffffe", ink: "#00214d" },
    colors: fromHues({
      ink: "#00214d",
      paper: "#fffffe",
      highlight: "#00ebc7",
      secondary: "#ff5470",
      tertiary: "#fde24f",
      mute: "#f2f4f6",
      wash: "#fffffe",
    }),
  },
  {
    id: "melon",
    name: "Sky Tatami",
    source: "Happy Hues · palette 3",
    quote: "Sky and coral.",
    page: { bg: "#094067", bgMid: "#0c527f", paper: "#fffffe", ink: "#094067" },
    colors: fromHues({
      ink: "#094067",
      paper: "#fffffe",
      highlight: "#3da9fc",
      secondary: "#90b4ce",
      tertiary: "#ef4565",
      mute: "#d8eefe",
      wash: "#fffffe",
    }),
  },
  {
    id: "grape",
    name: "Violet Plant",
    source: "Happy Hues · palette 4",
    quote: "Dark mode room.",
    page: { bg: "#16161a", bgMid: "#242629", paper: "#fffffe", ink: "#010101" },
    colors: fromHues({
      ink: "#16161a",
      paper: "#fffffe",
      highlight: "#7f5af0",
      secondary: "#2cb67d",
      tertiary: "#72757e",
      mute: "#242629",
      wash: "#fffffe",
    }),
  },
  {
    id: "corona",
    name: "Gold Plant",
    source: "Happy Hues · palette 5",
    quote: "Teal wood, gold leaf.",
    page: { bg: "#00332c", bgMid: "#00473e", paper: "#f2f7f5", ink: "#00473e" },
    colors: fromHues({
      ink: "#00473e",
      paper: "#fffffe",
      highlight: "#faae2b",
      secondary: "#ffa8ba",
      tertiary: "#fa5246",
      mute: "#f2f7f5",
      wash: "#f2f7f5",
    }),
  },
  {
    id: "meteor",
    name: "Indigo Plant",
    source: "Happy Hues · palette 6",
    quote: "Violet stroke.",
    page: { bg: "#2b2c34", bgMid: "#3a3b46", paper: "#fffffe", ink: "#2b2c34" },
    colors: fromHues({
      ink: "#2b2c34",
      paper: "#fffffe",
      highlight: "#6246ea",
      secondary: "#d1d1e9",
      tertiary: "#e45858",
      mute: "#d1d1e9",
      wash: "#fffffe",
    }),
  },
  {
    id: "whirlpool",
    name: "Amber Plant",
    source: "Happy Hues · palette 10",
    quote: "Deep teal, warm gold.",
    page: { bg: "#001e1d", bgMid: "#004643", paper: "#e8e4e6", ink: "#001e1d" },
    colors: fromHues({
      ink: "#001e1d",
      paper: "#fffffe",
      highlight: "#f9bc60",
      secondary: "#abd1c6",
      tertiary: "#e16162",
      mute: "#abd1c6",
      wash: "#e8e4e6",
    }),
  },
  {
    id: "sugar",
    name: "Orange Plant",
    source: "Happy Hues · palette 13",
    quote: "Night market.",
    page: { bg: "#0f0e17", bgMid: "#1c1b28", paper: "#fffffe", ink: "#0f0e17" },
    colors: fromHues({
      ink: "#0f0e17",
      paper: "#fffffe",
      highlight: "#ff8906",
      secondary: "#f25f4c",
      tertiary: "#e53170",
      mute: "#a7a9be",
      wash: "#fffffe",
    }),
  },
  {
    id: "custom",
    name: "Custom",
    source: "Your mix",
    custom: true,
    page: { bg: "#1a1610", bgMid: "#2c261c", paper: "#fff8ef", ink: "#1a120e" },
    colors: { ...original },
  },
];

export function toCss(palette) {
  const lines = slotOrder.map((key) => `  --${key}: ${palette.colors[key]};`);
  return `:root {\n${lines.join("\n")}\n}`;
}

export function toJson(palette) {
  return JSON.stringify(
    {
      name: palette.name,
      source: palette.source,
      colors: palette.colors,
    },
    null,
    2
  );
}

export function toHexBlock(palette) {
  return slotOrder.map((key) => palette.colors[key]).join("\n");
}

export { mix, shade, tint };
