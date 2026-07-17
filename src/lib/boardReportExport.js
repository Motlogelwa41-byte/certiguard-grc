import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/**
 * Captures a DOM element as a multi-page A4 PDF with a branded header
 * and page-numbered footer — designed for board presentations.
 */
export async function exportElementToPDF(element, { filename = "report.pdf", title = "Report", subtitle = "" } = {}) {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    windowWidth: element.scrollWidth,
  });

  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const usableWidth = pageWidth - margin * 2;
  const headerHeight = 20;

  const pxPerMm = canvas.width / usableWidth;
  const totalHeightMm = canvas.height / pxPerMm;

  const firstPageTop = headerHeight;
  const laterPageTop = margin;
  const firstPageContent = pageHeight - firstPageTop - margin;
  const laterPageContent = pageHeight - laterPageTop - margin;

  let remaining = totalHeightMm;
  let srcYpx = 0;
  let pageIndex = 0;

  while (remaining > 0.1) {
    if (pageIndex > 0) pdf.addPage();

    if (pageIndex === 0) {
      pdf.setFillColor(30, 58, 95);
      pdf.rect(0, 0, pageWidth, headerHeight, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.text(title, margin, 9);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text(new Date().toLocaleString("en-ZA"), pageWidth - margin, 9, { align: "right" });
      if (subtitle) pdf.text(subtitle, margin, 15);
    }

    const top = pageIndex === 0 ? firstPageTop : laterPageTop;
    const contentH = pageIndex === 0 ? firstPageContent : laterPageContent;
    const sliceHeightMm = Math.min(contentH, remaining);
    let sliceHeightPx = Math.ceil(sliceHeightMm * pxPerMm);
    sliceHeightPx = Math.min(sliceHeightPx, canvas.height - srcYpx);
    if (sliceHeightPx <= 0) break;

    const subCanvas = document.createElement("canvas");
    subCanvas.width = canvas.width;
    subCanvas.height = sliceHeightPx;
    const ctx = subCanvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, subCanvas.width, subCanvas.height);
    ctx.drawImage(canvas, 0, srcYpx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

    pdf.addImage(subCanvas.toDataURL("image/png"), "PNG", margin, top, usableWidth, subCanvas.height / pxPerMm);

    srcYpx += sliceHeightPx;
    remaining -= subCanvas.height / pxPerMm;
    pageIndex++;
  }

  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setTextColor(150, 150, 150);
    pdf.setFontSize(8);
    pdf.text(`Page ${i} of ${totalPages} · Confidential`, pageWidth / 2, pageHeight - 4, { align: "center" });
  }

  pdf.save(filename);
}