import Koa from "koa";
import serve from "koa-static";
import { fileURLToPath } from "url";
import { promisify } from "util";
import path from "path";

const app = new Koa();

const dir = path.dirname(fileURLToPath(import.meta.url));
app.use(serve(dir));

export const server = {
  listen(portHint = undefined) {
    this.innerServer = app.listen(portHint);
    const { port } = this.innerServer.address();
    console.log(
      `listening from http://localhost:${port}/ (serving static files from ${dir})`
    );
    return port;
  },

  async close() {
    if (this.innerServer && this.innerServer.close) {
      const closeAsync = promisify(this.innerServer.close).bind(this.innerServer);
      await closeAsync();
    }
  },
};
