import * as React from "react";

export interface AvatarConfig {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  eyeShape: string;
  eyeColor: string;
  eyebrowStyle: string;
  noseStyle: string;
  mouthStyle: string;
  facialHair: string;
  glasses: string;
  backgroundColor: string;
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  skinTone: "medium",
  hairStyle: "short-crop",
  hairColor: "dark-brown",
  eyeShape: "almond",
  eyeColor: "brown",
  eyebrowStyle: "natural",
  noseStyle: "button",
  mouthStyle: "natural",
  facialHair: "none",
  glasses: "none",
  backgroundColor: "blue",
};

// ─── SKIN TONES (10 natural + 4 fantasy) ──────────────────────────────────────
export const SKIN_TONES = [
  { id: "porcelain",    name: "Porcelain",    base: "#FCE8E0", shadow: "#D9A888", hi: "#FEF5F2" },
  { id: "fair",         name: "Fair",         base: "#F5D2BE", shadow: "#D09070", hi: "#FAE8D8" },
  { id: "light",        name: "Light",        base: "#EABB98", shadow: "#C07848", hi: "#F4D0B0" },
  { id: "light-medium", name: "Light Medium", base: "#DE9E78", shadow: "#A85830", hi: "#ECBA94" },
  { id: "medium",       name: "Medium",       base: "#C87858", shadow: "#904028", hi: "#D89070" },
  { id: "olive",        name: "Olive",        base: "#B8704C", shadow: "#7E3C18", hi: "#CA8864" },
  { id: "tan",          name: "Tan",          base: "#A86040", shadow: "#703010", hi: "#BA7858" },
  { id: "brown",        name: "Brown",        base: "#885030", shadow: "#501C08", hi: "#9A6848" },
  { id: "dark-brown",   name: "Dark Brown",   base: "#663C20", shadow: "#381408", hi: "#7A5030" },
  { id: "deep",         name: "Deep",         base: "#3A2010", shadow: "#180600", hi: "#4E3020" },
  { id: "lavender",     name: "Lavender",     base: "#C8A4E0", shadow: "#9070B8", hi: "#E0C8F8" },
  { id: "sky",          name: "Sky Blue",     base: "#90BCE0", shadow: "#5888B8", hi: "#B8D8F8" },
  { id: "mint",         name: "Mint",         base: "#90D4B4", shadow: "#58A080", hi: "#B8EED8" },
  { id: "golden",       name: "Golden",       base: "#E8C060", shadow: "#A07E18", hi: "#F8DC88" },
];

// ─── HAIR COLORS (10 natural + 10 eccentric) ─────────────────────────────────
export const HAIR_COLORS = [
  { id: "black",        name: "Black",        color: "#1C1C1C" },
  { id: "dark-brown",   name: "Dark Brown",   color: "#3D2010" },
  { id: "medium-brown", name: "Medium Brown", color: "#6B4226" },
  { id: "auburn",       name: "Auburn",       color: "#8B3A2A" },
  { id: "light-brown",  name: "Light Brown",  color: "#A0714F" },
  { id: "blonde",       name: "Blonde",       color: "#C8A860" },
  { id: "platinum",     name: "Platinum",     color: "#DDD5B0" },
  { id: "red",          name: "Red",          color: "#B03030" },
  { id: "gray",         name: "Gray",         color: "#909090" },
  { id: "white",        name: "White",        color: "#E0E0E0" },
  { id: "pink",         name: "Bubblegum",    color: "#E060A0" },
  { id: "purple",       name: "Purple",       color: "#8040C0" },
  { id: "blue",         name: "Electric Blue",color: "#3060E0" },
  { id: "teal",         name: "Teal",         color: "#1A9090" },
  { id: "forest",       name: "Forest Green", color: "#2A8040" },
  { id: "orange",       name: "Orange",       color: "#E06020" },
  { id: "magenta",      name: "Magenta",      color: "#C020A0" },
  { id: "silver",       name: "Silver Blue",  color: "#80A8C8" },
  { id: "rose-gold",    name: "Rose Gold",    color: "#C89080" },
  { id: "lime",         name: "Lime",         color: "#70C020" },
];

// ─── EYE COLORS (6 natural + 7 fantasy) ─────────────────────────────────────
export const EYE_COLORS = [
  { id: "dark-brown", name: "Dark Brown", color: "#3D2010" },
  { id: "brown",      name: "Brown",      color: "#6B4226" },
  { id: "hazel",      name: "Hazel",      color: "#8B6E28" },
  { id: "green",      name: "Green",      color: "#4A7A40" },
  { id: "blue",       name: "Blue",       color: "#3060A0" },
  { id: "gray",       name: "Gray",       color: "#708090" },
  { id: "purple",     name: "Violet",     color: "#6040A0" },
  { id: "crimson",    name: "Crimson",    color: "#A02040" },
  { id: "amber",      name: "Amber",      color: "#C07818" },
  { id: "silver",     name: "Silver",     color: "#A0B8C0" },
  { id: "gold",       name: "Gold",       color: "#C8A030" },
  { id: "teal",       name: "Teal",       color: "#208080" },
  { id: "ice",        name: "Ice Blue",   color: "#A0C8E0" },
];

// ─── BACKGROUNDS ──────────────────────────────────────────────────────────────
export const BACKGROUNDS = [
  { id: "blue",       name: "Ocean Blue",   from: "#4A90D9", to: "#1E4080" },
  { id: "purple",     name: "Grape",        from: "#9B59B6", to: "#4A235A" },
  { id: "teal",       name: "Teal",         from: "#2ECC71", to: "#1A6644" },
  { id: "orange",     name: "Sunset",       from: "#F39C12", to: "#A04010" },
  { id: "pink",       name: "Rose",         from: "#E91E8C", to: "#7A0A4A" },
  { id: "green",      name: "Forest",       from: "#27AE60", to: "#104820" },
  { id: "red",        name: "Ruby",         from: "#E74C3C", to: "#6A1020" },
  { id: "midnight",   name: "Midnight",     from: "#2C3E50", to: "#0A1020" },
  { id: "charcoal",   name: "Charcoal",     from: "#666",    to: "#222"    },
  { id: "cream",      name: "Cream",        from: "#FFF8F0", to: "#E8D8C0" },
  { id: "gold",       name: "Gold",         from: "#F1C40F", to: "#8A7000" },
  { id: "coral",      name: "Coral",        from: "#FF6B6B", to: "#C0204A" },
];

// ─── HAIR STYLES ─────────────────────────────────────────────────────────────
// back  = rendered before neck/head (ponytails, long back sections)
// front = rendered before HEAD (head clips the interior automatically)
// above = rendered AFTER head (buns on top, spikes sticking up)
type N = React.ReactNode;
type HairDef = { name: string; back?: (c: string) => N; front: (c: string) => N; above?: (c: string) => N };

const sidePanel = (c: string, yEnd: number) => (
  <>
    <path d={`M 24 98 Q 18 120 20 ${yEnd} L 32 ${yEnd} Q 30 120 38 98 Z`} fill={c} />
    <path d={`M 176 98 Q 182 120 180 ${yEnd} L 168 ${yEnd} Q 170 120 162 98 Z`} fill={c} />
  </>
);

const shortCap = (c: string, rx = 72, ry = 80, cy = 98) =>
  <ellipse cx="100" cy={cy} rx={rx} ry={ry} fill={c} />;

export const HAIR_STYLES: Record<string, HairDef> = {
  bald:       { name: "Bald",             front: () => null },
  buzz:       { name: "Buzz Cut",         front: (c) => <ellipse cx="100" cy="105" rx="67" ry="74" fill={c} /> },
  "short-crop":{ name: "Short Crop",      front: (c) => shortCap(c) },
  "side-part": { name: "Side Part",       front: (c) => (
    <>
      {shortCap(c)}
      <path d="M 68 38 Q 74 55 72 72" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="2.5" strokeLinecap="round" />
    </>
  )},
  "textured-spikes": { name: "Textured Spikes", front: (c) => shortCap(c, 73, 80, 97),
    above: (c) => (
      <path d="M 66 76 L 70 50 L 78 70 L 84 44 L 92 66 L 100 38 L 108 66 L 116 44 L 122 70 L 130 50 L 134 76 Q 118 64 100 62 Q 82 64 66 76 Z" fill={c} />
    )
  },
  undercut:   { name: "Undercut",         front: (c) => (
    <>
      <ellipse cx="100" cy="94" rx="74" ry="76" fill={c} />
      <ellipse cx="100" cy="58" rx="52" ry="26" fill={c} />
    </>
  )},
  fade:       { name: "Fade",             front: (c) => (
    <>
      <ellipse cx="100" cy="96" rx="71" ry="78" fill={c} />
      <ellipse cx="100" cy="108" rx="67" ry="12" fill={c} opacity="0.45" />
    </>
  )},
  "short-afro": { name: "Short Afro",    front: (c) => (
    <path d="M 14 114 Q 8 60 32 36 Q 50 14 70 8 Q 85 2 100 0 Q 115 2 130 8 Q 150 14 168 36 Q 192 60 186 114 Q 180 76 158 52 Q 140 34 120 28 Q 110 24 100 24 Q 90 24 80 28 Q 60 34 42 52 Q 20 76 14 114 Z" fill={c} />
  )},
  "curly-medium": { name: "Curly Medium", back: (c) => sidePanel(c, 185),
    front: (c) => (
      <>
        <path d="M 14 114 Q 8 56 32 32 Q 52 12 72 6 Q 86 0 100 0 Q 114 0 128 6 Q 148 12 168 32 Q 192 56 186 114 Q 180 68 158 44 Q 138 24 116 18 Q 108 14 100 14 Q 92 14 84 18 Q 62 24 42 44 Q 20 68 14 114 Z" fill={c} />
        {[0,1,2,3,4,5,6,7].map(i => <ellipse key={i} cx={36+i*18} cy={i%2===0?6:13} rx="10" ry="8" fill={c} />)}
      </>
    )
  },
  "wavy-medium": { name: "Wavy Medium", back: (c) => sidePanel(c, 195),
    front: (c) => shortCap(c, 72, 80, 98) },
  bob:         { name: "Bob",            back: (c) => (
    <>
      <path d="M 22 98 Q 14 130 16 162 L 30 162 Q 28 130 36 98 Z" fill={c} />
      <path d="M 178 98 Q 186 130 184 162 L 170 162 Q 172 130 164 98 Z" fill={c} />
      <path d="M 22 160 Q 60 178 100 180 Q 140 178 178 160 L 172 164 Q 130 184 100 186 Q 70 184 28 164 Z" fill={c} />
    </>
  ), front: (c) => shortCap(c) },
  bangs:       { name: "Bangs",          back: (c) => sidePanel(c, 210),
    front: (c) => (
      <>
        {shortCap(c)}
        <path d="M 36 74 Q 36 96 52 100 Q 70 104 100 104 Q 130 104 148 100 Q 164 96 164 74 Q 150 86 126 90 Q 112 92 100 92 Q 88 92 74 90 Q 50 86 36 74 Z" fill={c} />
      </>
    )
  },
  "shoulder-straight": { name: "Shoulder Length", back: (c) => sidePanel(c, 222),
    front: (c) => shortCap(c) },
  "long-straight":{ name: "Long Straight", back: (c) => (
    <>
      <path d="M 20 94 L 8 230 L 24 230 L 36 94 Z" fill={c} />
      <path d="M 180 94 L 192 230 L 176 230 L 164 94 Z" fill={c} />
    </>
  ), front: (c) => shortCap(c) },
  "long-wavy":  { name: "Long Wavy",     back: (c) => (
    <>
      <path d="M 20 94 Q 10 130 14 172 Q 10 195 16 230 L 28 230 Q 22 195 26 172 Q 22 130 36 94 Z" fill={c} />
      <path d="M 180 94 Q 190 130 186 172 Q 190 195 184 230 L 172 230 Q 178 195 174 172 Q 178 130 164 94 Z" fill={c} />
    </>
  ), front: (c) => shortCap(c) },
  "long-curly": { name: "Long Curly",    back: (c) => (
    <>
      <path d="M 16 94 Q 4 130 8 178 Q 4 200 10 230 L 24 230 Q 18 200 22 178 Q 18 130 34 94 Z" fill={c} />
      <path d="M 184 94 Q 196 130 192 178 Q 196 200 190 230 L 176 230 Q 182 200 178 178 Q 182 130 166 94 Z" fill={c} />
    </>
  ), front: (c) => (
    <>
      <path d="M 14 116 Q 8 54 32 30 Q 52 10 72 4 Q 86 -2 100 -2 Q 114 -2 128 4 Q 148 10 168 30 Q 192 54 186 116 Q 180 68 158 44 Q 138 22 116 16 Q 108 12 100 12 Q 92 12 84 16 Q 62 22 42 44 Q 20 68 14 116 Z" fill={c} />
      {[0,1,2,3,4,5,6,7,8].map(i => <ellipse key={i} cx={34+i*16} cy={i%2===0?4:12} rx="9" ry="7" fill={c} />)}
    </>
  )},
  "high-ponytail": { name: "High Ponytail",
    back: (c) => (
      <path d="M 88 36 Q 82 12 86 -6 Q 100 -16 114 -6 Q 118 12 112 36 Q 106 24 100 24 Q 94 24 88 36 Z" fill={c} />
    ),
    front: (c) => shortCap(c, 70, 76, 100),
    above: (c) => <ellipse cx="100" cy="34" rx="15" ry="8" fill={c} />
  },
  "low-ponytail": { name: "Low Ponytail",
    back: (c) => (
      <path d="M 84 148 Q 78 172 82 200 Q 90 216 100 218 Q 110 216 118 200 Q 122 172 116 148 Q 108 160 100 160 Q 92 160 84 148 Z" fill={c} />
    ),
    front: (c) => (
      <>
        {shortCap(c)}
        <ellipse cx="100" cy="162" rx="13" ry="7" fill={c} />
      </>
    )
  },
  "high-bun":  { name: "High Bun",
    front: (c) => shortCap(c, 68, 74, 102),
    above: (c) => (
      <>
        <circle cx="100" cy="16" r="20" fill={c} />
        <path d="M 82 30 Q 88 38 100 38 Q 112 38 118 30 Q 100 44 82 30 Z" fill={c} />
      </>
    )
  },
  "low-bun":   { name: "Low Bun",
    back: (c) => <circle cx="100" cy="170" r="16" fill={c} />,
    front: (c) => (
      <>
        {shortCap(c)}
        <path d="M 86 170 Q 90 178 100 178 Q 110 178 114 170 Z" fill={c} />
      </>
    )
  },
  braids:      { name: "Braids",
    back: (c) => (
      <>
        <path d="M 34 108 L 28 230 Q 36 235 44 230 L 44 108 Z" fill={c} />
        <path d="M 166 108 L 172 230 Q 164 235 156 230 L 156 108 Z" fill={c} />
        {[0,1,2,3,4,5,6].map(i => <ellipse key={`l${i}`} cx="36" cy={115+i*17} rx="8" ry="7" fill={c} opacity={1-i*0.05} />)}
        {[0,1,2,3,4,5,6].map(i => <ellipse key={`r${i}`} cx="164" cy={115+i*17} rx="8" ry="7" fill={c} opacity={1-i*0.05} />)}
      </>
    ),
    front: (c) => shortCap(c)
  },
  "space-buns":{ name: "Space Buns",
    front: (c) => shortCap(c, 70, 74, 100),
    above: (c) => (
      <>
        <circle cx="60" cy="28" r="20" fill={c} />
        <circle cx="140" cy="28" r="20" fill={c} />
        <path d="M 42 42 Q 50 50 60 50 Q 70 50 78 42 Q 60 56 42 42 Z" fill={c} />
        <path d="M 122 42 Q 130 50 140 50 Q 150 50 158 42 Q 140 56 122 42 Z" fill={c} />
      </>
    )
  },
  mohawk:      { name: "Mohawk",
    front: () => null,
    above: (c) => (
      <path d="M 84 116 L 82 62 Q 86 24 90 10 Q 95 2 100 0 Q 105 2 110 10 Q 114 24 118 62 L 116 116 L 109 110 Q 105 30 100 18 Q 95 30 91 110 Z" fill={c} />
    )
  },
  "faux-hawk": { name: "Faux Hawk",
    front: (c) => <ellipse cx="100" cy="104" rx="68" ry="72" fill={c} />,
    above: (c) => (
      <path d="M 80 60 L 78 30 Q 84 10 90 2 Q 95 -2 100 -2 Q 105 -2 110 2 Q 116 10 122 30 L 120 60 L 112 52 L 110 26 Q 105 12 100 10 Q 95 12 90 26 L 88 52 Z" fill={c} />
    )
  },
  "pixie":     { name: "Pixie Cut",
    front: (c) => (
      <>
        <ellipse cx="100" cy="100" rx="70" ry="74" fill={c} />
        <path d="M 36 86 Q 28 78 26 68 Q 32 74 38 80 Z" fill={c} />
        <path d="M 164 86 Q 172 78 174 68 Q 168 74 162 80 Z" fill={c} />
      </>
    )
  },
  locs:        { name: "Locs / Dreads",
    back: (c) => (
      <>
        {[-28,-14,0,14,28].map((ox, i) => (
          <path key={i} d={`M ${100+ox-5} 108 Q ${100+ox-3} 160 ${100+ox-2} ${195+i%2*18} Q ${100+ox} ${208+i%2*18} ${100+ox+2} ${195+i%2*18} Q ${100+ox+3} 160 ${100+ox+5} 108 Z`} fill={c} opacity={0.9-i*0.02} />
        ))}
      </>
    ),
    front: (c) => shortCap(c)
  },
  "taper":     { name: "Taper",
    front: (c) => (
      <>
        <ellipse cx="100" cy="96" rx="73" ry="78" fill={c} />
        <ellipse cx="100" cy="110" rx="67" ry="12" fill={c} opacity="0.3" />
      </>
    )
  },
  "cornrows":  { name: "Cornrows",
    back: (c) => (
      <>
        <path d="M 26 100 L 20 230 L 36 230 L 40 100 Z" fill={c} />
        <path d="M 174 100 L 180 230 L 164 230 L 160 100 Z" fill={c} />
      </>
    ),
    front: (c) => (
      <>
        {shortCap(c)}
        {[-18,-9,0,9,18].map((ox, i) => (
          <path key={i} d={`M ${100+ox-3} 36 L ${100+ox-3} 108 Q ${100+ox} 112 ${100+ox+3} 108 L ${100+ox+3} 36 Z`} fill={c} opacity={0.9} />
        ))}
      </>
    )
  },
};

// ─── EYE SHAPES ──────────────────────────────────────────────────────────────
type EyeProps = { cx: number; cy: number; ic: string };
type EyeRenderer = (p: EyeProps) => N;

export const EYE_SHAPES: Record<string, { name: string; render: EyeRenderer }> = {
  almond: { name: "Almond", render: ({ cx, cy, ic }) => (
    <g key={cx}>
      <path d={`M ${cx-14} ${cy} Q ${cx-8} ${cy-9} ${cx} ${cy-9} Q ${cx+8} ${cy-9} ${cx+14} ${cy} Q ${cx+8} ${cy+7} ${cx} ${cy+7} Q ${cx-8} ${cy+7} ${cx-14} ${cy} Z`} fill="white" />
      <circle cx={cx} cy={cy} r="6.5" fill={ic} />
      <circle cx={cx} cy={cy} r="3.5" fill="#1a1a1a" />
      <circle cx={cx-2} cy={cy-2} r="1.5" fill="white" />
      <path d={`M ${cx-14} ${cy} Q ${cx-8} ${cy-9} ${cx} ${cy-9} Q ${cx+8} ${cy-9} ${cx+14} ${cy}`} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
    </g>
  )},
  round: { name: "Round", render: ({ cx, cy, ic }) => (
    <g key={cx}>
      <ellipse cx={cx} cy={cy} rx="12" ry="10.5" fill="white" />
      <circle cx={cx} cy={cy} r="6.5" fill={ic} />
      <circle cx={cx} cy={cy} r="3.5" fill="#1a1a1a" />
      <circle cx={cx-2} cy={cy-2} r="1.5" fill="white" />
      <path d={`M ${cx-12} ${cy} Q ${cx} ${cy-12} ${cx+12} ${cy}`} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
    </g>
  )},
  upturned: { name: "Upturned", render: ({ cx, cy, ic }) => (
    <g key={cx}>
      <path d={`M ${cx-14} ${cy+2} Q ${cx-8} ${cy-8} ${cx} ${cy-9} Q ${cx+8} ${cy-10} ${cx+14} ${cy-2} Q ${cx+8} ${cy+7} ${cx} ${cy+7} Q ${cx-8} ${cy+7} ${cx-14} ${cy+2} Z`} fill="white" />
      <circle cx={cx} cy={cy} r="6.5" fill={ic} />
      <circle cx={cx} cy={cy} r="3.5" fill="#1a1a1a" />
      <circle cx={cx-2} cy={cy-2} r="1.5" fill="white" />
      <path d={`M ${cx-14} ${cy+2} Q ${cx-8} ${cy-8} ${cx} ${cy-9} Q ${cx+8} ${cy-10} ${cx+14} ${cy-2}`} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
    </g>
  )},
  downturned: { name: "Downturned", render: ({ cx, cy, ic }) => (
    <g key={cx}>
      <path d={`M ${cx-14} ${cy-2} Q ${cx-8} ${cy-9} ${cx} ${cy-9} Q ${cx+8} ${cy-9} ${cx+14} ${cy+2} Q ${cx+8} ${cy+8} ${cx} ${cy+8} Q ${cx-8} ${cy+8} ${cx-14} ${cy-2} Z`} fill="white" />
      <circle cx={cx} cy={cy} r="6.5" fill={ic} />
      <circle cx={cx} cy={cy} r="3.5" fill="#1a1a1a" />
      <circle cx={cx-2} cy={cy-2} r="1.5" fill="white" />
      <path d={`M ${cx-14} ${cy-2} Q ${cx-8} ${cy-9} ${cx} ${cy-9} Q ${cx+8} ${cy-9} ${cx+14} ${cy+2}`} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
    </g>
  )},
  wide: { name: "Wide", render: ({ cx, cy, ic }) => (
    <g key={cx}>
      <ellipse cx={cx} cy={cy} rx="15" ry="11" fill="white" />
      <circle cx={cx} cy={cy} r="7" fill={ic} />
      <circle cx={cx} cy={cy} r="4" fill="#1a1a1a" />
      <circle cx={cx-2} cy={cy-2} r="1.8" fill="white" />
      <path d={`M ${cx-15} ${cy} Q ${cx} ${cy-13} ${cx+15} ${cy}`} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
    </g>
  )},
  hooded: { name: "Hooded", render: ({ cx, cy, ic }) => (
    <g key={cx}>
      <path d={`M ${cx-13} ${cy} Q ${cx-9} ${cy-7} ${cx} ${cy-7} Q ${cx+9} ${cy-7} ${cx+13} ${cy} Q ${cx+9} ${cy+8} ${cx} ${cy+8} Q ${cx-9} ${cy+8} ${cx-13} ${cy} Z`} fill="white" />
      <circle cx={cx} cy={cy} r="6.5" fill={ic} />
      <circle cx={cx} cy={cy} r="3.5" fill="#1a1a1a" />
      <circle cx={cx-2} cy={cy-2} r="1.5" fill="white" />
      <path d={`M ${cx-13} ${cy} Q ${cx} ${cy-4} ${cx+13} ${cy}`} fill="rgba(0,0,0,0.18)" />
    </g>
  )},
  monolid: { name: "Monolid", render: ({ cx, cy, ic }) => (
    <g key={cx}>
      <path d={`M ${cx-13} ${cy+2} Q ${cx-11} ${cy-5} ${cx} ${cy-6} Q ${cx+11} ${cy-5} ${cx+13} ${cy+2} Q ${cx+9} ${cy+8} ${cx} ${cy+8} Q ${cx-9} ${cy+8} ${cx-13} ${cy+2} Z`} fill="white" />
      <circle cx={cx} cy={cy+1} r="6" fill={ic} />
      <circle cx={cx} cy={cy+1} r="3.5" fill="#1a1a1a" />
      <circle cx={cx-2} cy={cy-1} r="1.5" fill="white" />
    </g>
  )},
};

// ─── EYEBROW STYLES ──────────────────────────────────────────────────────────
type BrowRenderer = (cx: number, cy: number, col: string) => N;
export const EYEBROW_STYLES: Record<string, { name: string; render: BrowRenderer }> = {
  natural:      { name: "Natural Arch",   render: (cx, cy, c) => <path d={`M ${cx-12} ${cy} Q ${cx-4} ${cy-7} ${cx+12} ${cy-3}`} fill="none" stroke={c} strokeWidth="3.5" strokeLinecap="round" /> },
  thick:        { name: "Thick Straight", render: (cx, cy, c) => <path d={`M ${cx-12} ${cy-2} Q ${cx} ${cy-4} ${cx+12} ${cy-2}`} fill="none" stroke={c} strokeWidth="5.5" strokeLinecap="round" /> },
  "thin-arched":{ name: "Thin Arched",   render: (cx, cy, c) => <path d={`M ${cx-11} ${cy+1} Q ${cx-3} ${cy-8} ${cx+11} ${cy-2}`} fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" /> },
  bushy:        { name: "Bushy",         render: (cx, cy, c) => (
    <>
      <path d={`M ${cx-13} ${cy} Q ${cx-2} ${cy-6} ${cx+13} ${cy-2}`} fill="none" stroke={c} strokeWidth="6.5" strokeLinecap="round" />
      <path d={`M ${cx-13} ${cy} Q ${cx-2} ${cy-9} ${cx+13} ${cy-4}`} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </>
  )},
  angled:       { name: "Angled",        render: (cx, cy, c) => <path d={`M ${cx-12} ${cy+2} L ${cx+12} ${cy-6}`} fill="none" stroke={c} strokeWidth="3.5" strokeLinecap="round" /> },
  rounded:      { name: "Rounded",       render: (cx, cy, c) => <path d={`M ${cx-11} ${cy+1} Q ${cx} ${cy-9} ${cx+11} ${cy+1}`} fill="none" stroke={c} strokeWidth="3.5" strokeLinecap="round" /> },
  "thin-straight":{ name: "Thin Straight",render: (cx, cy, c) => <path d={`M ${cx-12} ${cy-2} Q ${cx} ${cy-3} ${cx+12} ${cy-2}`} fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" /> },
};

// ─── NOSE STYLES ──────────────────────────────────────────────────────────────
type NoseRenderer = (shadow: string) => N;
export const NOSE_STYLES: Record<string, { name: string; render: NoseRenderer }> = {
  button:   { name: "Button",   render: (s) => (<><path d="M 96 110 Q 100 122 104 110" fill="none" stroke={s} strokeWidth="1.5" strokeLinecap="round" /><ellipse cx="94" cy="120" rx="5" ry="3.5" fill={s} opacity="0.3" /><ellipse cx="106" cy="120" rx="5" ry="3.5" fill={s} opacity="0.3" /></>) },
  round:    { name: "Round",    render: (s) => (<><path d="M 94 108 Q 100 124 106 108" fill="none" stroke={s} strokeWidth="1.5" strokeLinecap="round" /><ellipse cx="93" cy="121" rx="6.5" ry="4" fill={s} opacity="0.28" /><ellipse cx="107" cy="121" rx="6.5" ry="4" fill={s} opacity="0.28" /></>) },
  narrow:   { name: "Narrow",   render: (s) => (<><path d="M 97 110 Q 100 122 103 110" fill="none" stroke={s} strokeWidth="1.5" strokeLinecap="round" /><ellipse cx="95.5" cy="120" rx="4" ry="3" fill={s} opacity="0.28" /><ellipse cx="104.5" cy="120" rx="4" ry="3" fill={s} opacity="0.28" /></>) },
  wide:     { name: "Wide",     render: (s) => (<><path d="M 92 109 Q 100 125 108 109" fill="none" stroke={s} strokeWidth="2" strokeLinecap="round" /><ellipse cx="90" cy="122" rx="8" ry="5" fill={s} opacity="0.28" /><ellipse cx="110" cy="122" rx="8" ry="5" fill={s} opacity="0.28" /></>) },
  upturned: { name: "Upturned", render: (s) => (<><path d="M 95 112 Q 98 122 100 118 Q 102 122 105 112" fill="none" stroke={s} strokeWidth="1.5" strokeLinecap="round" /><ellipse cx="93" cy="118" rx="5" ry="3" fill={s} opacity="0.28" /><ellipse cx="107" cy="118" rx="5" ry="3" fill={s} opacity="0.28" /></>) },
};

// ─── MOUTH STYLES ────────────────────────────────────────────────────────────
type MouthRenderer = (shadow: string) => N;
export const MOUTH_STYLES: Record<string, { name: string; render: MouthRenderer }> = {
  natural:    { name: "Natural",   render: (s) => (<><path d="M 85 138 Q 93 134 100 136 Q 107 134 115 138" fill="none" stroke={s} strokeWidth="1.5" strokeLinecap="round" /><path d="M 85 138 Q 100 148 115 138" fill={s} opacity="0.18" /><path d="M 85 138 Q 100 148 115 138" fill="none" stroke={s} strokeWidth="1.8" strokeLinecap="round" /></>) },
  "full-lips":{ name: "Full Lips", render: (s) => (<><path d="M 82 136 Q 90 130 100 132 Q 110 130 118 136" fill="none" stroke={s} strokeWidth="1.5" strokeLinecap="round" /><path d="M 82 136 Q 100 152 118 136" fill={s} opacity="0.22" /><path d="M 82 136 Q 100 152 118 136" fill="none" stroke={s} strokeWidth="2" strokeLinecap="round" /><path d="M 94 132 Q 100 130 106 132" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" /></>) },
  thin:       { name: "Thin Lips", render: (s) => (<><path d="M 87 138 Q 94 135 100 136 Q 106 135 113 138" fill="none" stroke={s} strokeWidth="1.5" strokeLinecap="round" /><path d="M 87 138 Q 100 143 113 138" fill={s} opacity="0.15" /><path d="M 87 138 Q 100 143 113 138" fill="none" stroke={s} strokeWidth="1.5" strokeLinecap="round" /></>) },
  smile:      { name: "Smile",     render: (s) => (<><path d="M 83 135 Q 91 130 100 132 Q 109 130 117 135" fill="none" stroke={s} strokeWidth="1.5" strokeLinecap="round" /><path d="M 83 135 Q 100 152 117 135" fill={s} opacity="0.2" /><path d="M 83 135 Q 100 152 117 135" fill="none" stroke={s} strokeWidth="2" strokeLinecap="round" /><circle cx="83" cy="135" r="2" fill={s} opacity="0.28" /><circle cx="117" cy="135" r="2" fill={s} opacity="0.28" /></>) },
  pursed:     { name: "Pursed",    render: (s) => (<><ellipse cx="100" cy="139" rx="13" ry="5.5" fill={s} opacity="0.18" /><path d="M 88 137 Q 94 133 100 134 Q 106 133 112 137" fill="none" stroke={s} strokeWidth="1.5" strokeLinecap="round" /><path d="M 88 137 Q 100 144 112 137" fill="none" stroke={s} strokeWidth="1.8" strokeLinecap="round" /></>) },
};

// ─── FACIAL HAIR ─────────────────────────────────────────────────────────────
type FHRenderer = (shadow: string) => N;
export const FACIAL_HAIR_STYLES: Record<string, { name: string; render: FHRenderer }> = {
  none:        { name: "None",         render: () => null },
  stubble:     { name: "Stubble",      render: (s) => <ellipse cx="100" cy="148" rx="32" ry="22" fill={s} opacity="0.1" /> },
  mustache:    { name: "Mustache",     render: (s) => <path d="M 86 136 Q 93 141 100 139 Q 107 141 114 136 Q 108 133 100 135 Q 92 133 86 136 Z" fill={s} opacity="0.65" /> },
  goatee:      { name: "Goatee",       render: (s) => (<><path d="M 86 136 Q 93 141 100 139 Q 107 141 114 136 Q 108 133 100 135 Q 92 133 86 136 Z" fill={s} opacity="0.65" /><ellipse cx="100" cy="157" rx="11" ry="10" fill={s} opacity="0.45" /></>) },
  "short-beard":{ name: "Short Beard", render: (s) => <path d="M 68 128 Q 66 152 72 168 Q 82 180 100 182 Q 118 180 128 168 Q 134 152 132 128 Q 118 140 100 142 Q 82 140 68 128 Z" fill={s} opacity="0.38" /> },
  "full-beard": { name: "Full Beard",  render: (s) => (<><path d="M 62 118 Q 60 150 66 170 Q 78 186 100 188 Q 122 186 134 170 Q 140 150 138 118 Q 120 132 100 134 Q 80 132 62 118 Z" fill={s} opacity="0.42" /><ellipse cx="100" cy="120" rx="36" ry="10" fill={s} opacity="0.25" /></>) },
};

// ─── GLASSES ─────────────────────────────────────────────────────────────────
type GRenderer = () => N;
const frames = (
  left: string, right: string,
  bridge = <line x1="92" y1="98" x2="108" y2="98" stroke="#2a2a2a" strokeWidth="2" opacity="0.82" />,
  arms = (
    <>
      <line x1="60" y1="96" x2="34" y2="102" stroke="#2a2a2a" strokeWidth="2" opacity="0.82" />
      <line x1="140" y1="96" x2="166" y2="102" stroke="#2a2a2a" strokeWidth="2" opacity="0.82" />
    </>
  )
) => (
  <>
    <path d={left} fill="none" stroke="#2a2a2a" strokeWidth="2.5" opacity="0.82" />
    <path d={right} fill="none" stroke="#2a2a2a" strokeWidth="2.5" opacity="0.82" />
    {bridge}
    {arms}
  </>
);

export const GLASSES_STYLES: Record<string, { name: string; render: GRenderer }> = {
  none:       { name: "None",        render: () => null },
  round:      { name: "Round",       render: () => frames("M 60 98 A 16 16 0 1 1 92 98 A 16 16 0 1 1 60 98", "M 108 98 A 16 16 0 1 1 140 98 A 16 16 0 1 1 108 98") },
  rectangle:  { name: "Rectangle",  render: () => frames("M 58 90 h 34 v 18 h -34 Z", "M 108 90 h 34 v 18 h -34 Z") },
  "cat-eye":  { name: "Cat-Eye",    render: () => frames("M 58 100 Q 63 88 76 88 Q 90 88 92 98 L 92 104 Q 82 110 70 108 Q 58 106 58 100 Z", "M 108 98 Q 110 88 124 88 Q 138 88 142 100 Q 142 106 130 108 Q 116 110 108 104 Z") },
  oval:       { name: "Oval",        render: () => frames("M 60 98 A 16 11 0 1 1 92 98 A 16 11 0 1 1 60 98", "M 108 98 A 16 11 0 1 1 140 98 A 16 11 0 1 1 108 98") },
  sunglasses: { name: "Sunglasses",  render: () => (
    <>
      <ellipse cx="76" cy="98" rx="16" ry="11" fill="#1a1a1a" opacity="0.88" />
      <ellipse cx="124" cy="98" rx="16" ry="11" fill="#1a1a1a" opacity="0.88" />
      <ellipse cx="72" cy="95" rx="6" ry="4" fill="rgba(255,255,255,0.08)" />
      <ellipse cx="120" cy="95" rx="6" ry="4" fill="rgba(255,255,255,0.08)" />
      <line x1="92" y1="98" x2="108" y2="98" stroke="#1a1a1a" strokeWidth="2.5" opacity="0.88" />
      <line x1="60" y1="96" x2="34" y2="102" stroke="#1a1a1a" strokeWidth="2" opacity="0.88" />
      <line x1="140" y1="96" x2="166" y2="102" stroke="#1a1a1a" strokeWidth="2" opacity="0.88" />
    </>
  )},
};

// ─── EXPORT LISTS FOR BUILDER UI ──────────────────────────────────────────────
export const HAIR_STYLE_LIST  = Object.entries(HAIR_STYLES).map(([id, d]) => ({ id, name: d.name }));
export const EYE_SHAPE_LIST   = Object.entries(EYE_SHAPES).map(([id, d]) => ({ id, name: d.name }));
export const EYEBROW_STYLE_LIST = Object.entries(EYEBROW_STYLES).map(([id, d]) => ({ id, name: d.name }));
export const NOSE_STYLE_LIST  = Object.entries(NOSE_STYLES).map(([id, d]) => ({ id, name: d.name }));
export const MOUTH_STYLE_LIST = Object.entries(MOUTH_STYLES).map(([id, d]) => ({ id, name: d.name }));
export const FACIAL_HAIR_LIST = Object.entries(FACIAL_HAIR_STYLES).map(([id, d]) => ({ id, name: d.name }));
export const GLASSES_LIST     = Object.entries(GLASSES_STYLES).map(([id, d]) => ({ id, name: d.name }));

// ─── MAIN SVG RENDERER ───────────────────────────────────────────────────────
// Styles that need the "front" layer rendered AFTER the head
const ABOVE_HEAD_STYLES = new Set(["mohawk","faux-hawk","textured-spikes","high-bun","space-buns","high-ponytail"]);

export function AvatarSVG({ config, size = 200 }: { config: AvatarConfig; size?: number }) {
  const skin = SKIN_TONES.find(s => s.id === config.skinTone) ?? SKIN_TONES[4];
  const hair = HAIR_COLORS.find(h => h.id === config.hairColor) ?? HAIR_COLORS[1];
  const eye  = EYE_COLORS.find(e => e.id === config.eyeColor) ?? EYE_COLORS[1];
  const bg   = BACKGROUNDS.find(b => b.id === config.backgroundColor) ?? BACKGROUNDS[0];

  const hairDef  = HAIR_STYLES[config.hairStyle] ?? HAIR_STYLES["short-crop"];
  const eyeDef   = EYE_SHAPES[config.eyeShape] ?? EYE_SHAPES["almond"];
  const browDef  = EYEBROW_STYLES[config.eyebrowStyle] ?? EYEBROW_STYLES["natural"];
  const noseDef  = NOSE_STYLES[config.noseStyle] ?? NOSE_STYLES["button"];
  const mouthDef = MOUTH_STYLES[config.mouthStyle] ?? MOUTH_STYLES["natural"];
  const fhDef    = FACIAL_HAIR_STYLES[config.facialHair] ?? FACIAL_HAIR_STYLES["none"];
  const glassDef = GLASSES_STYLES[config.glasses] ?? GLASSES_STYLES["none"];

  const hc = hair.color;
  const browCol = skin.shadow;
  const uid = `a${size}`;
  const renderAbove = ABOVE_HEAD_STYLES.has(config.hairStyle);

  return (
    <svg viewBox="0 0 200 230" width={size} height={size} xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: "50%", overflow: "hidden" }}>
      <defs>
        <radialGradient id={`bg-${uid}`} cx="50%" cy="42%" r="68%">
          <stop offset="0%" stopColor={bg.from} />
          <stop offset="100%" stopColor={bg.to} />
        </radialGradient>
        <radialGradient id={`sk-${uid}`} cx="34%" cy="26%" r="78%" fx="34%" fy="26%">
          <stop offset="0%"   stopColor={skin.hi} />
          <stop offset="52%"  stopColor={skin.base} />
          <stop offset="100%" stopColor={skin.shadow} />
        </radialGradient>
        <radialGradient id={`er-${uid}`} cx="38%" cy="32%" r="72%">
          <stop offset="0%"   stopColor={skin.base} />
          <stop offset="100%" stopColor={skin.shadow} />
        </radialGradient>
        <linearGradient id={`hs-${uid}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.2)" />
          <stop offset="40%"  stopColor="rgba(255,255,255,0.04)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.08)" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="200" height="230" fill={`url(#bg-${uid})`} />

      {/* Hair — back layer (ponytails, long sides behind head) */}
      {hairDef.back?.(hc)}

      {/* Neck */}
      <rect x="84" y="172" width="32" height="56" rx="13" fill={`url(#sk-${uid})`} />
      <ellipse cx="100" cy="188" rx="18" ry="5" fill={skin.shadow} opacity="0.18" />

      {/* Ears */}
      <ellipse cx="35" cy="110" rx="11" ry="15" fill={`url(#er-${uid})`} />
      <ellipse cx="165" cy="110" rx="11" ry="15" fill={`url(#er-${uid})`} />
      <path d="M 37 104 Q 40 111 38 119" fill="none" stroke={skin.shadow} strokeWidth="1.4" opacity="0.45" strokeLinecap="round" />
      <path d="M 163 104 Q 160 111 162 119" fill="none" stroke={skin.shadow} strokeWidth="1.4" opacity="0.45" strokeLinecap="round" />

      {/* Hair — front layer (cap; head clips interior) */}
      {!renderAbove && hairDef.front(hc)}
      {!renderAbove && <ellipse cx="86" cy="48" rx="30" ry="16" fill={`url(#hs-${uid})`} opacity="0.7" />}

      {/* HEAD */}
      <ellipse cx="100" cy="108" rx="64" ry="70" fill={`url(#sk-${uid})`} />

      {/* Hair — above layer (spikes, buns, mohawk on top of head) */}
      {renderAbove && hairDef.front(hc)}
      {hairDef.above?.(hc)}
      {hairDef.above && <ellipse cx="86" cy="30" rx="28" ry="14" fill={`url(#hs-${uid})`} opacity="0.6" />}

      {/* Cheek blush */}
      <ellipse cx="63" cy="120" rx="13" ry="8" fill={skin.shadow} opacity="0.07" />
      <ellipse cx="137" cy="120" rx="13" ry="8" fill={skin.shadow} opacity="0.07" />

      {/* Facial hair (behind features) */}
      {fhDef.render(browCol)}

      {/* Eyes — left */}
      {eyeDef.render({ cx: 76, cy: 98, ic: eye.color })}
      {/* Eyes — right */}
      {eyeDef.render({ cx: 124, cy: 98, ic: eye.color })}

      {/* Eyebrows — left */}
      {browDef.render(76, 86, browCol)}
      {/* Eyebrows — right (mirrored around x=100) */}
      <g transform="scale(-1,1) translate(-200,0)">
        {browDef.render(76, 86, browCol)}
      </g>

      {/* Nose */}
      {noseDef.render(browCol)}

      {/* Mouth */}
      {mouthDef.render(browCol)}

      {/* Face highlight (subtle 3D gleam) */}
      <ellipse cx="78" cy="78" rx="18" ry="22" fill="white" opacity="0.035" transform="rotate(-18,78,78)" />

      {/* Glasses */}
      {glassDef.render()}
    </svg>
  );
}
