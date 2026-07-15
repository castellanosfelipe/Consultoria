module.exports = {
  ci: {
    collect: {
      startServerCommand: "node scripts/serve-dist.mjs",
      startServerReadyPattern: "QA server ready",
      url: ["http://127.0.0.1:4174/"],
      numberOfRuns: 3,
      settings: {
        chromeFlags: "--headless --no-sandbox --disable-dev-shm-usage",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.95, aggregationMethod: "pessimistic" }],
        "categories:accessibility": ["error", { minScore: 0.95, aggregationMethod: "pessimistic" }],
        "categories:best-practices": ["error", { minScore: 0.95, aggregationMethod: "pessimistic" }],
        "categories:seo": ["error", { minScore: 0.95, aggregationMethod: "pessimistic" }],
        "label-content-name-mismatch": ["error", { minScore: 1, aggregationMethod: "pessimistic" }],
        "largest-contentful-paint": ["error", { maxNumericValue: 1500, aggregationMethod: "pessimistic" }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1, aggregationMethod: "pessimistic" }],
        "total-blocking-time": ["error", { maxNumericValue: 200, aggregationMethod: "pessimistic" }],
        "total-byte-weight": ["error", { maxNumericValue: 307200, aggregationMethod: "pessimistic" }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./.lighthouseci/reports",
    },
  },
};
