import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "node:http";

import { ArtifactLibrary, resolveAgentDir } from "../lib/mcp/data-loader.js";
import {
  registerListComponents,
  registerListIcons,
  registerListSymbols,
  registerListEmojis,
} from "../lib/mcp/tools/list-components.js";
import { registerGetComponentDetails } from "../lib/mcp/tools/get-component-details.js";
import { registerGetStarted } from "../lib/mcp/tools/get-started.js";

const DEFAULT_TRANSPORT = "stdio";
const DEFAULT_HTTP_PORT = 3000;
const DEFAULT_HTTP_HOST = "0.0.0.0";
const DEFAULT_HTTP_PATH = "/mcp";
const HEALTH_PATH = "/healthz";

async function parseJsonBody(req: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const raw = Buffer.concat(chunks).toString("utf-8").trim();
  if (!raw) {
    return undefined;
  }

  return JSON.parse(raw);
}

function createMcpServer(lib: ArtifactLibrary): McpServer {
  const server = new McpServer({
    name: "swirl-ai",
    version: "0.1.0",
  });

  registerListComponents(server, lib);
  registerListIcons(server, lib);
  registerListSymbols(server, lib);
  registerListEmojis(server, lib);
  registerGetComponentDetails(server, lib);
  registerGetStarted(server, lib);

  return server;
}

async function runStdio(lib: ArtifactLibrary): Promise<void> {
  const server = createMcpServer(lib);
  await server.connect(new StdioServerTransport());

  console.error("Swirl AI MCP Server running on stdio");
}

async function runHttp(lib: ArtifactLibrary): Promise<void> {
  const port = Number(process.env.PORT ?? DEFAULT_HTTP_PORT);
  const host = process.env.HOST ?? DEFAULT_HTTP_HOST;
  const path = process.env.SWIRL_AI_HTTP_PATH ?? DEFAULT_HTTP_PATH;

  const httpServer = createServer(async (req, res) => {
    const origin = req.headers.host ?? `${host}:${port}`;
    const url = new URL(req.url ?? "/", `http://${origin}`);

    if (req.method === "GET" && url.pathname === HEALTH_PATH) {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("ok");
      return;
    }

    if (url.pathname !== path) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    try {
      const shouldParseBody =
        req.method === "POST" &&
        (req.headers["content-type"]?.includes("application/json") ?? false);
      const parsedBody = shouldParseBody ? await parseJsonBody(req) : undefined;
      const server = createMcpServer(lib);
      const transport = new StreamableHTTPServerTransport({
        // Stateless mode for internet-hosted endpoint.
        sessionIdGenerator: undefined,
      });
      await server.connect(transport);

      await transport.handleRequest(req, res, parsedBody);
      await server.close();
    } catch (error) {
      console.error("HTTP transport error:", error);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Internal Server Error");
      }
    }
  });

  httpServer.on("error", (error) => {
    console.error("HTTP server error:", error);
  });

  httpServer.listen(port, host, () => {
    console.error(`Swirl AI MCP Server running on http://${host}:${port}${path}`);
    console.error(`Health endpoint available at http://${host}:${port}${HEALTH_PATH}`);
  });
}

async function main() {
  const agentDir = resolveAgentDir();
  console.error(`Loading artifacts from: ${agentDir}`);

  const lib = new ArtifactLibrary(agentDir);
  console.error(`Loaded ${lib.totalCount} components`);

  const mode = (process.env.SWIRL_AI_TRANSPORT ?? DEFAULT_TRANSPORT).toLowerCase();

  if (mode === "stdio") {
    await runStdio(lib);
    return;
  }

  if (mode === "http") {
    await runHttp(lib);
    return;
  }
    
  throw new Error(
    `Invalid SWIRL_AI_TRANSPORT value: "${mode}". Expected "stdio" or "http".`,
  );
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
