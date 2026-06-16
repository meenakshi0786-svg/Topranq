// Detection: given an engine's answer, decide whether the brand was mentioned
// and/or cited, and capture which *other* source domains the engine cited.

import type { EngineAnswer } from "./engines";

export interface BrandIdentity {
  host: string; // bare registrable host, e.g. "ranqapex.com"
  brandNames: string[]; // display variants to match in prose, e.g. ["ranqapex", "ranq apex"]
}

export interface Detection {
  mentioned: boolean;
  cited: boolean;
  citationUrl: string | null;
  competitors: string[]; // other cited source domains (excluding the brand's own)
}

/**
 * Derive a brand identity from a domain URL.
 * "https://www.ranqapex.com/" → { host: "ranqapex.com", brandNames: ["ranqapex"] }
 */
export function deriveBrand(domainUrl: string): BrandIdentity {
  let host = domainUrl.trim().toLowerCase();
  host = host.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];

  // The label before the public suffix is the brand seed (e.g. "ranqapex").
  const label = host.split(".")[0] || host;
  const brandNames = new Set<string>();
  brandNames.add(label);
  // split camel/number boundaries lightly so "ranqapex" can also match "ranq apex"
  const spaced = label.replace(/([a-z])([0-9])/g, "$1 $2").replace(/[-_]/g, " ").trim();
  if (spaced !== label) brandNames.add(spaced);

  return { host, brandNames: [...brandNames] };
}

function hostFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function detect(answer: EngineAnswer, brand: BrandIdentity): Detection {
  const text = (answer.text || "").toLowerCase();

  // Mentioned: any brand name appears as a whole word, OR the host appears in prose.
  let mentioned = text.includes(brand.host);
  if (!mentioned) {
    for (const name of brand.brandNames) {
      if (!name) continue;
      const re = new RegExp(`\\b${escapeRegex(name.toLowerCase())}\\b`);
      if (re.test(text)) {
        mentioned = true;
        break;
      }
    }
  }

  // Cited: brand host appears in any cited source URL.
  let citationUrl: string | null = null;
  const otherDomains = new Set<string>();
  for (const url of answer.citations) {
    const h = hostFromUrl(url);
    if (!h) continue;
    if (h === brand.host || h.endsWith(`.${brand.host}`)) {
      if (!citationUrl) citationUrl = url;
    } else {
      otherDomains.add(h);
    }
  }
  const cited = citationUrl !== null;
  if (cited) mentioned = true; // a citation is a strong form of being surfaced

  return {
    mentioned,
    cited,
    citationUrl,
    competitors: [...otherDomains].slice(0, 10),
  };
}
