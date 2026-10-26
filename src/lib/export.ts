import {
  aggregate,
  activeCount,
  calculate,
  dimensions,
  supports,
  warnings,
  panelRotation,
  isActive,
} from "./model";
import type { Project, MaterialId, Bed } from "./model";
import { download, safeName } from "./storage";
const date = () =>
  new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" }) +
  " (Ciudad de México)";
const money = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    n,
  );
function materialRows(p: Project, prices: Partial<Record<MaterialId, number>>) {
  return aggregate(p, prices).map((m) => [
    m.name,
    String(m.quantity),
    m.unit,
    m.overridden ? "Manual / mixto" : "Automático",
    money(m.price),
    money(m.price * m.quantity),
  ]);
}
function placementSummary(b: Bed) {
  return `Separación E–O máxima: ${b.supportSpacing} m; separación N–S por fila: ${b.supportSpacingNS ?? "automática"} m. Patas con posición manual: ${supports(b).filter((s) => s.moved).length}. Paneles con giro individual: ${Object.values(b.panelRotations || {}).filter((n) => n !== 0).length}. Riel N–S: ${b.nsMode ?? "auto"}; Beam Clip por cruce: ${b.beamClipsPerCrossing ?? 1}; contravientos: ${b.bracingEnabled ? `${b.bracingCount ?? 2} diagonales, eje ${b.bracingAxis ?? "ew"}, longitud ${b.bracingLength ?? "geométrica"}` : "no"}.`;
}
function roofSummary(p: Project) {
  return p.roof
    ? `Imagen de techo: ${p.roof.name}; ${p.roof.width} × ${p.roof.length} m; posición X/Z ${p.roof.x}/${p.roof.z} m; giro ${p.roof.rotation}°; opacidad ${Math.round(p.roof.opacity * 100)}%.`
    : "Sin imagen de techo.";
}
function rotatedRows(b: Bed) {
  return Object.entries(b.panelRotations || {})
    .filter(([, angle]) => angle !== 0)
    .map(([key, angle]) => {
      const [r, c] = key.split(":").map(Number);
      return [
        `${r + 1}`,
        `${c + 1}`,
        `${angle}°`,
        isActive(b, r, c) ? "Activo" : "Retirado",
      ];
    });
}
function bedSummary(p: Project) {
  return p.beds.map((b) => {
    const d = dimensions(b);
    return [
      b.name,
      `${b.rows} × ${b.columns}`,
      String(activeCount(b)),
      `${b.angle}°`,
      `${d.width.toFixed(2)} × ${d.depth.toFixed(2)} m`,
      `${b.frontHeight.toFixed(3)} / ${d.rearHeight.toFixed(3)} m`,
      b.bases ? "Sí" : "No",
    ];
  });
}
const headers = [
  "Material",
  "Cantidad",
  "Unidad",
  "Origen",
  "P. unitario MXN",
  "Importe MXN",
];
export async function exportExcel(
  p: Project,
  prices: Partial<Record<MaterialId, number>>,
) {
  const { default: ExcelJS } = await import("exceljs");
  const { Workbook } = ExcelJS;
  const wb = new Workbook();
  wb.creator = "Unirack Studio";
  wb.created = new Date();
  const ws = wb.addWorksheet("Materiales");
  ws.addRow([p.name]);
  ws.addRow(["Cliente", p.customer || "Sin especificar"]);
  ws.addRow(["Generado", date()]);
  ws.addRow(["Moneda", "MXN"]);
  ws.addRow([]);
  ws.addRow(headers);
  aggregate(p, prices).forEach((m, i) =>
    ws.addRow([
      m.name,
      m.quantity,
      m.unit,
      m.overridden ? "Manual / mixto" : "Automático",
      m.price,
      { formula: `B${i + 7}*E${i + 7}`, result: m.quantity * m.price },
    ]),
  );
  const total = aggregate(p, prices).reduce(
    (s, m) => s + m.quantity * m.price,
    0,
  );
  ws.addRow([
    "TOTAL",
    "",
    "",
    "",
    "",
    { formula: `SUM(F7:F${6 + aggregate(p, prices).length})`, result: total },
  ]);
  ws.autoFilter = `A6:F${6 + aggregate(p, prices).length}`;
  ws.views = [{ state: "frozen", ySplit: 6 }];
  ws.columns = [
    { width: 43 },
    { width: 14 },
    { width: 12 },
    { width: 20 },
    { width: 22 },
    { width: 22 },
  ];
  ws.getColumn(5).numFmt = '"$"#,##0.00';
  ws.getColumn(6).numFmt = '"$"#,##0.00';
  const config = wb.addWorksheet("Camas");
  config.addRow([
    "Cama",
    "Filas × columnas",
    "Paneles activos",
    "Inclinación",
    "Huella ancho × fondo",
    "Pata frontal / trasera",
    "Con bloques",
    "Modo N–S",
    "Separación E–O máxima (m)",
    "Separación N–S por fila (m)",
    "Beam Clip por cruce",
    "Contravientos",
    "Diagonales",
    "Eje de contravientos",
    "Longitud considerada (m)",
  ]);
  bedSummary(p).forEach((row, i) => {
    const b = p.beds[i];
    config.addRow([
      ...row,
      b.nsMode ?? "auto",
      b.supportSpacing,
      b.supportSpacingNS ?? "automática",
      b.beamClipsPerCrossing ?? 1,
      b.bracingEnabled ? "Sí" : "No",
      b.bracingEnabled ? (b.bracingCount ?? 2) : 0,
      b.bracingAxis ?? "ew",
      b.bracingLength ?? "geométrica",
    ]);
  });
  config.columns.forEach((c) => (c.width = 27));
  const detail = wb.addWorksheet("Detalle por cama");
  detail.addRow(["Cama", ...headers]);
  for (const b of p.beds)
    calculate(b, prices).forEach((m) =>
      detail.addRow([
        b.name,
        m.name,
        m.quantity,
        m.unit,
        m.overridden ? "Manual" : "Automático",
        m.price,
        m.quantity * m.price,
      ]),
    );
  detail.columns.forEach((c) => (c.width = 26));
  const legs = wb.addWorksheet("Patas y bloques");
  legs.addRow([
    "Cama",
    "Pata",
    "Fila",
    "Posición X (m)",
    "Posición Z (m)",
    "Altura vertical (m)",
    "Bloque ancho (m)",
    "Bloque fondo (m)",
    "Bloque alto (m)",
    "ID estable de pata",
    "Posición",
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
        s.moved ? "Manual" : "Automática",
      ]),
    );
  legs.columns.forEach((c) => (c.width = 23));
  const panels = wb.addWorksheet("Paneles");
  panels.addRow([
    "Cama",
    "Fila",
    "Columna",
    "Estado",
    "Giro individual (°)",
    "Ancho del panel (m)",
    "Largo del panel (m)",
    "Centro X (m)",
    "Distancia desde frente sobre el plano (m)",
  ]);
  for (const b of p.beds) {
    const d = dimensions(b);
    for (let r = 0; r < b.rows; r++)
      for (let c = 0; c < b.columns; c++)
        panels.addRow([
          b.name,
          r + 1,
          c + 1,
          isActive(b, r, c) ? "Activo" : "Retirado",
          panelRotation(b, r, c),
          d.w,
          d.l,
          d.columnCenters[c] - d.width / 2,
          d.rowCenters[r],
        ]);
  }
  panels.columns.forEach((c) => (c.width = 24));
  if (p.roof) {
    const roof = wb.addWorksheet("Techo");
    roof.addRow(["Imagen del techo", p.roof.name]);
    roof.addRow(["Ancho (m)", p.roof.width]);
    roof.addRow(["Largo (m)", p.roof.length]);
    roof.addRow(["Posición X (m)", p.roof.x]);
    roof.addRow(["Posición Z (m)", p.roof.z]);
    roof.addRow(["Giro (°)", p.roof.rotation]);
    roof.addRow(["Opacidad", p.roof.opacity]);
    const imageId = wb.addImage({ base64: p.roof.dataUrl, extension: "jpeg" });
    roof.addImage(imageId, {
      tl: { col: 0, row: 9 },
      ext: { width: 600, height: 360 },
    });
    roof.columns = [{ width: 35 }, { width: 55 }];
  }
  const library = wb.addWorksheet("Biblioteca de paneles");
  library.addRow(["Modelo", "Ancho (m)", "Largo (m)"]);
  for (const panel of p.panelLibrary || [])
    library.addRow([panel.name, panel.width, panel.length]);
  library.columns = [{ width: 45 }, { width: 18 }, { width: 18 }];
  const notes = wb.addWorksheet("Supuestos");
  notes.addRow(["Origen y límites del cálculo"]);
  notes.addRow([roofSummary(p)]);
  notes.addRow([
    "Referencia: imagen aportada por el usuario; manuales Unirac Ascender sin verificar.",
  ]);
  notes.addRow([
    "Los precios no capturados se consideran 0. Total sin impuestos, flete ni mano de obra.",
  ]);
  for (const b of p.beds) {
    notes.addRow([b.name]);
    notes.addRow([placementSummary(b)]);
    warnings(b).forEach((w) => notes.addRow([w]));
    notes.addRow([
      `Panel ${b.panelWidth} × ${b.panelLength} m; separación ${b.gap} m; riel comercial ${b.railLength} m; riel de referencia supuesto ${b.referenceRailLength} m; volado ${b.overhang} m; separación de apoyos ${b.supportSpacing} m.`,
    ]);
  }
  notes.getColumn(1).width = 120;
  notes.eachRow((r) => {
    r.alignment = { wrapText: true, vertical: "top" };
    r.height = 44;
  });
  for (const sheet of [ws, config, detail, legs, library, panels]) {
    const hr = sheet.getRow(sheet === ws ? 6 : 1);
    hr.font = { bold: true, color: { argb: "FFFFFFFF" } };
    hr.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF244A40" },
    };
  }
  const buffer = await wb.xlsx.writeBuffer();
  download(
    new Blob([buffer as ArrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${safeName(p.name)}.xlsx`,
  );
}
export async function exportPDF(
  p: Project,
  prices: Partial<Record<MaterialId, number>>,
  image?: string,
  imageTitle?: string,
) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const pdf = new jsPDF();
  pdf.setFontSize(23);
  pdf.setTextColor("#244a40");
  pdf.text("UNIRACK / STUDIO", 14, 23);
  pdf.setFontSize(15);
  const titleLines = pdf.splitTextToSize(p.name, 182);
  pdf.text(titleLines, 14, 35);
  const metaY = 35 + (titleLines.length - 1) * 6 + 8;
  pdf.setFontSize(9);
  pdf.setTextColor("#555555");
  const metaLines = pdf.splitTextToSize(
    `Cliente: ${p.customer || "Sin especificar"} | ${date()}`,
    182,
  );
  pdf.text(metaLines, 14, metaY);
  let y = metaY + metaLines.length * 4 + 6;
  pdf.text("Estimación preliminar de materiales · Moneda: MXN", 14, y);
  y += 6;
  if (image) {
    pdf.addImage(image, "PNG", 14, y, 182, 85);
    y += 91;
    pdf.setFontSize(8);
    pdf.text(
      `Vista 3D: ${imageTitle || "cama seleccionada"}. El reporte incluye todas las camas.`,
      14,
      y,
    );
    y += 6;
  }
  autoTable(pdf, {
    startY: y,
    head: [headers],
    body: materialRows(p, prices),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [36, 74, 64] },
  });
  const total = aggregate(p, prices).reduce(
    (s, m) => s + m.quantity * m.price,
    0,
  );
  pdf.addPage();
  pdf.setFontSize(15);
  pdf.text("Configuración de camas", 14, 20);
  autoTable(pdf, {
    startY: 27,
    head: [
      [
        "Cama",
        "Distribución",
        "Paneles",
        "Ángulo",
        "Huella",
        "Patas F / T",
        "Bases",
      ],
    ],
    body: bedSummary(p),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [36, 74, 64] },
  });
  for (const b of p.beds) {
    pdf.addPage();
    pdf.setFontSize(14);
    pdf.text(`${b.name} · Patas y supuestos`, 14, 20);
    const note = `Panel: ${b.panelWidth} × ${b.panelLength} m. Riel: ${b.railLength} m (referencia supuesta: ${b.referenceRailLength} m). Volado: ${b.overhang} m. Bloques: ${b.bases ? `${b.baseWidth} × ${b.baseDepth} × ${b.baseHeight} m` : "sin bloques"}.`;
    pdf.setFontSize(9);
    pdf.text(pdf.splitTextToSize(note, 182), 14, 28);
    autoTable(pdf, {
      startY: 45,
      head: [["Pata", "Fila", "X (m)", "Z (m)", "Altura vertical (m)"]],
      body: supports(b).map((s, i) => [
        i + 1,
        s.row + 1,
        s.x.toFixed(3),
        s.z.toFixed(3),
        s.length.toFixed(3),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [36, 74, 64] },
    });
    pdf.addPage();
    pdf.setFontSize(13);
    pdf.text(`${b.name} · Alcance del cálculo`, 14, 20);
    pdf.setFontSize(10);
    let line = 32;
    for (const w of [placementSummary(b), ...warnings(b)]) {
      const text = pdf.splitTextToSize(w, 180);
      if (line + text.length * 5 + 8 > 275) {
        pdf.addPage();
        line = 22;
        pdf.setFontSize(10);
      }
      pdf.text(text, 14, line);
      line += text.length * 5 + 8;
    }
  }
  for (const b of p.beds) {
    const rows = rotatedRows(b);
    if (rows.length) {
      pdf.addPage();
      pdf.setFontSize(14);
      pdf.text(`${b.name} · Giros individuales`, 14, 20);
      autoTable(pdf, {
        startY: 28,
        head: [["Fila", "Columna", "Giro", "Estado"]],
        body: rows,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [36, 74, 64] },
      });
    }
  }
  pdf.addPage();
  pdf.setFontSize(12);
  pdf.text("Referencia de techo", 14, 20);
  pdf.setFontSize(10);
  pdf.text(pdf.splitTextToSize(roofSummary(p), 180), 14, 30);
  pdf.addPage();
  pdf.setFontSize(15);
  pdf.text(`Total estimado: ${money(total)}`, 14, 22);
  pdf.setFontSize(10);
  pdf.text(
    "Sin impuestos, flete ni mano de obra. Los precios sin capturar se consideran 0.",
    14,
    34,
  );
  for (let i = 1; i <= pdf.getNumberOfPages(); i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor("#777777");
    pdf.text(
      `Unirack Studio · Estimación preliminar · ${i} / ${pdf.getNumberOfPages()}`,
      14,
      289,
    );
  }
  pdf.save(`${safeName(p.name)}.pdf`);
}
export async function exportWord(
  p: Project,
  prices: Partial<Record<MaterialId, number>>,
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
    new Paragraph({ children: [new TextRun(text)], spacing: { after: 140 } });
  const table = (rows: string[][]) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: rows.map(
        (row, i) =>
          new TableRow({
            children: row.map(
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
  const children = [
    new Paragraph({ text: p.name, heading: HeadingLevel.TITLE }),
    para(`Cliente: ${p.customer || "Sin especificar"} · ${date()}`),
    para("UNIRACK STUDIO · Estimación preliminar de materiales. Moneda: MXN."),
  ];
  children.push(para(roofSummary(p)));
  if (image) {
    const bytes = Uint8Array.from(atob(image.split(",")[1]), (c) =>
      c.charCodeAt(0),
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
    );
  }
  if (image)
    children.push(
      para(
        `Vista 3D: ${imageTitle || "cama seleccionada"}. El reporte incluye todas las camas.`,
      ),
    );
  const content: ((typeof children)[number] | InstanceType<typeof Table>)[] = [
    ...children,
    table([headers, ...materialRows(p, prices)]),
    para(
      `Total estimado: ${money(aggregate(p, prices).reduce((s, m) => s + m.quantity * m.price, 0))}. Sin impuestos, flete ni mano de obra.`,
    ),
    new Paragraph({
      text: "Configuración de camas",
      heading: HeadingLevel.HEADING_1,
    }),
    table([
      [
        "Cama",
        "Distribución",
        "Paneles",
        "Ángulo",
        "Huella",
        "Patas F / T",
        "Bases",
      ],
      ...bedSummary(p),
    ]),
  ];
  for (const b of p.beds) {
    content.push(
      new Paragraph({ text: b.name, heading: HeadingLevel.HEADING_1 }),
      para(
        `Panel ${b.panelWidth} × ${b.panelLength} m · Riel ${b.railLength} m (referencia supuesta ${b.referenceRailLength} m) · Volado ${b.overhang} m · Apoyos cada ${b.supportSpacing} m. Bloques: ${b.bases ? `${b.baseWidth} × ${b.baseDepth} × ${b.baseHeight} m` : "sin bloques"}.`,
      ),
      table([
        ["Pata", "Fila", "X (m)", "Z (m)", "Altura vertical (m)"],
        ...supports(b).map((s, i) => [
          String(i + 1),
          String(s.row + 1),
          s.x.toFixed(3),
          s.z.toFixed(3),
          s.length.toFixed(3),
        ]),
      ]),
      para(placementSummary(b)),
      ...(rotatedRows(b).length
        ? [table([["Fila", "Columna", "Giro", "Estado"], ...rotatedRows(b)])]
        : []),
      ...warnings(b).map(para),
    );
  }
  const doc = new Document({ sections: [{ children: content }] });
  download(await Packer.toBlob(doc), `${safeName(p.name)}.docx`);
}
