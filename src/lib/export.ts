import {
  aggregate,
  calculate,
  activeCount,
  dimensions,
  supports,
  braces,
  memberCuts,
  panelPlacement,
  panelRotation,
  isActive,
  bedPose,
} from "./model";
import type { Project, Bed } from "./model";
import { download, safeName } from "./storage";
const date = () =>
  new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
const headers = ["Material", "Cantidad", "Unidad", "Origen"];
const materialRows = (p: Project) =>
  aggregate(p).map((m) => [
    m.name,
    String(m.quantity),
    m.unit,
    m.overridden ? "Manual / mixto" : "Automático",
  ]);
function roofText(p: Project) {
  return p.roof
    ? `Techo: ${p.roof.name}; escala ${p.roof.width.toFixed(3)} × ${p.roof.length.toFixed(3)} m; posición E–O / N–S ${p.roof.x} / ${p.roof.z} m; giro ${p.roof.rotation}°. Referencias: ${(p.roof.references ?? []).map((r, i) => `${i + 1}: ${r.distance} m`).join("; ") || "escala manual"}.`
    : "Sin imagen de techo.";
}
function bedRows(p: Project) {
  return p.beds.map((b, i) => {
    const d = dimensions(b),
      pose = bedPose(p, i);
    return [
      b.name,
      `${b.rows} × ${b.columns}`,
      String(activeCount(b)),
      `${b.angle}°`,
      `${d.width.toFixed(3)} × ${d.depth.toFixed(3)} m`,
      `${pose.x.toFixed(3)} / ${pose.z.toFixed(3)} m`,
      `${pose.rotation}°`,
    ];
  });
}
function braceRows(b: Bed) {
  const all = supports(b);
  return braces(b).map((c) => [
    String(all.findIndex((s) => s.id === c.fromId) + 1),
    String(all.findIndex((s) => s.id === c.toId) + 1),
    c.axis === "ew" ? "E–O" : "N–S",
    c.length.toFixed(3),
    c.axis === "ew" ? "2 L-Foot" : "2 Tilt Plate",
    "4 T-Bolt",
  ]);
}
export async function exportExcel(p: Project) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Unirack Studio";
  workbook.created = new Date();
  const materials = workbook.addWorksheet("Materiales");
  materials.addRow([p.name]);
  materials.addRow(["Cliente / obra", p.customer]);
  materials.addRow(["Fecha", date()]);
  materials.addRow([]);
  materials.addRow(headers);
  aggregate(p).forEach((m) =>
    materials.addRow([
      m.name,
      m.quantity,
      m.unit,
      m.overridden ? "Manual / mixto" : "Automático",
    ]),
  );
  materials.columns = [
    { width: 48 },
    { width: 15 },
    { width: 14 },
    { width: 24 },
  ];
  materials.views = [{ state: "frozen", ySplit: 5 }];
  materials.autoFilter = `A5:D${5 + aggregate(p).length}`;
  const beds = workbook.addWorksheet("Camas");
  beds.addRow([
    "Cama",
    "Distribución",
    "Paneles activos",
    "Inclinación",
    "Huella",
    "Posición E–O / N–S (m)",
    "Giro en techo",
    "Riel comercial (m)",
    "N–S",
    "E–O",
    "Cuadrícula E–O × N–S",
    "Separación máxima E–O",
    "Separación N–S por fila",
  ]);
  bedRows(p).forEach((r, i) =>
    beds.addRow([
      ...r,
      p.beds[i].railLength,
      p.beds[i].nsMode === "exclude" ? "No" : "Sí",
      p.beds[i].ewMode === "exclude" ? "No" : "Sí",
      p.beds[i].supportGrid
        ? `${p.beds[i].supportGrid!.eastWest} × ${p.beds[i].supportGrid!.northSouth}`
        : "Según separación",
      p.beds[i].supportSpacing,
      p.beds[i].supportSpacingNS ?? "automática",
    ]),
  );
  const detail = workbook.addWorksheet("Detalle por cama");
  detail.addRow(["Cama", ...headers]);
  for (const b of p.beds)
    calculate(b).forEach((m) =>
      detail.addRow([
        b.name,
        m.name,
        m.quantity,
        m.unit,
        m.overridden ? "Manual" : "Automático",
      ]),
    );
  const legs = workbook.addWorksheet("Patas y bloques");
  legs.addRow([
    "Cama",
    "Pata",
    "Fila",
    "E–O local (m)",
    "N–S local (m)",
    "Longitud (m)",
    "Ancho bloque",
    "Fondo bloque",
    "Alto bloque",
    "ID de pata",
    "Riel",
    "Eje",
    "Herraje inferior",
    "Herraje superior",
    "T-Bolt de la pata",
  ]);
  for (const b of p.beds)
    supports(b).forEach((s, i) =>
      legs.addRow([
        b.name,
        i + 1,
        s.row + 1,
        s.x,
        s.z,
        s.length,
        b.bases ? b.baseWidth : 0,
        b.bases ? b.baseDepth : 0,
        b.bases ? b.baseHeight : 0,
        s.id,
        s.trackId,
        s.axis === "x" ? "E–O" : "N–S",
        "L-Foot",
        "Tilt Plate",
        3,
      ]),
    );
  const panels = workbook.addWorksheet("Paneles");
  panels.addRow([
    "Cama",
    "Fila",
    "Columna",
    "Estado",
    "Giro individual (°)",
    "Ancho de panel",
    "Largo de panel",
    "E–O local",
    "N–S local",
    "E–O en techo",
    "N–S en techo",
  ]);
  for (const [i, b] of p.beds.entries()) {
    const d = dimensions(b),
      pose = bedPose(p, i),
      a = (pose.rotation * Math.PI) / 180;
    for (let r = 0; r < b.rows; r++)
      for (let c = 0; c < b.columns; c++) {
        const q = panelPlacement(b, r, c);
        panels.addRow([
          b.name,
          r + 1,
          c + 1,
          isActive(b, r, c) ? "Activo" : "Retirado",
          panelRotation(b, r, c),
          d.w,
          d.l,
          q.x,
          q.z,
          pose.x + q.x * Math.cos(a) - q.z * Math.sin(a),
          pose.z + q.x * Math.sin(a) + q.z * Math.cos(a),
        ]);
      }
  }
  const diagonal = workbook.addWorksheet("Contravientos");
  diagonal.addRow([
    "Cama",
    "Pata origen",
    "Pata destino",
    "Eje",
    "Longitud (m)",
    "Herrajes",
    "Tornillos",
  ]);
  for (const b of p.beds)
    braceRows(b).forEach((row) => diagonal.addRow([b.name, ...row]));
  const cuts = workbook.addWorksheet("Perfiles");
  cuts.addRow([
    "Cama",
    "Miembro",
    "Tipo",
    "Longitud (m)",
    "Piezas comerciales",
    "Longitud comercial (m)",
  ]);
  for (const b of p.beds)
    memberCuts(b).forEach((c) =>
      cuts.addRow([
        b.name,
        c.id,
        c.kind === "ew"
          ? "Riel E–O"
          : c.kind === "ns"
            ? "Riel N–S"
            : "Contraviento",
        c.length,
        c.pieces,
        b.railLength,
      ]),
    );
  const library = workbook.addWorksheet("Biblioteca de paneles");
  library.addRow(["Modelo", "Ancho (m)", "Largo (m)"]);
  (p.panelLibrary ?? []).forEach((v) =>
    library.addRow([v.name, v.width, v.length]),
  );
  if (p.roof) {
    const roof = workbook.addWorksheet("Techo");
    roof.addRow(["Foto", p.roof.name]);
    roof.addRow(["Ancho (m)", p.roof.width]);
    roof.addRow(["Largo (m)", p.roof.length]);
    roof.addRow(["Posición E–O", p.roof.x]);
    roof.addRow(["Posición N–S", p.roof.z]);
    roof.addRow(["Giro (°)", p.roof.rotation]);
    for (const [i, r] of (p.roof.references ?? []).entries())
      roof.addRow([`Referencia ${i + 1} (m)`, r.distance]);
    if (
      p.roof.dataUrl.startsWith("data:image/jpeg") ||
      p.roof.dataUrl.startsWith("data:image/png")
    ) {
      const id = workbook.addImage({
        base64: p.roof.dataUrl,
        extension: p.roof.dataUrl.startsWith("data:image/png") ? "png" : "jpeg",
      });
      roof.addImage(id, {
        tl: { col: 0, row: 10 },
        ext: { width: 600, height: 350 },
      });
    }
    roof.columns = [{ width: 35 }, { width: 65 }];
  }
  for (const sheet of workbook.worksheets) {
    if (sheet !== materials) sheet.columns.forEach((c) => (c.width = 26));
    const head = sheet.getRow(sheet === materials ? 5 : 1);
    head.font = { bold: true, color: { argb: "FFFFFFFF" } };
    head.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF244A40" },
    };
  }
  const buffer = await workbook.xlsx.writeBuffer();
  download(
    new Blob([buffer as ArrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${safeName(p.name)}.xlsx`,
  );
}
export async function exportPDF(
  p: Project,
  views: import("./pdf-views").PdfView[] = [],
) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const pdf = new jsPDF(),
    orange: [number, number, number] = [235, 112, 30];
  function header() {
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(40, 40, 40);
    pdf.setFontSize(17);
    const title = pdf.splitTextToSize(p.name || "Proyecto", 132);
    pdf.text(title, 14, 22);
    if (p.brandLogo) {
      const img = pdf.getImageProperties(p.brandLogo.dataUrl),
        scale = Math.min(42 / img.width, 20 / img.height);
      pdf.addImage(
        p.brandLogo.dataUrl,
        154 + (42 - img.width * scale) / 2,
        12,
        img.width * scale,
        img.height * scale,
      );
    } else {
      pdf.setTextColor(...orange);
      pdf.setFontSize(20);
      pdf.text("SOLEON", 196, 23, { align: "right" });
    }
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(70, 70, 70);
    let y = 27 + (title.length - 1) * 7;
    for (const text of [
      `Cliente: ${p.customer || "—"}`,
      `Ubicación: ${p.location || "—"}`,
    ]) {
      const lines = pdf.splitTextToSize(text, 182);
      pdf.text(lines, 14, y);
      y += lines.length * 5;
    }
    pdf.setDrawColor(...orange);
    pdf.setLineWidth(0.6);
    pdf.line(14, y + 1, 196, y + 1);
    return y + 9;
  }
  const startY = header();
  autoTable(pdf, {
    startY,
    head: [["Material", "Cantidad", "Unidad"]],
    body: aggregate(p).map((m) => [m.name, m.quantity, m.unit]),
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 3, textColor: [45, 45, 45] },
    headStyles: { fillColor: orange, textColor: [255, 255, 255] },
    columnStyles: {
      1: { halign: "right", cellWidth: 25 },
      2: { cellWidth: 22 },
    },
    margin: { left: 14, right: 14, bottom: 16 },
  });
  // Cada vista conserva su proporción; sólo se incluyen las seleccionadas.
  let y =
    (pdf as typeof pdf & { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 10;
  for (const view of views) {
    const img = pdf.getImageProperties(view.dataUrl),
      scale = Math.min(182 / img.width, 100 / img.height),
      width = img.width * scale,
      height = img.height * scale;
    if (y + height + 9 > 278) {
      pdf.addPage();
      y = 18;
    }
    pdf.setTextColor(65, 65, 65);
    pdf.setFontSize(10);
    pdf.text(pdf.splitTextToSize(view.title, 182), 14, y);
    y += 5;
    pdf.addImage(view.dataUrl, "PNG", 14 + (182 - width) / 2, y, width, height);
    y += height + 12;
  }
  for (let i = 1; i <= pdf.getNumberOfPages(); i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(140, 140, 140);
    pdf.text(`${i} / ${pdf.getNumberOfPages()}`, 196, 289, { align: "right" });
  }
  pdf.save(`${safeName(p.name)}.pdf`);
}
export async function exportWord(
  p: Project,
  image?: string,
  imageTitle?: string,
) {
  const {
    Document,
    Packer,
    Paragraph,
    Table,
    TableRow,
    TableCell,
    TextRun,
    HeadingLevel,
    WidthType,
    ImageRun,
  } = await import("docx");
  const para = (text: string) =>
    new Paragraph({ text, spacing: { after: 140 } });
  const table = (rows: string[][]) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: rows.map(
        (r, i) =>
          new TableRow({
            children: r.map(
              (text) =>
                new TableCell({
                  shading: i === 0 ? { fill: "E5EDE8" } : undefined,
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text, bold: i === 0, size: 18 }),
                      ],
                    }),
                  ],
                }),
            ),
          }),
      ),
    });
  const children: (
    InstanceType<typeof Paragraph> | InstanceType<typeof Table>
  )[] = [
    new Paragraph({ text: p.name, heading: HeadingLevel.TITLE }),
    para(`Cliente: ${p.customer || "Sin especificar"} · ${date()}`),
    para("UNIRACK STUDIO · Estimación de materiales"),
  ];
  if (image) {
    const bytes = Uint8Array.from(atob(image.split(",")[1]), (v) =>
      v.charCodeAt(0),
    );
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            type: "png",
            data: bytes,
            transformation: { width: 600, height: 280 },
          }),
        ],
      }),
      para(`Vista del proyecto. Cama seleccionada: ${imageTitle ?? ""}.`),
    );
  }
  children.push(
    table([headers, ...materialRows(p)]),
    new Paragraph({
      text: "Camas del proyecto",
      heading: HeadingLevel.HEADING_1,
    }),
    table([
      [
        "Cama",
        "Distribución",
        "Paneles",
        "Inclinación",
        "Huella",
        "E–O / N–S",
        "Giro",
      ],
      ...bedRows(p),
    ]),
    para(roofText(p)),
  );
  for (const b of p.beds) {
    children.push(
      new Paragraph({
        text: `${b.name} · Patas`,
        heading: HeadingLevel.HEADING_1,
      }),
      table([
        ["Pata", "Fila", "E–O (m)", "N–S (m)", "Longitud (m)", "Riel"],
        ...supports(b).map((s, i) => [
          String(i + 1),
          String(s.row + 1),
          s.x.toFixed(3),
          s.z.toFixed(3),
          s.length.toFixed(3),
          s.axis === "x" ? "E–O" : "N–S",
        ]),
      ]),
    );
    const connections = braceRows(b);
    if (connections.length)
      children.push(
        new Paragraph({
          text: "Contravientos",
          heading: HeadingLevel.HEADING_2,
        }),
        table([
          ["Origen", "Destino", "Eje", "Longitud", "Herrajes", "Tornillos"],
          ...connections,
        ]),
      );
    const rotated = Object.entries(b.panelRotations ?? {}).filter(
      ([, a]) => a !== 0,
    );
    if (rotated.length)
      children.push(
        new Paragraph({
          text: "Paneles girados",
          heading: HeadingLevel.HEADING_2,
        }),
        table([
          ["Fila", "Columna", "Giro"],
          ...rotated.map(([key, a]) => {
            const [r, c] = key.split(":").map(Number);
            return [String(r + 1), String(c + 1), `${a}°`];
          }),
        ]),
      );
  }
  download(
    await Packer.toBlob(new Document({ sections: [{ children }] })),
    `${safeName(p.name)}.docx`,
  );
}
