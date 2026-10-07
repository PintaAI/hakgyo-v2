# Hakgyo ChatGPT plugin package

The package uploaded at `https://platform.openai.com/plugins`. It declares the
production MCP server (`mcp.json`) and the listing, assets and review test
cases (`plugin.json`, Agent Plugins 1.0.0 with the `com.openai` extension). See
[docs/chatgpt-plugin-submission.md](../docs/chatgpt-plugin-submission.md).

Build the ZIP with the manifest at its root:

```bash
cd chatgpt-plugin && zip -r ../hakgyo-chatgpt-plugin.zip plugin.json mcp.json assets
```

MCP tool changes reach ChatGPT through OpenAI's daily scan. Listing, asset or
test case changes need a new ZIP with a higher `version`.
