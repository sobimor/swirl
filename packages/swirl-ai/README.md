# @getflip/swirl-ai

AI integration for the Swirl Design System. Use it as an **MCP server** so
agents can discover and use Swirl components interactively, or consume the
**build-time artifacts** directly.

## MCP server

The package ships a Model Context Protocol server with 6 tools:

| Tool                      | Description                                                   |
| ------------------------- | ------------------------------------------------------------- |
| `get_started`             | Installation and setup guide (Web Components, Angular, React) |
| `list_components`         | List all UI components (buttons, modals, forms, etc.)         |
| `list_icons`              | List all icon components (`swirl-icon-*`)                     |
| `list_symbols`            | List all symbol components (`swirl-symbol-*`)                 |
| `list_emojis`             | List all emoji components (`swirl-emoji-*`)                   |
| `get_component_details`   | Full docs for a component (props, events, slots, examples)    |

### Usage

```jsonc
{
  "mcpServers": {
    "swirl-ai": {
      "command": "npx",
      "args": ["-y", "@getflip/swirl-ai"]
    }
  }
}
```

### Remote deployment (Docker)

`swirl-ai` supports two transports:

- `stdio` (default): local, process-spawned MCP usage.
- `http`: remote MCP over Streamable HTTP (for internet/VPC access).

For remote deployment, build and run with `SWIRL_AI_TRANSPORT=http`.

This repository includes `Dockerfile.swirl-ai` at the repo root.
It also includes `docker-compose.swirl-ai.yml` for compose-based deployment.

#### Generic Docker setup

1. Build with `Dockerfile.swirl-ai`.
2. Run the container and expose port `3000` (or set `PORT` to your preferred port).
3. Put your preferred reverse proxy/load balancer in front for public access if needed.

Example:

```sh
docker build -f Dockerfile.swirl-ai -t swirl-ai-mcp:local .
docker run --rm -p 3902:3000 --name swirl-ai-mcp-local swirl-ai-mcp:local
```

#### Docker Compose setup

Use the included compose file:

```sh
docker compose -f docker-compose.swirl-ai.yml up --build -d
```

Stop it with:

```sh
docker compose -f docker-compose.swirl-ai.yml down
```

Default runtime env vars used by the container:

- `SWIRL_AI_TRANSPORT=http`
- `PORT=3000`
- `HOST=0.0.0.0`
- `SWIRL_AI_HTTP_PATH=/mcp`

Health endpoint:

- `GET /healthz`

MCP endpoint:

- `/mcp` (or your custom `SWIRL_AI_HTTP_PATH`)

Important: if you deploy this endpoint publicly without auth, anyone with the URL can call MCP tools.

For local development, point to the built file directly:

```jsonc
{
  "mcpServers": {
    "swirl-ai": {
      "command": "node",
      "args": ["<path-to-repo>/packages/swirl-ai/dist/mcp/mcp.js"]
    }
  }
}
```

This local setup is unchanged and continues to use `stdio`.

### Local testing

Use the MCP inspector to call tools interactively in a web UI:

```sh
npx @modelcontextprotocol/inspector node dist/mcp/mcp.js
```

Or during development (no rebuild needed after changes):

```sh
npx @modelcontextprotocol/inspector tsx scripts/mcp.ts
```

## Artifacts

Build-time artifacts for agents that prefer direct file access:

| Artifact                     | Path                                 | Purpose                                                          |
| ---------------------------- | ------------------------------------ | ---------------------------------------------------------------- |
| **Agent components index**   | `dist/agent/components-index.json`   | Lean catalog: tag, summary, and related components per entry.    |
| **Per-component docs**       | `dist/agent/components/<tag>.md`     | Full markdown docs: props, events, slots, examples, a11y info.   |
| **Custom elements manifest** | `dist/custom-elements.manifest.json` | Full CEM schema (tags, props, events, slots, descriptions).      |
| **TypeScript types**         | `dist/types/`                        | Type declarations for all components.                            |

### Package exports

- `@getflip/swirl-ai/agent-index` → `dist/agent/components-index.json`
- `@getflip/swirl-ai/manifest` → `dist/custom-elements.manifest.json`

Per-component docs are at `dist/agent/components/<tag>.md`.

## Versioning

Artifacts are generated from `@getflip/swirl-components` at build time. Keep
`@getflip/swirl-ai` and `@getflip/swirl-components` versions in sync.
