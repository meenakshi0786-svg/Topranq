import type { SEOIssue, Category, Severity } from "../analyzer/types";

export interface CategoryScore {
  category: Category;
  label: string;
  score: number;
  issueCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export interface AuditScores {
  overall: number;
  categories: CategoryScore[];
}

const CATEGORY_WEIGHTS: Record<Category, number> = {
  technical: 0.25,
  on_page: 0.25,
  content: 0.2,
  structure: 0.15,
  performance: 0.1,
  social: 0.05,
};

const CATEGORY_LABELS: Record<Category, string> = {
  technical: "Technical SEO",
  on_page: "On-Page SEO",
  content: "Content Quality",
  structure: "Site Structure",
  performance: "Performance",
  social: "Social & Rich Results",
};

const SEVERITY_DEDUCTIONS: Record<Severity, number> = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
};

export function calculateScores(issues: SEOIssue[]): AuditScores {
  const categories: Category[] = [
    "technical",
    "on_page",
    "content",
    "structure",
    "performance",
    "social",
  ];

  const categoryScores: CategoryScore[] = categories.map((category) => {
    const categoryIssues = issues.filter((i) => i.category === category);

    let deduction = 0;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    for (const issue of categoryIssues) {
      deduction += SEVERITY_DEDUCTIONS[issue.severity];
      switch (issue.severity) {
        case "critical":
          criticalCount++;
          break;
        case "high":
          highCount++;
          break;
        case "medium":
          mediumCount++;
          break;
        case "low":
          lowCount++;
          break;
      }
    }

    const score = Math.max(0, 100 - deduction);

    return {
      category,
      label: CATEGORY_LABELS[category],
      score,
      issueCount: categoryIssues.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
    };
  });

  // Overall = weighted average
  const overall = Math.round(
    categoryScores.reduce(
      (sum, cs) => sum + cs.score * CATEGORY_WEIGHTS[cs.category],
      0
    )
  );

  return { overall, categories: categoryScores };
}
