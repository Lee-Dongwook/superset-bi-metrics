import {
  chromium,
  type FullConfig,
  type Browser,
  type BrowserContext,
} from "@playwright/test";
import { mkdir } from "fs/promises";
import { dirname } from "path";

async function globalSetup(config: FullConfig) {
  const baseUrl = config.projects[0]?.use?.baseURL || "http://localhost:5173";

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    browser = await chromium.launch();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Browser launch failed");
  }

  try {
    context = await browser.newContext({ baseURL: baseUrl });
    const page = await context.newPage();
    //TODO
  } catch (error) {
    if (error instanceof Error) {
      throw error.message;
    }

    throw error;
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

export default globalSetup;
