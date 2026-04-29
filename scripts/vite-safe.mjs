import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

const originalExec = childProcess.exec;

childProcess.exec = function patchedExec(command, ...args) {
  if (String(command).trim().toLowerCase() === "net use") {
    const callback = args.find((value) => typeof value === "function");

    queueMicrotask(() => {
      if (callback) {
        callback(null, "", "");
      }
    });

    return {
      kill() {
        return true;
      },
    };
  }

  return originalExec.call(this, command, ...args);
};

syncBuiltinESMExports();

const viteCliPath = path.resolve("node_modules", "vite", "bin", "vite.js");
await import(pathToFileURL(viteCliPath).href);
