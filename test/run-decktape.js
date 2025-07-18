import childProcess from "child_process";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { server } from "./server.js";

const decktapeExecutable = fileURLToPath(
  new URL("../decktape.js", import.meta.url)
);
const outputDirectory = fileURLToPath(new URL("./output", import.meta.url));
const inputDirectories = fs.readdirSync(new URL("./input", import.meta.url));

const [, mainFileName] = process.argv;
if (mainFileName === fileURLToPath(import.meta.url)) {
  try {
    const port = server.listen();
    await Promise.all(
      inputDirectories.map(async (inputDir) => {
        await runDecktape(port, inputDir);
      })
    );
  } finally {
    await server.close();
  }
}

function runDecktape(port, inputDir) {
  return new Promise((res, rej) => {
    console.log(`Generating ${inputDir}`);
    const outputFile = path.resolve(outputDirectory, `${inputDir}.pdf`);
    const process = childProcess.exec(
      `node ${decktapeExecutable} -p 3000 http://localhost:${port}/input/${inputDir}/ ${outputFile}`,
      (err) => {
        if (err) {
          rej(err);
        } else {
          console.log(`✅ ${inputDir}.pdf`);
          res();
        }
      }
    );
    process.stdout.on('data', data => console.log(data.toString()));
    process.stderr.on('data', data => console.error(data.toString()));
  });
}
