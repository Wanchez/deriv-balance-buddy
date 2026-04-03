import { useRef, useEffect, useCallback, useState } from "react";
import Blockly from "blockly";
import { TOOLBOX } from "@/lib/blocklyBlocks";
import { Button } from "@/components/ui/button";
import { Play, Square, Save, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface BlocklyWorkspaceProps {
  isConnected: boolean;
}

export function BlocklyWorkspace({ isConnected }: BlocklyWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [hasBlocks, setHasBlocks] = useState(false);

  useEffect(() => {
    if (!containerRef.current || workspaceRef.current) return;

    const ws = Blockly.inject(containerRef.current, {
      toolbox: TOOLBOX,
      theme: Blockly.Themes.Classic,
      grid: { spacing: 20, length: 3, colour: "#333", snap: true },
      zoom: { controls: true, wheel: true, startScale: 0.9, maxScale: 2, minScale: 0.3 },
      trashcan: true,
      renderer: "zelos",
      move: { scrollbars: true, drag: true, wheel: true },
    });

    workspaceRef.current = ws;

    ws.addChangeListener(() => {
      const blocks = ws.getAllBlocks(false);
      setHasBlocks(blocks.length > 0);
    });

    // Load saved workspace
    const saved = localStorage.getItem("blockly_workspace");
    if (saved) {
      try {
        Blockly.serialization.workspaces.load(JSON.parse(saved), ws);
      } catch {
        // ignore corrupt saves
      }
    }

    const ro = new ResizeObserver(() => Blockly.svgResize(ws));
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      ws.dispose();
      workspaceRef.current = null;
    };
  }, []);

  const handleSave = useCallback(() => {
    if (!workspaceRef.current) return;
    const state = Blockly.serialization.workspaces.save(workspaceRef.current);
    localStorage.setItem("blockly_workspace", JSON.stringify(state));
    toast.success("Strategy saved");
  }, []);

  const handleLoad = useCallback(() => {
    const saved = localStorage.getItem("blockly_workspace");
    if (!saved || !workspaceRef.current) {
      toast.error("No saved strategy found");
      return;
    }
    try {
      Blockly.serialization.workspaces.load(JSON.parse(saved), workspaceRef.current);
      toast.success("Strategy loaded");
    } catch {
      toast.error("Failed to load strategy");
    }
  }, []);

  const handleClear = useCallback(() => {
    if (!workspaceRef.current) return;
    workspaceRef.current.clear();
    toast.info("Workspace cleared");
  }, []);

  const handleRun = useCallback(() => {
    if (!isConnected) {
      toast.error("Connect to Deriv first");
      return;
    }
    if (!workspaceRef.current) return;

    // Generate JavaScript code from blocks
    const code = (Blockly as any).JavaScript?.workspaceToCode?.(workspaceRef.current);
    if (!code || code.trim().length === 0) {
      toast.error("No blocks to run – build a strategy first");
      return;
    }
    toast.info("Strategy code generated (execution engine coming soon)");
    console.log("Generated Blockly code:\n", code);
  }, [isConnected]);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30 flex-wrap">
        <Button size="sm" variant="default" onClick={handleRun} disabled={!isConnected || !hasBlocks}>
          <Play className="h-3.5 w-3.5 mr-1" /> Run
        </Button>
        <Button size="sm" variant="outline" onClick={handleSave} disabled={!hasBlocks}>
          <Save className="h-3.5 w-3.5 mr-1" /> Save
        </Button>
        <Button size="sm" variant="outline" onClick={handleLoad}>
          <Upload className="h-3.5 w-3.5 mr-1" /> Load
        </Button>
        <Button size="sm" variant="ghost" onClick={handleClear} disabled={!hasBlocks}>
          <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
        </Button>
        {!isConnected && (
          <span className="ml-auto text-[10px] text-muted-foreground uppercase tracking-wider">
            Connect to enable
          </span>
        )}
      </div>

      {/* Blockly canvas */}
      <div ref={containerRef} className="w-full" style={{ height: "500px" }} />
    </div>
  );
}
