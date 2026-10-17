import { useRef, useState } from "react";
import { useDeckStore } from "@/store/deckStore";
import { useCanvasActions } from "@/hooks/useCanvasActions";
import { exportDeckToPdf } from "@/lib/pdfExport";
import {
  TextIcon,
  ImageIcon,
  ChartIcon,
  TableIcon,
  ShapeIcon,
  DuplicateIcon,
  DeleteIcon,
  ForwardIcon,
  BackwardIcon,
  UndoIcon,
  RedoIcon,
  ExportIcon,
  PresentIcon,
} from "./icons";

export default function Toolbar({ onExport, onPresent }: { onExport: () => void; onPresent: () => void }) {
  const deck = useDeckStore((s) => s.deck);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const selection = useDeckStore((s) => s.selection);
  const pastLen = useDeckStore((s) => s.past.length);
  const futureLen = useDeckStore((s) => s.future.length);
  const isBatching = useDeckStore((s) => s.isBatching);
  const undo = useDeckStore((s) => s.undo);
  const redo = useDeckStore((s) => s.redo);
  const applyOp = useDeckStore((s) => s.applyOp);
  const { insertElement, insertImageWithSrc, duplicateSelected, deleteSelected, reorderZ } = useCanvasActions();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasSelection = selection.elementIds.length > 0;

  const onDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportDeckToPdf(deck);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const onFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => insertImageWithSrc(String(reader.result));
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="flex h-12 items-center gap-2 border-b border-slate-200 bg-white px-3">
      <input
        defaultValue={deck.title}
        key={deck.title}
        onBlur={(e) => {
          if (e.target.value.trim() && e.target.value !== deck.title) {
            applyOp({ type: "rename_deck", title: e.target.value.trim() });
          }
        }}
        className="mr-2 w-[220px] truncate rounded px-1.5 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"
      />
      <Divider />

      <ToolbarGroup label="Insert">
        <ToolbarButton label="Text" icon={<TextIcon />} onClick={() => insertElement("text")} />
        <ToolbarButton label="Image" icon={<ImageIcon />} onClick={() => fileInputRef.current?.click()} />
        <ToolbarButton label="Chart" icon={<ChartIcon />} onClick={() => insertElement("chart")} />
        <ToolbarButton label="Table" icon={<TableIcon />} onClick={() => insertElement("table")} />
        <ToolbarButton label="Shape" icon={<ShapeIcon />} onClick={() => insertElement("shape")} />
      </ToolbarGroup>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChosen} />

      <Divider />
      <ToolbarGroup label="Edit">
        <ToolbarButton label="Duplicate" icon={<DuplicateIcon />} disabled={!hasSelection} onClick={duplicateSelected} title="⌘/Ctrl+D" />
        <ToolbarButton label="Delete" icon={<DeleteIcon />} disabled={!hasSelection} onClick={deleteSelected} title="Del" />
        <ToolbarButton
          label="Forward"
          icon={<ForwardIcon />}
          disabled={selection.elementIds.length !== 1}
          onClick={() => reorderZ("forward")}
        />
        <ToolbarButton
          label="Backward"
          icon={<BackwardIcon />}
          disabled={selection.elementIds.length !== 1}
          onClick={() => reorderZ("backward")}
        />
      </ToolbarGroup>

      <Divider />
      <ToolbarGroup label="History">
        <ToolbarButton
          label="Undo"
          icon={<UndoIcon />}
          disabled={pastLen === 0 || isBatching}
          onClick={undo}
          title={isBatching ? "Wait for the AI to finish" : "⌘/Ctrl+Z"}
        />
        <ToolbarButton
          label="Redo"
          icon={<RedoIcon />}
          disabled={futureLen === 0 || isBatching}
          onClick={redo}
          title={isBatching ? "Wait for the AI to finish" : "⌘/Ctrl+Shift+Z"}
        />
      </ToolbarGroup>

      <div className="flex-1" />
      <ToolbarButton label="Present" icon={<PresentIcon />} onClick={onPresent} disabled={deck.slides.length === 0} />
      <ToolbarButton label="Print" icon={<ExportIcon />} onClick={onExport} />
      <ToolbarButton
        label={isExportingPdf ? "Exporting…" : "Download PDF"}
        icon={<ExportIcon />}
        onClick={onDownloadPdf}
        disabled={isExportingPdf || deck.slides.length === 0}
        primary
      />
    </div>
  );
}

function Divider() {
  return <div className="h-6 w-px bg-slate-200" />;
}

function ToolbarGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1" title={label}>
      {children}
    </div>
  );
}

function ToolbarButton({
  label,
  icon,
  onClick,
  disabled,
  title,
  primary,
}: {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${
        primary ? "bg-indigo-600 text-white hover:bg-indigo-700" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
