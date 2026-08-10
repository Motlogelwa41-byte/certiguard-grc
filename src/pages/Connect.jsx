import React, { useState, useMemo } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, Plug, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed — select and copy manually", variant: "destructive" });
    }
  };

  return (
    <div>
      {label && <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">{label}</p>}
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm font-mono text-foreground truncate select-all">
          {value}
        </code>
        <Button size="icon" variant="outline" onClick={copy} title="Copy">
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

function Step({ n, children }) {
  return (
    <li className="flex gap-3">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">{n}</span>
      <span className="text-sm text-foreground leading-relaxed">{children}</span>
    </li>
  );
}

export default function Connect() {
  const mcpUrl = useMemo(() => new URL("/api/mcp", window.location.origin).toString(), []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Connect AI Assistants"
        subtitle="Point external AI clients at your GRC platform so they can query compliance data and run actions on your behalf."
      />

      {/* Server URL card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="w-5 h-5 text-primary" />
            MCP Server URL
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CopyField label="Streamable HTTP endpoint" value={mcpUrl} />
          <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
            <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              This server uses <strong className="text-foreground">OAuth authentication</strong>. When an AI assistant connects, it will open your consent page where you sign in with your app account and approve the tools it can use. The assistant only ever acts with your permissions.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Client instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to connect</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="claude">
            <TabsList className="grid w-full grid-cols-4 max-w-md">
              <TabsTrigger value="claude">Claude</TabsTrigger>
              <TabsTrigger value="chatgpt">ChatGPT</TabsTrigger>
              <TabsTrigger value="cursor">Cursor</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>

            <TabsContent value="claude" className="mt-4">
              <ol className="space-y-2.5">
                <Step n={1}>Open Claude and go to <strong>Profile menu → Settings → Connectors</strong>.</Step>
                <Step n={2}>Click <strong>"Add custom connector"</strong>.</Step>
                <Step n={3}>Give it a name (e.g. "GRC Platform") and paste the MCP server URL above.</Step>
                <Step n={4}>Click <strong>Add</strong>. Claude will open your consent page — sign in and approve.</Step>
              </ol>
            </TabsContent>

            <TabsContent value="chatgpt" className="mt-4">
              <ol className="space-y-2.5">
                <Step n={1}>In ChatGPT, go to <strong>Apps</strong> and enable <strong>Developer mode</strong> (confirm the risk prompt).</Step>
                <Step n={2}>Click <strong>"Create app"</strong>, name it, and paste the MCP server URL above.</Step>
                <Step n={3}>Click <strong>Create</strong>, then enable the app from the chat composer before prompting it.</Step>
                <Step n={4}>ChatGPT will open your consent page — sign in and approve the tools.</Step>
              </ol>
            </TabsContent>

            <TabsContent value="cursor" className="mt-4">
              <ol className="space-y-2.5">
                <Step n={1}>In Cursor, go to <strong>Settings → Tools & Integrations → "New MCP Server"</strong>.</Step>
                <Step n={2}>This opens <code className="text-xs bg-muted px-1.5 py-0.5 rounded">mcp.json</code> — add an entry whose <code className="text-xs bg-muted px-1.5 py-0.5 rounded">url</code> is the MCP server URL above.</Step>
                <Step n={3}>Save the file and toggle the server on.</Step>
                <Step n={4}>Cursor will open your consent page — sign in and approve.</Step>
              </ol>
            </TabsContent>

            <TabsContent value="custom" className="mt-4">
              <ol className="space-y-2.5">
                <Step n={1}>Copy the MCP server URL above.</Step>
                <Step n={2}>Add it as a <strong>streamable HTTP MCP server</strong> in your client. Name and URL is all most clients need.</Step>
                <Step n={3}>Reload the client. On first use, it will open your consent page — sign in and approve.</Step>
              </ol>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Refresh note */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 px-4 py-3">
        <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>Refresh the connector after we ship changes.</strong> AI assistants cache the tool list — if new tools are added or existing ones change, reconnect or refresh the connector so the assistant picks up the latest tools.
        </p>
      </div>
    </div>
  );
}