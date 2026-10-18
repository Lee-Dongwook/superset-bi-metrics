import { readdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";

const CLIENT_DIR = fileURLToPath(new URL("..", import.meta.url));
const WORKSPACE_DIRS = ["packages", "plugins"];

// every workspace package name -> its src, so stories read sources directly (no `build:packages`)
const workspaceAliases = Object.fromEntries(
  WORKSPACE_DIRS.flatMap((group) =>
    readdirSync(`${CLIENT_DIR}/${group}`)
      .map((dir) => `${CLIENT_DIR}/${group}/${dir}`)
      .filter((dir) => existsSync(`${dir}/package.json`))
      .map((dir) => [
        JSON.parse(readFileSync(`${dir}/package.json`, "utf8")).name,
        `${dir}/src`,
      ]),
  ),
);

const config: StorybookConfig = {
  stories: [
    `${CLIENT_DIR}/src/**/*.stories.@(ts|tsx)`,
    ...WORKSPACE_DIRS.map(
      (group) => `${CLIENT_DIR}/${group}/*/src/**/*.stories.@(ts|tsx)`,
    ),
  ],
  addons: ["@storybook/addon-docs"],
  framework: "@storybook/react-vite",
  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, { resolve: { alias: workspaceAliases } }),
};

export default config;
