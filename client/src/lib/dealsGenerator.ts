/**
 * Auto-generates promotional content for deals
 * Creates cyberpunk-themed, dynamic product descriptions and deal messaging
 */

export interface DealContent {
  headline: string;
  tagline: string;
  calloutText: string;
  discount: string;
  urgency: string;
  image?: string;
}

const headlines = [
  "MEGA FLASH SALE",
  "LIGHTNING DEALS",
  "SURGE PRICING COLLAPSE",
  "QUANTUM DISCOUNT WAVE",
  "VOID-ZONE CLEARANCE",
  "NEXUS PRICE DROP",
  "NEON MARKDOWN SPREE",
  "CYBER BLITZ EVENT",
  "PROTOCOL OVERRIDE SALE",
  "SECTOR CLEARDOWN",
  "APEX DEAL ACTIVATION",
  "VELOCITY PRICING",
  "RARE STOCK PURGE",
];

const taglines = [
  "Limited units available in the network",
  "Inventory dissolving rapidly",
  "Gateway access closing soon",
  "Time window collapsing",
  "Stock frequencies diminishing",
  "Warehouse reserves depleting",
  "Market capacity reaching critical",
  "Neural inventory fluxing",
  "Signals degrading fast",
  "Cache clearing imminent",
  "System load critical",
  "Access level: CRITICAL",
];

const callouts = [
  "Don't let this slip away",
  "Grab before shutdown",
  "Secure your gateway now",
  "Breach into savings",
  "Go live with this deal",
  "Execute the purchase",
  "Unlock instant savings",
  "Activate deal protocol",
  "Initiate transaction",
  "Lock in this price",
  "Archive this offer",
  "Calibrate your cart",
];

const urgencies = [
  "Expires in 2 hours",
  "< 50 units left",
  "Flash ends in 1h 45m",
  "Stock vanishing",
  "Quantities dropping",
  "Hot inventory ahead",
  "Deal concludes soon",
  "Window closes fast",
  "Last moment clearance",
  "Supply critical",
  "Going... going...",
];

const descriptions = [
  "Premium selection making waves across the network. Verified quality, lightning-fast delivery to your zone.",
  "Next-gen inventory hitting the marketplace. Verified sellers pushing these units at unprecedented rates.",
  "Rare stock alignment occurring now. This doesn't happen often in the system.",
  "Market anomaly detected: Premium units available at breakthrough pricing.",
  "Hot sector movement: Verified inventory in high demand moving at accelerated velocity.",
  "Marketplace surge: Top-rated items experiencing peak availability windows.",
  "System notification: Quality inventory reaching critical pricing point.",
  "Neural marketplace alert: Verified bestsellers in active price collapse mode.",
];

function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  // Use a pseudo-random multiplier to spread out the bits
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h >>> 0) / 4294967296;
}

export function generateDealContent(
  productTitle?: string,
  discountPercent?: number
): DealContent {
  const seed = productTitle || "default_seed_xyz";
  
  const hRandom = seededRandom("h" + seed);
  const tRandom = seededRandom("t" + seed);
  const cRandom = seededRandom("c" + seed);
  const uRandom = seededRandom("u" + seed);
  const dRandom = seededRandom("d" + seed);

  const finalDiscount = discountPercent !== undefined 
    ? discountPercent 
    : Math.floor(dRandom * 60 + 10);

  const headline = headlines[Math.floor(hRandom * headlines.length)];
  const tagline = taglines[Math.floor(tRandom * taglines.length)];
  const callout = callouts[Math.floor(cRandom * callouts.length)];
  const urgency = urgencies[Math.floor(uRandom * urgencies.length)];

  return {
    headline,
    tagline,
    calloutText: callout,
    discount: `${finalDiscount}% OFF`,
    urgency,
    image: undefined, // Will be populated from product image
  };
}

export function generateProductPromo(
  productTitle: string,
  originalPrice: number,
  discountPercent?: number
): string {
  const dRandom = seededRandom("p" + productTitle);
  const finalDiscount = discountPercent !== undefined 
    ? discountPercent 
    : Math.floor(dRandom * 50 + 15);

  const descriptions_list = descriptions;
  const descRandom = seededRandom("pd" + productTitle);
  const desc = descriptions_list[Math.floor(descRandom * descriptions_list.length)];
  const savingAmount = Math.round(originalPrice * (finalDiscount / 100));
  const finalPrice = originalPrice - savingAmount;

  return `${desc} Save BDT ${savingAmount.toLocaleString("en-BD")} on ${productTitle}. Now just BDT ${finalPrice.toLocaleString("en-BD")}.`;
}

export function generateTimeRemaining(seed?: string): string {
  const s = seed || "default_time";
  const hRandom = seededRandom("th" + s);
  const mRandom = seededRandom("tm" + s);
  const hours = Math.floor(hRandom * 24) + 1;
  const minutes = Math.floor(mRandom * 60);
  return `${hours}h ${minutes}m`;
}

export function generateStockAlert(seed?: string): string {
  const alerts = [
    "Only a few left!",
    "Stock running low",
    "High demand mode",
    "Moving fast",
    "Quantities critical",
    "Limited availability",
    "Peak demand window",
    "Last units available",
  ];
  const s = seed || "default_stock";
  const aRandom = seededRandom("sa" + s);
  return alerts[Math.floor(aRandom * alerts.length)];
}

export function getDealGradient(index: number): {
  from: string;
  to: string;
} {
  const gradients = [
    { from: "from-cyan-500/30", to: "to-blue-500/20" },
    { from: "from-pink-500/30", to: "to-rose-500/20" },
    { from: "from-purple-500/30", to: "to-violet-500/20" },
    { from: "from-emerald-500/30", to: "to-cyan-500/20" },
    { from: "from-amber-500/30", to: "to-orange-500/20" },
  ];
  return gradients[index % gradients.length];
}

export function getIconColor(index: number): string {
  const colors = [
    "text-cyan-400",
    "text-pink-400",
    "text-purple-400",
    "text-emerald-400",
    "text-amber-400",
  ];
  return colors[index % colors.length];
}
