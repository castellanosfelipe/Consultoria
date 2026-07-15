module.exports = {
  ci: {
    collect: {
      staticDistDir: "./dist",
      url: ["http://localhost/"],
      numberOfRuns: 3,
      settings: {
        chromeFlags: "--headless --no-sandbox --disable-dev-shm-usage",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.95 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["error", { minScore: 0.95 }],
        "categories:seo": ["error", { minScore: 0.95 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 1500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-byte-weight": ["error", { maxNumericValue: 307200 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./.lighthouseci/reports",
    },
  },
};
