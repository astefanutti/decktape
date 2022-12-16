import { server } from "./server.js";
import { fileURLToPath } from "url";
import path from "path";

const [, mainFileName, port] = process.argv;
if (mainFileName === fileURLToPath(import.meta.url)) {
  if (!port) {
    const fileName = path.basename(fileURLToPath(import.meta.url));
    console.error(`
    Error: Missing port number to run on
    Usage: node ${fileName} <port>
    
    Example: node ${fileName} 3000`);
  } else {
    server.listen(parseInt(port));
  }
}
