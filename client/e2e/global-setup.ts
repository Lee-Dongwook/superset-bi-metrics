import { chromium, type FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:5173";

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ baseURL });
    await context.newPage();
    // TODO: log in and persist storage state for e2e specs.
  } finally {
    await browser.close();
  }
}

export default globalSetup;
