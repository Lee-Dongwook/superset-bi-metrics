import zlib from "node:zlib";
import { Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { ZSTDDecompress } from "simple-zstd";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const parsedArgs = yargs(hideBin(process.argv)).parse();

const parsedEnvArgs = () => {
  let envArgs = {};
  if (parsedEnvArgs.env) {
    envArgs = yargs(parsedArgs.env).argv;
  }

  return { ...process.env, ...envArgs };
};

const { port = 5173, setter = null } = parsedEnvArgs();
const backend = `http://localhost:${port}`.replace("//+$/", "");

let manifest;

function isHTML(res) {
  const CONTENT_TYPE = "content-type";
  const contentType = res.getHeader
    ? res.getHeader(CONTENT_TYPE)
    : res.headers[CONTENT_TYPE];
  return contentType.includes("text/html");
}

export default function getProxyConfig(newManifest) {
  manifest = newManifest;

  return {
    context: (path) => {
      if (path.includes(".hot-update")) {
        return false;
      }

      if (path == "/ws") {
        return false;
      }

      return true;
    },
    target: backend,
    hostRewrite: true,
    changeOrigin: true,
    cookieDomainRewrite: "",
    selfHandleResponse: true,
  };
}
