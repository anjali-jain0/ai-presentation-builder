import { useEffect, useRef } from "react";
import { TextElement } from "@/types/deck";

interface Props {
  element: TextElement;
  editing: boolean;
  onCommitText: (text: string) => void;
}

export default function TextElementView({ element, editing, onCommitText }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const lines = element.text.split("\n");
  const isListy = element.listStyle && element.listStyle !== "none";

  // focus + select all text as soon as editing starts, so typing just replaces it
  useEffect(() => {
    if (!editing) return;
    const el = ref.current;
    if (!el) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [editing]);

  if (editing) {
    return (
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className="h-full w-full outline-none"
        style={{
          fontSize: element.fontSize,
          fontWeight: element.fontWeight,
          textAlign: element.align,
          color: element.color,
          whiteSpace: "pre-wrap",
          cursor: "text",
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        // contentEditable turns some spaces into NBSP (U+00A0); normalize back on commit
        onBlur={(e) => onCommitText(e.currentTarget.innerText.replace(/\u00A0/g, " "))}
      >
        {element.text}
      </div>
    );
  }

  if (isListy) {
    const Tag = element.listStyle === "number" ? "ol" : "ul";
    return (
      <Tag
        className="h-full w-full"
        style={{
          fontSize: element.fontSize,
          fontWeight: element.fontWeight,
          textAlign: element.align,
          color: element.color,
          paddingLeft: 24,
          margin: 0,
          listStyleType: element.listStyle === "number" ? "decimal" : "disc",
        }}
      >
        {lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </Tag>
    );
  }

  return (
    <div
      className="h-full w-full"
      style={{
        fontSize: element.fontSize,
        fontWeight: element.fontWeight,
        textAlign: element.align,
        color: element.color,
        whiteSpace: "pre-wrap",
      }}
    >
      {element.text}
    </div>
  );
}
