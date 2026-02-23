import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

/**
 * BDD configuration: maps Gherkin .feature files to Playwright step definitions.
 * `bddgen` reads this config to generate executable test files in the returned outputDir.
 * The return value is the resolved output directory path (a string), used as `testDir`
 * for the `electron-bdd` project.
 * Including bdd.fixture.ts in the steps pattern lets playwright-bdd resolve the `test` export.
 */
const bddTestDir = defineBddConfig({
    features: 'e2e/features/**/*.feature',
    steps: ['e2e/steps/**/*.ts', 'e2e/fixtures/bdd.fixture.ts'],
    outputDir: '.features-gen',
});

export default defineConfig({
    /** Global test timeout (ms) */
    timeout: 60_000,

    expect: {
        /** Assertion timeout (ms) */
        timeout: 10_000,
        /** Max allowed pixel difference for visual regression snapshots */
        toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
    },

    /** Run tests serially — Electron apps share system resources */
    fullyParallel: false,
    workers: 1,

    /** Retry once on CI to reduce flakiness */
    retries: process.env.CI ? 1 : 0,

    reporter: [
        /** HTML report with trace, video and screenshot viewer */
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
        /** Machine-readable JSON results */
        ['json', { outputFile: 'playwright-report/results.json' }],
        /** GitHub Actions annotations on CI; human-friendly list locally */
        ...(process.env.CI
            ? ([['github']] as const)
            : ([['list']] as const)),
    ],

    use: {
        /** Capture screenshot on test failure */
        screenshot: 'only-on-failure',
        /** Record video; keep only on failure to save disk space */
        video: 'retain-on-failure',
        /** Collect Playwright trace; keep only on failure */
        trace: 'retain-on-failure',
    },

    projects: [
        /**
         * Project 1 — Standard Playwright E2E tests.
         * Covers login, navigation, dashboard and visual regression flows.
         */
        {
            name: 'electron-e2e',
            testDir: 'e2e',
            testMatch: '**/*.spec.ts',
        },

        /**
         * Project 2 — BDD / Cucumber tests.
         * Feature files live in e2e/features/; step definitions in e2e/steps/.
         * Run `npx bddgen` before this project to regenerate test files.
         */
        {
            name: 'electron-bdd',
            testDir: bddTestDir,
        },
    ],
});
