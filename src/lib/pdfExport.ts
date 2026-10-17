import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { ARTBOARD_HEIGHT, ARTBOARD_WIDTH, Deck } from "@/types/deck";

let exporting = false;

// captures the hidden PrintView slides (tagged data-pdf-slide) one at a time with
// html2canvas and assembles them into a single PDF, downloaded once at the end
export async function exportDeckToPdf(deck: Deck): Promise<void> {
  if (exporting || deck.slides.length === 0) return;
  exporting = true;
  try {
    // let layout/ResizeObserver settle before grabbing anything
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [ARTBOARD_WIDTH, ARTBOARD_HEIGHT] });

    for (let i = 0; i < deck.slides.length; i++) {
      const slide = deck.slides[i];
      const node = document.querySelector<HTMLElement>(`[data-pdf-slide="${slide.id}"]`);
      if (!node) continue;

      const canvas = await html2canvas(node, {
        width: ARTBOARD_WIDTH,
        height: ARTBOARD_HEIGHT,
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      if (i > 0) pdf.addPage([ARTBOARD_WIDTH, ARTBOARD_HEIGHT], "landscape");
      pdf.addImage(imgData, "PNG", 0, 0, ARTBOARD_WIDTH, ARTBOARD_HEIGHT);
    }

    pdf.save(`${deck.title || "presentation"}.pdf`);
  } finally {
    exporting = false;
  }
}
