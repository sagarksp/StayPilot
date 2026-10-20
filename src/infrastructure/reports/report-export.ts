import "server-only";
import { deflateRawSync } from "node:zlib";

export type ReportExport = Readonly<{
  title: string;
  subtitle: string;
  filters: readonly string[];
  generatedAt: string;
  summary: readonly Readonly<{ label: string; value: string }>[];
  columns: readonly Readonly<{ label: string; weight: number }>[];
  rows: readonly (readonly string[])[];
}>;

function xml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

export function renderExcelWorkbook(report: ReportExport) {
  const columnCount = report.columns.length;
  const columnName = (number: number) => {
    let value = number;
    let name = "";
    while (value > 0) {
      const remainder = (value - 1) % 26;
      name = String.fromCharCode(65 + remainder) + name;
      value = Math.floor((value - 1) / 26);
    }
    return name;
  };
  const inlineCell = (reference: string, value: string, style?: number) => `<c r="${reference}" t="inlineStr"${style === undefined ? "" : ` s="${style}"`}><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
  const dataRows: string[] = [];
  const merges: string[] = [];
  const mergeLast = columnName(columnCount);
  const mergeRow = (row: number) => merges.push(`<mergeCell ref="A${row}:${mergeLast}${row}"/>`);
  let rowNumber = 1;
  dataRows.push(`<row r="${rowNumber}" ht="28" customHeight="1">${inlineCell(`A${rowNumber}`, report.title, 1)}</row>`);
  mergeRow(rowNumber++);
  dataRows.push(`<row r="${rowNumber}">${inlineCell(`A${rowNumber}`, report.subtitle, 2)}</row>`);
  mergeRow(rowNumber++);
  for (const filter of [...report.filters, `Generated: ${report.generatedAt}`]) {
    dataRows.push(`<row r="${rowNumber}">${inlineCell(`A${rowNumber}`, filter, 3)}</row>`);
    mergeRow(rowNumber++);
  }
  for (const item of report.summary) {
    dataRows.push(`<row r="${rowNumber}">${inlineCell(`A${rowNumber}`, item.label, 4)}${inlineCell(`B${rowNumber}`, item.value, 5)}</row>`);
    merges.push(`<mergeCell ref="B${rowNumber}:${mergeLast}${rowNumber}"/>`);
    rowNumber += 1;
  }
  const headerRow = rowNumber;
  dataRows.push(`<row r="${rowNumber}" ht="24" customHeight="1">${report.columns.map((column, index) => inlineCell(`${columnName(index + 1)}${rowNumber}`, column.label, 6)).join("")}</row>`);
  rowNumber += 1;
  for (const row of report.rows) {
    dataRows.push(`<row r="${rowNumber}">${row.map((cell, index) => inlineCell(`${columnName(index + 1)}${rowNumber}`, cell)).join("")}</row>`);
    rowNumber += 1;
  }
  const columnWidths = report.columns.map((column, index) => `<col min="${index + 1}" max="${index + 1}" width="${Math.max(16, Math.min(42, Math.round(10 + column.weight)))}" customWidth="1"/>`).join("");
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0"><pane ySplit="${headerRow}" topLeftCell="A${headerRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${columnWidths}</cols><sheetData>${dataRows.join("")}</sheetData>${report.rows.length ? `<autoFilter ref="A${headerRow}:${mergeLast}${rowNumber - 1}"/>` : ""}${merges.length ? `<mergeCells count="${merges.length}">${merges.join("")}</mergeCells>` : ""}<pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Report" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="5"><font><sz val="10"/><name val="Aptos"/><color rgb="FF263238"/></font><font><b/><sz val="18"/><name val="Aptos Display"/><color rgb="FF0E3A43"/></font><font><sz val="10"/><name val="Aptos"/><color rgb="FF64748B"/></font><font><sz val="9"/><name val="Aptos"/><color rgb="FF475569"/></font><font><b/><sz val="10"/><name val="Aptos"/><color rgb="FFFFFFFF"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF1F2"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0E3A43"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FFD8E1E4"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0"/><xf numFmtId="0" fontId="4" fillId="3" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  return zipFiles([
    ["[Content_Types].xml", contentTypes],
    ["_rels/.rels", rootRels],
    ["xl/workbook.xml", workbook],
    ["xl/_rels/workbook.xml.rels", workbookRels],
    ["xl/worksheets/sheet1.xml", sheet],
    ["xl/styles.xml", styles],
  ]);
}

function crc32(data: Buffer) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipFiles(files: readonly (readonly [string, string])[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  for (const [path, content] of files) {
    const name = Buffer.from(path, "utf8");
    const source = Buffer.from(content, "utf8");
    const compressed = deflateRawSync(source);
    const checksum = crc32(source);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(source.length, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    localParts.push(local, compressed);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(source.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centralParts.push(central);
    offset += local.length + compressed.length;
  }
  const central = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...localParts, central, end]));
}

function ascii(value: string) {
  return value
    .replaceAll("₹", "INR ")
    .replace(/[–—−]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replaceAll("…", "...")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?");
}

function pdfText(value: string) {
  return ascii(value).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function truncate(value: string, max: number) {
  const text = ascii(value).replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 3))}...`;
}

function textCommand(value: string, x: number, y: number, size: number, color = "0.16 0.20 0.24") {
  return `BT /F1 ${size} Tf ${color} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${pdfText(value)}) Tj ET\n`;
}

function rectCommand(x: number, y: number, width: number, height: number, color: string) {
  return `${color} rg ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f\n`;
}

function lineCommand(x1: number, y1: number, x2: number, y2: number, color = "0.88 0.90 0.92") {
  return `${color} RG 0.5 w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S\n`;
}

function renderPdfPage(report: ReportExport, pageRows: readonly (readonly string[])[], pageNumber: number, totalPages: number) {
  const width = 842;
  const height = 595;
  const margin = 34;
  const tableWidth = width - margin * 2;
  const rowHeight = 25;
  let content = "";
  content += rectCommand(0, height - 88, width, 88, "0.06 0.23 0.26");
  content += textCommand(report.title, margin, height - 38, 19, "1 1 1");
  content += textCommand(truncate(report.subtitle, 110), margin, height - 61, 9, "0.88 0.94 0.94");
  content += textCommand(`Generated ${report.generatedAt}`, width - 210, height - 36, 8, "0.88 0.94 0.94");

  let metaY = height - 108;
  content += textCommand("REPORT FILTERS", margin, metaY, 7, "0.39 0.45 0.50");
  metaY -= 13;
  content += textCommand(truncate(report.filters.join("  |  ") || "All records", 140), margin, metaY, 8);

  const summaryY = height - 177;
  const summaryGap = 9;
  const cardWidth = (tableWidth - summaryGap * (report.summary.length - 1)) / Math.max(1, report.summary.length);
  report.summary.forEach(({ label, value }, index) => {
    const x = margin + index * (cardWidth + summaryGap);
    content += rectCommand(x, summaryY, cardWidth, 40, "0.92 0.95 0.96");
    content += textCommand(truncate(label.toUpperCase(), 28), x + 9, summaryY + 25, 6.5, "0.35 0.41 0.46");
    content += textCommand(truncate(value, 28), x + 9, summaryY + 10, 10, "0.06 0.23 0.26");
  });

  let y = height - 200;
  content += rectCommand(margin, y - 3, tableWidth, 23, "0.06 0.23 0.26");
  const totalWeight = report.columns.reduce((sum, column) => sum + column.weight, 0);
  let x = margin;
  const columnWidths = report.columns.map((column) => tableWidth * column.weight / totalWeight);
  report.columns.forEach((column, index) => {
    content += textCommand(truncate(column.label, Math.max(8, Math.floor((columnWidths[index] - 10) / 4.1))), x + 5, y + 5, 7, "1 1 1");
    x += columnWidths[index];
  });
  y -= rowHeight;

  pageRows.forEach((row, rowIndex) => {
    if (rowIndex % 2 === 1) content += rectCommand(margin, y - 4, tableWidth, rowHeight, "0.97 0.98 0.99");
    x = margin;
    row.forEach((value, columnIndex) => {
      const maxChars = Math.max(7, Math.floor((columnWidths[columnIndex] - 10) / 4.05));
      content += textCommand(truncate(value, maxChars), x + 5, y + 6, 7.1);
      x += columnWidths[columnIndex];
    });
    content += lineCommand(margin, y - 5, width - margin, y - 5);
    y -= rowHeight;
  });

  content += lineCommand(margin, 35, width - margin, 35, "0.78 0.82 0.84");
  content += textCommand("StayPilot | Confidential operational report", margin, 21, 7, "0.39 0.45 0.50");
  content += textCommand(`Page ${pageNumber} of ${totalPages}`, width - 112, 21, 7, "0.39 0.45 0.50");
  return content;
}

export function renderPdf(report: ReportExport) {
  const maxRowsPerPage = 13;
  const pages = report.rows.length
    ? Array.from({ length: Math.ceil(report.rows.length / maxRowsPerPage) }, (_, index) => report.rows.slice(index * maxRowsPerPage, (index + 1) * maxRowsPerPage))
    : [[]];
  const pageContents = pages.map((rows, index) => renderPdfPage(report, rows, index + 1, pages.length));
  const pageRefs = pageContents.map((_, index) => `${4 + index * 2} 0 R`).join(" ");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageRefs}] /Count ${pageContents.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ...pageContents.flatMap((content, index) => {
      const pageId = 4 + index * 2;
      const contentId = pageId + 1;
      return [
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`,
        `<< /Length ${content.length} >>\nstream\n${content}endstream`,
      ];
    }),
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
