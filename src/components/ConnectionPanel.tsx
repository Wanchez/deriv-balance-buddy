import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plug, Unplug } from "lucide-react";

interface ConnectionPanelProps {
  isConnected: boolean;
  isConnecting: boolean;
  balance: number | null;
  currency: string;
  accountName: string;
  loginId: string;
  error: string | null;
  onConnect: (token: string) => void;
  onDisconnect: () => void;
}

export function ConnectionPanel({
  isConnected,
  isConnecting,
  balance,
  currency,
  accountName,
  loginId,
  error,
  onConnect,
  onDisconnect,
}: ConnectionPanelProps) {
  const [token, setToken] = useState("");

  const handleConnect = () => {
    if (token.trim()) {
      onConnect(token.trim());
    }
  };

  if (isConnected) {
    return (
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">Connected</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onDisconnect}
            className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            <Unplug className="h-3.5 w-3.5" />
            Disconnect
          </Button>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Account</span>
            <span className="font-medium">{accountName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Login ID</span>
            <span className="font-mono text-xs">{loginId}</span>
          </div>
          <div className="h-px bg-border" />
          <div className="flex justify-between items-baseline">
            <span className="text-muted-foreground">Balance</span>
            <span className="text-2xl font-bold font-display text-primary">
              {balance?.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">{currency}</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <h2 className="font-display text-lg font-semibold">Connect to Deriv</h2>
      <div className="space-y-3">
        <Input
          type="password"
          placeholder="Enter your Deriv API token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleConnect()}
          className="bg-muted font-mono text-sm"
        />
        <Button
          className="w-full gap-2"
          onClick={handleConnect}
          disabled={!token.trim() || isConnecting}
        >
          {isConnecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plug className="h-4 w-4" />
          )}
          {isConnecting ? "Connecting..." : "Connect"}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2.5">
          {error}
        </p>
      )}
    </div>
  );
}
