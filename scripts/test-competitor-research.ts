import { analyzeCompetitors } from "../src/lib/competitor-research";

const keyword = process.argv[2] || "best running shoes 2026";

(async () => {
  console.log(`\n▶ analyzeCompetitors("${keyword}")\n`);
  const t0 = Date.now();
  const result = await analyzeCompetitors(keyword);
  const ms = Date.now() - t0;

  console.log(`✔ done in ${ms}ms\n`);
  console.log(`topResults:       ${result.topResults.length}`);
  console.log(`peopleAlsoAsk:    ${result.peopleAlsoAsk.length}`);
  console.log(`relatedSearches:  ${result.relatedSearches.length}`);
  console.log(`avgWordCount:     ${result.avgWordCount}`);
  console.log(`commonHeadings:   ${result.commonHeadings.length}`);
  console.log(`contentBrief len: ${result.contentBrief.length} chars\n`);

  const scraped = result.topResults.filter((p) => p.wordCount > 0);
  console.log(`Scraped ${scraped.length} pages with structure:`);
  for (const p of scraped) {
    console.log(
      `  #${p.position} ${p.title.slice(0, 60)} — ${p.wordCount} words, ${p.headings.length} headings, faq=${p.hasFaq}, table=${p.hasTable}`,
    );
  }

  console.log(`\n--- BRIEF (first 800 chars) ---`);
  console.log(result.contentBrief.slice(0, 800));
})().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
