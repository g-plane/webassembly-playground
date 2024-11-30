// About service worker and typescript, see:
// - https://joshuatz.com/posts/2021/strongly-typed-service-workers/
// - https://github.com/Microsoft/TypeScript/issues/14877#issuecomment-340279293

/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import initWabt from "wabt";
import path from "path";
import { MessageType, type CompileLog, type Message } from "./lib";
import type { File } from "../types";

let wabt: Awaited<ReturnType<typeof initWabt>>;

const cache: Map<string, string | Uint8Array> = new Map();

self.addEventListener("install", (evt) => {
  evt.waitUntil(
    initWabt().then((_wabt) => {
      wabt = _wabt;
    }),
  );
});

self.addEventListener("activate", (evt) => {});

function compile(files: Array<File>) {
  cache.clear();

  let logs: Array<CompileLog> = [];

  for (const file of files) {
    const { filename, content } = file;
    const ext = path.extname(filename);

    switch (ext) {
      case ".wat": {
        try {
          const module = wabt.parseWat(filename, content, {});
          module.validate();
          const result = module.toBinary({ log: true });

          const wasmFilename = `${path.basename(filename, ext)}.wasm`;
          cache.set(wasmFilename, result.buffer);

          logs.push({ filename, result: "ok", log: result.log });
        } catch (e) {
          logs.push({ filename, result: "err", log: (e as Error).message });
        }
        break;
      }

      case ".js": {
        cache.set(filename, content);
        break;
      }
    }
  }

  return logs;
}

self.addEventListener("message", (evt) => {
  const message = evt.data as Message;

  let result: unknown;

  switch (message.type) {
    case MessageType.Compile: {
      result = compile(message.files);
      break;
    }
  }

  evt.ports[0]?.postMessage(result);
});

const MIME_MAP: Record<string, string> = {
  ".wasm": "application/wasm",
  ".js": "application/javascript; charset=utf-8",
};

self.addEventListener("fetch", (evt) => {
  const url = new URL(evt.request.url);

  if (url.origin === self.origin && url.pathname.startsWith("/preview")) {
    const filename = url.pathname.substring(9); // remove "/preview/"
    const content = cache.get(filename);
    if (content) {
      const ext = path.extname(filename);
      const headers = new Headers();
      headers.append("Content-Type", MIME_MAP[ext] ?? "");
      evt.respondWith(new Response(content, { headers }));
    }
  }
});
