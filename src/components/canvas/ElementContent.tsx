import { SlideElement } from "@/types/deck";
import TextElementView from "./elements/TextElementView";
import ImageElementView from "./elements/ImageElementView";
import ChartElementView from "./elements/ChartElementView";
import TableElementView from "./elements/TableElementView";
import ShapeElementView from "./elements/ShapeElementView";
import IconElementView from "./elements/IconElementView";

interface Props {
  element: SlideElement;
  editing?: boolean;
  onCommitText?: (text: string) => void;
  onCommitCell?: (rowIdx: number, colIdx: number, value: string) => void;
}

export default function ElementContent({ element, editing, onCommitText, onCommitCell }: Props) {
  switch (element.type) {
    case "text":
      return (
        <TextElementView element={element} editing={Boolean(editing)} onCommitText={onCommitText ?? (() => {})} />
      );
    case "image":
      return <ImageElementView element={element} />;
    case "chart":
      return <ChartElementView element={element} />;
    case "table":
      return (
        <TableElementView element={element} editing={Boolean(editing)} onCommitCell={onCommitCell ?? (() => {})} />
      );
    case "shape":
      return <ShapeElementView element={element} />;
    case "icon":
      return <IconElementView element={element} />;
  }
}
