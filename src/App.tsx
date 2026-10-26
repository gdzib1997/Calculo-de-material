import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ImagePlus,
  ArrowDownToLine,
  ArrowUpFromLine,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Grid2X2,
  Info,
  Layers,
  Leaf,
  LoaderCircle,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  SlidersHorizontal,
  Sun,
  Trash2,
  Triangle,
  Wind,
  Move,
  X,
} from "lucide-react";
import {
  activeCount,
  aggregate,
  calculate,
  createBed,
  dimensions,
  isActive,
  panelKey,
  sections,
  supports,
  validateProject,
  snapSupport,
  bedPose,
  projectBounds,
  braceConnections,
  braceAxis,
  braces,
} from "./lib/model";
import type { Bed, MaterialId, Project, PanelPreset } from "./lib/model";
import { download, loadProject, safeName, saveProject } from "./lib/storage";
import Field from "./components/Field";
import PanelLibrary from "./components/PanelLibrary";
import RoofEditor from "./components/RoofEditor";
import RailOptions from "./components/RailOptions";
import BraceEditor from "./components/BraceEditor";
import BedPlacement from "./components/BedPlacement";
import { PanelEditor, LegEditor } from "./components/GeometryEditor";
import type { EditMode } from "./components/Scene";
const Scene = lazy(() => import("./components/Scene"));
function App() {
  const [project, setProject] = useState<Project>(loadProject);
  const [selected, setSelected] = useState(project.beds[0].id);
  const bed = project.beds.find((b) => b.id === selected) || project.beds[0];
  const [tab, setTab] = useState<
    "materials" | "layout" | "legs" | "braces" | "placement"
  >("materials");
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState("");
  const [saveState, setSaveState] = useState(true);
  const [scope, setScope] = useState<"bed" | "project">("bed");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [settings, setSettings] = useState<"layout" | "structure" | "roof">(
    "layout",
  );
  const [editMode, setEditMode] = useState<EditMode>("navigate");
  const [panelSelection, setPanelSelection] = useState("0:0");
  const [supportSelection, setSupportSelection] = useState("");
  const [braceFirst, setBraceFirst] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const importPending = useRef<Project | null>(null);
  const [importName, setImportName] = useState("");
  const materials = scope === "bed" ? calculate(bed) : aggregate(project);
  const totalPanels = project.beds.reduce((n, b) => n + activeCount(b), 0);
  const totalLegs = project.beds.reduce((n, b) => n + supports(b).length, 0);
  const currentPose = bedPose(
    project,
    project.beds.findIndex((b) => b.id === bed.id),
  );
  const dims = dimensions(bed);
  const geometry = supports(bed);
  const [selectedRow, selectedColumn] = panelSelection.split(":").map(Number);
  const selectedPanel =
    selectedRow < bed.rows && selectedColumn < bed.columns
      ? panelSelection
      : "0:0";
  const selectedSupport =
    geometry.find((s) => s.id === supportSelection)?.id || geometry[0]?.id;
  const totalArea = project.beds.reduce(
    (n, b) => n + activeCount(b) * b.panelWidth * b.panelLength,
    0,
  );
  useEffect(() => {
    setSaveState(false);
    const t = setTimeout(() => {
      try {
        saveProject(project);
        setSaveState(true);
      } catch {
        setToast(
          "No se pudo guardar en este navegador. Descarga una copia JSON.",
        );
      }
    }, 450);
    return () => clearTimeout(t);
  }, [project]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  function changeProject(fn: (p: Project) => Project) {
    setProject((p) => ({ ...fn(p), updatedAt: new Date().toISOString() }));
  }
  function patch(patch: Partial<Bed>) {
    changeProject((p) => ({
      ...p,
      beds: p.beds.map((b) => (b.id === bed.id ? { ...b, ...patch } : b)),
    }));
  }
  function resize(key: "rows" | "columns", n: number) {
    patch({
      [key]: n,
      panelRotations: Object.fromEntries(
        Object.entries(bed.panelRotations || {}).filter(([cell]) => {
          const [r, c] = cell.split(":").map(Number);
          return (
            r < (key === "rows" ? n : bed.rows) &&
            c < (key === "columns" ? n : bed.columns)
          );
        }),
      ),
      removed: bed.removed.filter((k) => {
        const [r, c] = k.split(":").map(Number);
        return (
          r < (key === "rows" ? n : bed.rows) &&
          c < (key === "columns" ? n : bed.columns)
        );
      }),
    });
  }
  function toggle(r: number, c: number) {
    const k = panelKey(r, c);
    patch({
      removed: bed.removed.includes(k)
        ? bed.removed.filter((x) => x !== k)
        : [...bed.removed, k],
    });
  }
  function selectPanel(key: string) {
    setPanelSelection(key);
    setEditMode("panel");
    setTab("layout");
  }
  function rotatePanel(angle: number) {
    const rotations = { ...bed.panelRotations };
    if (angle === 0) delete rotations[selectedPanel];
    else rotations[selectedPanel] = angle;
    patch({ panelRotations: rotations });
    setEditMode("panel");
  }
  function selectSupport(id: string) {
    setSupportSelection(id);
    setEditMode("support");
    setTab("legs");
  }
  function moveSupport(id: string, x: number, z: number) {
    setEditMode("support");
    setSupportSelection(id);
    changeProject((p) => ({
      ...p,
      beds: p.beds.map((b) =>
        b.id === bed.id
          ? {
              ...b,
              supportOverrides: {
                ...b.supportOverrides,
                [id]: snapSupport(b, id, x, z),
              },
            }
          : b,
      ),
    }));
  }
  function setSupportTrack(id: string, trackId: string) {
    const leg = geometry.find((s) => s.id === id);
    if (!leg) return;
    patch({
      supportOverrides: {
        ...bed.supportOverrides,
        [id]: snapSupport(bed, id, leg.x, leg.z, trackId),
      },
    });
    setEditMode("support");
  }
  function selectBed(id: string) {
    setSelected(id);
    setBraceFirst("");
    setSupportSelection("");
  }
  function moveBed(id: string, x: number, z: number) {
    changeProject((p) => ({
      ...p,
      beds: p.beds.map((b) =>
        b.id === id
          ? {
              ...b,
              position: {
                x: Math.max(-200, Math.min(200, x)),
                z: Math.max(-200, Math.min(200, z)),
              },
            }
          : b,
      ),
    }));
  }
  function addBrace(from: string, to: string) {
    const a = geometry.find((s) => s.id === from),
      b = geometry.find((s) => s.id === to),
      axis = a && b ? braceAxis(a, b) : undefined;
    if (!axis) {
      setToast("Selecciona dos patas distintas alineadas en E–O o N–S.");
      return;
    }
    const connections = braceConnections(bed);
    if (
      connections.some((c) => c.fromId === from && c.toId === to && !c.reverse)
    ) {
      setToast("Ya existe ese contraviento.");
      return;
    }
    patch({
      manualBraces: [
        ...connections,
        { id: crypto.randomUUID(), fromId: from, toId: to, axis },
      ],
    });
    setBraceFirst("");
  }
  function pickBrace(id: string) {
    if (!braceFirst) {
      setBraceFirst(id);
      setTab("braces");
    } else if (braceFirst === id) setBraceFirst("");
    else addBrace(braceFirst, id);
  }
  function prepareNewBed(b: Bed) {
    const bounds = projectBounds(project),
      local = projectBounds({
        ...project,
        beds: [{ ...b, position: { x: 0, z: 0 } }],
      });
    return {
      ...b,
      position: {
        x: Math.min(200, bounds.maxX + 2 - local.minX),
        z: bounds.centerZ,
      },
    };
  }
  function resetSupport(id: string) {
    const next = { ...bed.supportOverrides };
    delete next[id];
    patch({ supportOverrides: next });
  }
  function changeMode(mode: EditMode) {
    setEditMode(mode);
    if (mode === "support") setTab("legs");
    else if (mode === "brace") setTab("braces");
    else if (mode === "bed") setTab("placement");
    else if (mode === "panel" || mode === "remove") setTab("layout");
  }
  function addBed() {
    if (project.beds.length >= 30) {
      setToast("Máximo 30 camas por proyecto.");
      return;
    }
    const b = prepareNewBed(createBed(project.beds.length + 1));
    changeProject((p) => ({ ...p, beds: [...p.beds, b] }));
    selectBed(b.id);
  }
  function duplicate() {
    if (project.beds.length >= 30) {
      setToast("Máximo 30 camas por proyecto.");
      return;
    }
    const b = prepareNewBed({
      ...structuredClone(bed),
      id: crypto.randomUUID(),
      name: `${bed.name} · copia`,
    });
    changeProject((p) => ({ ...p, beds: [...p.beds, b] }));
    selectBed(b.id);
    setToast("Cama duplicada.");
  }
  async function exportFile(kind: "pdf" | "word" | "excel") {
    setMenu(false);
    setBusy(kind);
    try {
      const { exportExcel, exportPDF, exportWord } =
        await import("./lib/export");
      let img: string | undefined;
      try {
        img = document.querySelector("canvas")?.toDataURL("image/png");
      } catch {
        /* Imagen opcional. */
      }
      if (kind === "excel") await exportExcel(project);
      if (kind === "pdf") await exportPDF(project, img, bed.name);
      if (kind === "word") await exportWord(project, img, bed.name);
      setToast("Reporte exportado con materiales, medidas y ubicaciones.");
    } catch (e) {
      setToast(
        `No se pudo exportar: ${e instanceof Error ? e.message : "error desconocido"}`,
      );
    } finally {
      setBusy("");
    }
  }
  function backup() {
    download(
      new Blob([JSON.stringify(project, null, 2)], {
        type: "application/json",
      }),
      `${safeName(project.name)}.json`,
    );
    setToast("Copia de proyecto descargada.");
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 8_000_000) throw new Error("El archivo excede 8 MB.");
      const next = validateProject(JSON.parse(await file.text()));
      importPending.current = next;
      setImportName(next.name);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "No se pudo leer el proyecto.");
    }
    if (fileInput.current) fileInput.current.value = "";
  }
  function savePreset(panel: PanelPreset) {
    changeProject((p) => ({
      ...p,
      panelLibrary: [
        ...(p.panelLibrary || []).filter((v) => v.id !== panel.id),
        panel,
      ],
      beds: p.beds.map((b) =>
        b.panelPresetId === panel.id
          ? { ...b, panelWidth: panel.width, panelLength: panel.length }
          : b,
      ),
    }));
  }
  function deletePreset(id: string) {
    changeProject((p) => ({
      ...p,
      panelLibrary: (p.panelLibrary || []).filter((v) => v.id !== id),
      beds: p.beds.map((b) =>
        b.panelPresetId === id ? { ...b, panelPresetId: undefined } : b,
      ),
    }));
  }
  function setOverride(id: MaterialId, n: number) {
    if (Number.isInteger(n) && n >= 0 && n <= 100000)
      patch({ overrides: { ...bed.overrides, [id]: n } });
  }
  function restoreOverride(id: MaterialId) {
    const next = { ...bed.overrides };
    delete next[id];
    if (id === "rail") {
      delete next.railEW;
      delete next.railNS;
    }
    patch({ overrides: next });
  }
  const requiredManual = Object.keys(bed.overrides).length;
  return (
    <>
      <header className="app-header">
        <a className="brand" href="#" aria-label="Unirack Studio inicio">
          <span className="brand-icon">
            <Grid2X2 size={24} />
          </span>
          <span>
            UNIRACK<span className="brand-divider">/</span>
            <b>STUDIO</b>
          </span>
        </a>
        <div className="header-center">
          <span className="environment-dot" /> ESPACIO DE DISEÑO SOLAR
        </div>
        <div className="header-right">
          <span className="version-tag">BETA 03</span>
          <div className="avatar">GS</div>
        </div>
      </header>
      <div className="project-bar">
        <div className="breadcrumbs">
          <FolderOpen size={16} />
          <span>Mis proyectos</span>
          <ChevronRight size={14} />
          <input
            aria-label="Nombre del proyecto"
            value={project.name}
            maxLength={80}
            onChange={(e) =>
              changeProject((p) => ({ ...p, name: e.target.value }))
            }
          />
          <span className="save-indicator">
            {saveState ? (
              <CheckCircle2 size={13} />
            ) : (
              <LoaderCircle size={13} />
            )}
            <span>{saveState ? "Guardado localmente" : "Guardando…"}</span>
          </span>
        </div>
        <div className="project-actions">
          <button
            className="button subtle"
            onClick={() => fileInput.current?.click()}
          >
            <ArrowUpFromLine size={15} />
            <span>Abrir</span>
          </button>
          <button className="button outline" onClick={backup}>
            <Save size={15} />
            <span>Guardar proyecto</span>
          </button>
          <div className="export-wrapper">
            <button
              className="button primary"
              onClick={() => setMenu(!menu)}
              disabled={!!busy}
            >
              {busy ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <ArrowDownToLine size={16} />
              )}{" "}
              Exportar <ChevronDown size={14} />
            </button>
            {menu && (
              <>
                <button
                  className="menu-dismiss"
                  aria-label="Cerrar exportación"
                  onClick={() => setMenu(false)}
                />
                <div className="export-menu">
                  <small>EXPORTAR PROYECTO COMPLETO</small>
                  <button onClick={() => void exportFile("pdf")}>
                    <FileText size={17} />
                    <span>
                      Documento PDF<small>Reporte listo para compartir</small>
                    </span>
                    <span className="file-tag">.PDF</span>
                  </button>
                  <button onClick={() => void exportFile("word")}>
                    <FileText size={17} />
                    <span>
                      Documento Word<small>Reporte editable</small>
                    </span>
                    <span className="file-tag">.DOCX</span>
                  </button>
                  <button onClick={() => void exportFile("excel")}>
                    <FileSpreadsheet size={17} />
                    <span>
                      Libro de Excel<small>Materiales, camas y patas</small>
                    </span>
                    <span className="file-tag">.XLSX</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <main className="main">
        <div className="page-title">
          <div>
            <div className="eyebrow">
              <span /> PLANIFICA. AJUSTA. CONSTRUYE.
            </div>
            <h1>
              Tu estructura, a tu medida<span>.</span>
            </h1>
            <p>Diseña tus camas de paneles y lleva el control de cada pieza.</p>
          </div>
        </div>
        <section className="stats">
          <div className="stat">
            <div>
              <span>Paneles en el proyecto</span>
              <strong>
                {totalPanels}
                <small>paneles</small>
              </strong>
            </div>
            <span className="stat-icon">
              <Grid2X2 size={21} />
            </span>
            <small className="stat-foot">
              {project.beds.length}{" "}
              {project.beds.length === 1
                ? "cama configurada"
                : "camas configuradas"}
            </small>
          </div>
          <div className="stat">
            <div>
              <span>Superficie de paneles</span>
              <strong>
                {totalArea.toFixed(2)}
                <small>m²</small>
              </strong>
            </div>
            <span className="stat-icon">
              <Layers size={21} />
            </span>
            <small className="stat-foot">Área neta de paneles activos</small>
          </div>
          <div className="stat">
            <div>
              <span>Inclinación seleccionada</span>
              <strong>
                {bed.angle}
                <small>grados</small>
              </strong>
            </div>
            <span className="stat-icon">
              <Triangle size={21} />
            </span>
            <small className="stat-foot">
              {bed.name} · Ajuste independiente
            </small>
          </div>
          <div className="stat">
            <div>
              <span>Camas en el techo</span>
              <strong>
                {project.beds.length}
                <small>camas</small>
              </strong>
            </div>
            <span className="stat-icon">
              <Box size={21} />
            </span>
            <small className="stat-foot">
              {totalLegs} patas en el proyecto
            </small>
          </div>
        </section>
        <div className="workspace">
          <aside className="sidebar">
            <div className="sidebar-heading">
              <div>
                <SlidersHorizontal size={18} />
                <h2>Configuración</h2>
              </div>
              <span className="tiny-tag">EN VIVO</span>
            </div>
            <div className="bed-section">
              <div className="label-row">
                <label htmlFor="bed-select">CAMAS DEL PROYECTO</label>
                <button
                  className="icon-button"
                  title="Agregar cama"
                  onClick={addBed}
                >
                  <Plus size={16} />
                </button>
              </div>
              <select
                id="bed-select"
                value={bed.id}
                onChange={(e) => selectBed(e.target.value)}
              >
                {project.beds.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} · {activeCount(b)} paneles
                  </option>
                ))}
              </select>
              <div className="bed-name-row">
                <input
                  aria-label="Nombre de la cama"
                  value={bed.name}
                  maxLength={50}
                  onChange={(e) => patch({ name: e.target.value })}
                />
                <button
                  className="icon-button"
                  title="Duplicar cama"
                  onClick={duplicate}
                >
                  <Copy size={14} />
                </button>
                <button
                  className="icon-button"
                  title="Eliminar cama"
                  disabled={project.beds.length === 1}
                  onClick={() => {
                    const next = project.beds.filter((b) => b.id !== bed.id);
                    changeProject((p) => ({ ...p, beds: next }));
                    selectBed(next[0].id);
                    setToast(
                      "Cama eliminada. Puedes recuperar una copia guardada del proyecto.",
                    );
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="settings-tabs">
              <button
                className={settings === "layout" ? "active" : ""}
                onClick={() => setSettings("layout")}
              >
                <Grid2X2 size={14} /> Distribución
              </button>
              <button
                className={settings === "structure" ? "active" : ""}
                onClick={() => setSettings("structure")}
              >
                <Settings2 size={14} /> Estructura
              </button>
              <button
                className={settings === "roof" ? "active" : ""}
                onClick={() => setSettings("roof")}
              >
                <ImagePlus size={14} /> Techo
              </button>
            </div>
            {settings === "layout" ? (
              <div className="settings-content">
                <div className="section-label">DISTRIBUCIÓN DE LA CAMA</div>
                <div className="field-grid">
                  <Field
                    label="Filas"
                    value={bed.rows}
                    onChange={(n) => resize("rows", n)}
                    min={1}
                    max={6}
                    integer
                  />
                  <Field
                    label="Columnas"
                    value={bed.columns}
                    onChange={(n) => resize("columns", n)}
                    min={1}
                    max={10}
                    integer
                  />
                </div>
                <div className="layout-type">
                  <Grid2X2 size={16} />
                  <span>
                    Cama{" "}
                    {bed.rows === 1
                      ? "sencilla"
                      : bed.rows === 2
                        ? "doble"
                        : "múltiple"}
                  </span>
                  <b>
                    {bed.rows} × {bed.columns}
                  </b>
                </div>
                <div className="panel-library-select">
                  <div className="label-row">
                    <span>Modelo de panel</span>
                    <button
                      className="text-button"
                      onClick={() => setLibraryOpen(true)}
                    >
                      <BookOpen size={12} /> Biblioteca
                    </button>
                  </div>
                  <select
                    aria-label="Modelo de panel"
                    value={bed.panelPresetId || ""}
                    onChange={(e) => {
                      const preset = project.panelLibrary?.find(
                        (p) => p.id === e.target.value,
                      );
                      patch(
                        preset
                          ? {
                              panelPresetId: preset.id,
                              panelWidth: preset.width,
                              panelLength: preset.length,
                            }
                          : { panelPresetId: undefined },
                      );
                    }}
                  >
                    <option value="">Medidas personalizadas</option>
                    {project.panelLibrary?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="field">
                  <span>Orientación del panel</span>
                  <div className="segmented">
                    <button
                      className={bed.orientation === "portrait" ? "active" : ""}
                      onClick={() => patch({ orientation: "portrait" })}
                    >
                      <span className="portrait-icon" /> Vertical
                    </button>
                    <button
                      className={
                        bed.orientation === "landscape" ? "active" : ""
                      }
                      onClick={() => patch({ orientation: "landscape" })}
                    >
                      <span className="landscape-icon" /> Horizontal
                    </button>
                  </div>
                </label>
                <div className="field-grid">
                  <Field
                    label="Ancho del panel"
                    value={bed.panelWidth}
                    onChange={(n) =>
                      patch({ panelWidth: n, panelPresetId: undefined })
                    }
                    min={0.3}
                    max={3}
                    unit="m"
                  />
                  <Field
                    label="Largo del panel"
                    value={bed.panelLength}
                    onChange={(n) =>
                      patch({ panelLength: n, panelPresetId: undefined })
                    }
                    min={0.3}
                    max={4}
                    unit="m"
                  />
                </div>
                <Field
                  label="Separación entre paneles"
                  value={bed.gap * 1000}
                  onChange={(n) => patch({ gap: n / 1000 })}
                  min={5}
                  max={200}
                  step={1}
                  unit="mm"
                />
                <div className="divider" />
                <div className="angle-heading">
                  <span className="section-label">INCLINACIÓN</span>
                  <span className="angle-value">
                    {bed.angle}
                    <small>°</small>
                  </span>
                </div>
                <input
                  className="angle-slider"
                  aria-label="Inclinación de los paneles"
                  type="range"
                  min={0}
                  max={60}
                  step={1}
                  value={bed.angle}
                  onChange={(e) => patch({ angle: Number(e.target.value) })}
                />
                <div className="range-labels">
                  <span>0°</span>
                  <span>30°</span>
                  <span>60°</span>
                </div>
                <Field
                  label="Ángulo exacto"
                  value={bed.angle}
                  onChange={(n) => patch({ angle: n })}
                  min={0}
                  max={60}
                  step={0.1}
                  unit="°"
                />
                <div className="tip">
                  <Info size={15} />
                  <p>
                    Usa «Girar paneles» o «Quitar paneles» en el modelo. Al retirar una pieza se recalculan los materiales.
                  </p>
                </div>
              </div>
            ) : settings === "structure" ? (
              <div className="settings-content">
                <div className="section-label">RIELES Y APOYOS</div>
                <RailOptions bed={bed} onChange={patch} />
                <Field
                  label="Longitud comercial del riel"
                  value={bed.railLength}
                  onChange={(n) => patch({ railLength: n })}
                  min={0.5}
                  max={12}
                  unit="m"
                />
                <Field
                  label="Separación máxima entre patas E–O"
                  value={bed.supportSpacing}
                  onChange={(n) => patch({ supportSpacing: n })}
                  min={0.3}
                  max={3}
                  unit="m"
                />
                <Field
                  label="Separación entre patas N–S por fila"
                  value={Number(
                    (
                      bed.supportSpacingNS ?? dims.l * 0.6 * Math.cos(dims.rad)
                    ).toFixed(3),
                  )}
                  onChange={(n) => patch({ supportSpacingNS: n })}
                  min={0.1}
                  max={3}
                  unit="m"
                />
                <p className="help-text">
                  N–S es la distancia horizontal entre las dos líneas de patas
                  de cada fila. Si no cabe, se limita al fondo de esa fila menos
                  10 cm. En «Patas y bases» puedes editar cada separación
                  individual.
                </p>
                <div className="field-grid">
                  <Field
                    label="Altura frontal libre"
                    value={bed.frontHeight}
                    onChange={(n) => patch({ frontHeight: n })}
                    min={0.1}
                    max={3}
                    unit="m"
                  />
                  <Field
                    label="Sobrante para end clamp"
                    value={bed.overhang}
                    onChange={(n) => patch({ overhang: n })}
                    min={0}
                    max={1}
                    unit="m"
                  />
                </div>
                <div className="divider" />
                <div className="switch-row">
                  <div>
                    <b>Bases de concreto</b>
                    <small>Bloques sólidos bajo cada pata</small>
                  </div>
                  <button
                    role="switch"
                    aria-label="Bases de concreto"
                    aria-checked={bed.bases}
                    className={`switch ${bed.bases ? "on" : ""}`}
                    onClick={() => patch({ bases: !bed.bases })}
                  >
                    <span />
                  </button>
                </div>
                {bed.bases && (
                  <>
                    <div className="field-grid">
                      <Field
                        label="Ancho del bloque"
                        value={bed.baseWidth}
                        onChange={(n) => patch({ baseWidth: n })}
                        min={0.1}
                        max={2}
                        unit="m"
                      />
                      <Field
                        label="Fondo del bloque"
                        value={bed.baseDepth}
                        onChange={(n) => patch({ baseDepth: n })}
                        min={0.1}
                        max={2}
                        unit="m"
                      />
                    </div>
                    <Field
                      label="Altura del bloque"
                      value={bed.baseHeight}
                      onChange={(n) => patch({ baseHeight: n })}
                      min={0.05}
                      max={1}
                      unit="m"
                    />
                  </>
                )}
                <div className="tip">
                  <Info size={15} />
                  <p>
                    Las alturas de patas son geométricas, desde la base. El
                    tamaño de los bloques requiere cálculo estructural.
                  </p>
                </div>
              </div>
            ) : (
              <RoofEditor
                roof={project.roof}
                onChange={(roof) => changeProject((p) => ({ ...p, roof }))}
                onError={setToast}
                panelWidth={bed.panelWidth}
                panelLength={bed.panelLength}
              />
            )}
            <div className="sidebar-footer">
              <span className="environment-dot" /> Cálculo automático activado
            </div>
          </aside>
          <div className="design-area">
            <section className="model-card">
              <div className="card-heading">
                <div>
                  <span className="square-icon">
                    <Layers size={17} />
                  </span>
                  <h2>{bed.name}</h2>
                  <span className="neutral-badge">
                    {activeCount(bed)} paneles
                  </span>
                </div>
                <div>
                  <span className="model-label">MODELO INTERACTIVO</span>
                </div>
              </div>
              <Suspense
                fallback={
                  <div className="scene scene-fallback">
                    <LoaderCircle className="spin" /> Cargando vista 3D…
                  </div>
                }
              >
                <Scene
                  bed={bed}
                  onToggle={toggle}
                  project={project}
                  mode={editMode}
                  onModeChange={changeMode}
                  selectedPanel={selectedPanel}
                  selectedSupport={selectedSupport}
                  onSelectPanel={(r, c) => selectPanel(panelKey(r, c))}
                  onSelectSupport={selectSupport}
                  onMoveSupport={moveSupport}
                  onSelectBed={selectBed}
                  onMoveBed={moveBed}
                  braceFirst={braceFirst}
                  onBracePick={pickBrace}
                />
              </Suspense>
              <div className="model-info">
                <span>
                  <i className="legend-panel" /> Panel solar
                </span>
                <span>
                  <i className="legend-rail" /> Estructura
                </span>
                {bed.bases && (
                  <span>
                    <i className="legend-base" /> Concreto sólido
                  </span>
                )}
                <span className="model-footprint">
                  Huella:{" "}
                  <b>
                    {dims.width.toFixed(2)} × {dims.depth.toFixed(2)} m
                  </b>
                </span>
              </div>
            </section>
            <section className="detail-card">
              <div className="detail-tabs">
                {(
                  [
                    ["materials", "Materiales", Box],
                    ["layout", "Paneles", Grid2X2],
                    ["legs", "Patas y bases", Triangle],
                    ["braces", "Contravientos", Wind],
                    ["placement", "Acomodar camas", Move],
                  ] as const
                ).map(([id, label, Icon]) => (
                  <button
                    key={id}
                    className={tab === id ? "active" : ""}
                    onClick={() => {
                      setTab(id);
                      setEditMode(
                        id === "legs"
                          ? "support"
                          : id === "braces"
                            ? "brace"
                            : id === "placement"
                              ? "bed"
                              : id === "layout"
                                ? "panel"
                                : "navigate",
                      );
                    }}
                  >
                    <Icon size={16} />
                    {label}
                    {id === "materials" && (
                      <span>
                        {materials.filter((m) => m.quantity > 0).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {tab === "materials" && (
                <>
                  <div className="table-toolbar">
                    <div>
                      <h3>Lista de materiales</h3>
                      <p>
                        Modifica las cantidades finales para ajustar tu
                        proyecto.
                      </p>
                    </div>
                    <select
                      aria-label="Alcance de materiales"
                      value={scope}
                      onChange={(e) =>
                        setScope(e.target.value as "bed" | "project")
                      }
                    >
                      <option value="bed">Esta cama</option>
                      <option value="project">Todo el proyecto</option>
                    </select>
                  </div>
                  {scope === "project" && (
                    <div className="inline-note">
                      <Info size={14} /> Los totales suman todas las camas.
                      Selecciona una cama para editar cantidades.
                    </div>
                  )}
                  <div className="table-scroll">
                    <table className="material-table">
                      <thead>
                        <tr>
                          <th>MATERIAL / COMPONENTE</th>
                          <th>ORIGEN</th>
                          <th>CANTIDAD</th>
                        </tr>
                      </thead>
                      <tbody>
                        {materials.map((m, i) => (
                          <tr
                            key={m.id}
                            className={m.quantity === 0 ? "zero-row" : ""}
                          >
                            <td>
                              <div className="material-name">
                                <span
                                  className={`material-symbol symbol-${m.id}`}
                                >
                                  <Box size={17} />
                                </span>
                                <span>
                                  {m.name}
                                  <small>
                                    {m.id === "rail"
                                      ? `${scope === "project" ? "Longitud según cada cama" : `${bed.railLength.toFixed(2)} m / pieza`} · estructura y contravientos`
                                      : `Componente ${String(i + 1).padStart(2, "0")}`}
                                  </small>
                                </span>
                              </div>
                            </td>
                            <td>
                              <span
                                className={`origin-badge ${m.overridden ? "manual" : ""}`}
                              >
                                {m.overridden ? "Manual" : "Auto"}
                              </span>
                            </td>
                            <td>
                              <div className="quantity-input">
                                <input
                                  aria-label={`Cantidad ${m.name}`}
                                  type="number"
                                  min={0}
                                  max={100000}
                                  step={1}
                                  value={m.quantity}
                                  disabled={scope === "project"}
                                  onChange={(e) => {
                                    if (e.target.value !== "")
                                      setOverride(m.id, Number(e.target.value));
                                  }}
                                />
                                <span>{m.unit}</span>
                                {m.overridden && scope === "bed" && (
                                  <button
                                    title={`Restablecer ${m.name}`}
                                    onClick={() => restoreOverride(m.id)}
                                  >
                                    <RotateCcw size={12} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="table-footer">
                    <span>
                      <CheckCircle2 size={14} />
                      {requiredManual
                        ? `${requiredManual} ajustes manuales en esta cama`
                        : "Cantidades actualizadas automáticamente"}
                    </span>
                    <span>
                      {materials.reduce((n, m) => n + m.quantity, 0)} piezas
                      registradas
                    </span>
                  </div>
                  {requiredManual > 0 && (
                    <button
                      className="text-button reset-all"
                      onClick={() => patch({ overrides: {} })}
                    >
                      <RotateCcw size={13} /> Restablecer cantidades automáticas
                      de esta cama
                    </button>
                  )}
                </>
              )}
              {tab === "layout" && (
                <div className="panel-editor">
                  <PanelEditor
                    bed={bed}
                    selected={selectedPanel}
                    onSelect={selectPanel}
                    onRotate={rotatePanel}
                    onToggle={() => {
                      const [r, c] = selectedPanel.split(":").map(Number);
                      toggle(r, c);
                    }}
                  />
                  <div className="panel-mode">
                    <button
                      className={editMode === "remove" ? "active" : ""}
                      onClick={() => setEditMode("remove")}
                    >
                      Quitar / reponer
                    </button>
                    <button
                      className={editMode === "panel" ? "active" : ""}
                      onClick={() => setEditMode("panel")}
                    >
                      Seleccionar para girar
                    </button>
                  </div>
                  <div className="table-toolbar">
                    <div>
                      <h3>Distribución de paneles</h3>
                      <p>
                        Selecciona el modo para quitar, reponer o girar cada
                        panel.
                      </p>
                    </div>
                    <button
                      className="button outline"
                      onClick={() => patch({ removed: [] })}
                    >
                      <RotateCcw size={14} /> Reponer todos
                    </button>
                  </div>
                  <div
                    className="panel-grid"
                    style={{
                      gridTemplateColumns: `repeat(${bed.columns},minmax(40px,1fr))`,
                    }}
                  >
                    {Array.from({ length: bed.rows }, (_, r) =>
                      Array.from({ length: bed.columns }, (_, c) => (
                        <button
                          aria-label={`Panel fila ${r + 1} columna ${c + 1}`}
                          aria-pressed={isActive(bed, r, c)}
                          className={
                            isActive(bed, r, c)
                              ? "panel-tile active"
                              : "panel-tile removed"
                          }
                          key={`${r}:${c}`}
                          onClick={() => {
                            if (editMode === "remove") toggle(r, c);
                            else selectPanel(panelKey(r, c));
                          }}
                        >
                          <Grid2X2
                            size={22}
                            style={{
                              transform: `rotate(${bed.panelRotations?.[panelKey(r, c)] ?? 0}deg)`,
                            }}
                          />
                          <span>
                            {r + 1}.{c + 1}
                          </span>
                          {!isActive(bed, r, c) && <Plus size={14} />}
                        </button>
                      )),
                    )}
                  </div>
                  <div className="layout-summary">
                    <span>
                      <b>{activeCount(bed)}</b> activos
                    </span>
                    <span>
                      <b>{bed.rows * bed.columns - activeCount(bed)}</b>{" "}
                      retirados
                    </span>
                    <span>
                      <b>{sections(bed).length}</b> tramos de cálculo
                    </span>
                  </div>
                </div>
              )}
              {tab === "legs" && (
                <div className="legs-tab">
                  <LegEditor
                    bed={bed}
                    selected={selectedSupport}
                    onSelect={selectSupport}
                    onMove={moveSupport}
                    onTrack={setSupportTrack}
                    onReset={resetSupport}
                    onResetAll={() => patch({ supportOverrides: {} })}
                  />
                  <div className="table-toolbar">
                    <div>
                      <h3>Despiece geométrico de patas</h3>
                      <p>
                        Alturas verticales sin descuentos de herrajes, desde la
                        cara superior de la base.
                      </p>
                    </div>
                    <span className="neutral-badge">
                      {geometry.length} patas
                    </span>
                  </div>
                  <div className="leg-stats">
                    <div>
                      <span>Frente de cama</span>
                      <b>{bed.frontHeight.toFixed(3)} m</b>
                    </div>
                    <div>
                      <span>Parte trasera</span>
                      <b>{dims.rearHeight.toFixed(3)} m</b>
                    </div>
                    <div>
                      <span>Bloques de concreto</span>
                      <b>
                        {bed.bases ? geometry.length : 0} <small>pzas.</small>
                      </b>
                    </div>
                    <div>
                      <span>Concreto geométrico</span>
                      <b>
                        {(bed.bases
                          ? geometry.length *
                            bed.baseWidth *
                            bed.baseDepth *
                            bed.baseHeight
                          : 0
                        ).toFixed(3)}{" "}
                        m³
                      </b>
                    </div>
                  </div>
                  <div className="table-scroll leg-scroll">
                    <table className="material-table">
                      <thead>
                        <tr>
                          <th>PATA</th>
                          <th>FILA</th>
                          <th>X / Z (m)</th>
                          <th>ALTURA (m)</th>
                          <th>BASE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {geometry.map((s, i) => (
                          <tr
                            key={s.id}
                            className={
                              s.id === selectedSupport ? "selected-leg-row" : ""
                            }
                            onClick={() => selectSupport(s.id)}
                          >
                            <td>
                              <button
                                className="text-button"
                                aria-label={`Seleccionar pata ${i + 1}`}
                                onClick={() => selectSupport(s.id)}
                              >
                                P-{String(i + 1).padStart(2, "0")}
                                {s.moved ? " · manual" : ""}
                              </button>
                            </td>
                            <td>{s.row + 1}</td>
                            <td>
                              {s.x.toFixed(3)} / {s.z.toFixed(3)}
                            </td>
                            <td>
                              <b>{s.length.toFixed(3)}</b>
                            </td>
                            <td>
                              {bed.bases
                                ? `${bed.baseWidth} × ${bed.baseDepth} × ${bed.baseHeight} m`
                                : "Sin bloque"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {tab === "braces" && (
                <BraceEditor
                  bed={bed}
                  first={braceFirst}
                  onFirst={setBraceFirst}
                  onAdd={addBrace}
                  onRemove={(id) =>
                    patch({
                      manualBraces: braceConnections(bed).filter(
                        (c) => c.id !== id,
                      ),
                    })
                  }
                  onReverse={(id) =>
                    patch({
                      manualBraces: braceConnections(bed).map((c) =>
                        c.id === id ? { ...c, reverse: !c.reverse } : c,
                      ),
                    })
                  }
                  onMode={() => changeMode("brace")}
                />
              )}
              {tab === "placement" && (
                <BedPlacement
                  bed={bed}
                  pose={currentPose}
                  onMove={(x, z) => moveBed(bed.id, x, z)}
                  onRotate={(azimuth) => patch({ azimuth })}
                  onDrag={() => changeMode("bed")}
                />
              )}
            </section>
          </div>
        </div>
        <section className="project-meta">
          <div>
            <Leaf size={21} />
            <span>
              Menos improvisación.
              <br />
              <b>Más claridad en cada instalación.</b>
            </span>
          </div>
          <label>
            CLIENTE / OBRA
            <input
              aria-label="Cliente u obra"
              placeholder="Añade el nombre del cliente o la obra"
              value={project.customer}
              maxLength={150}
              onChange={(e) =>
                changeProject((p) => ({ ...p, customer: e.target.value }))
              }
            />
          </label>
          <p>
            <Info size={14} /> Proyecto guardado en este navegador.
            <br />
            Descarga una copia para conservar tus cambios.
          </p>
        </section>
        <footer className="app-footer">
          <span>
            UNIRACK STUDIO <b>© {new Date().getFullYear()}</b>
          </span>
          <span>
            Diseñado para planear mejor.
            <Sun size={14} />
          </span>
        </footer>
      </main>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => void importFile(e.target.files?.[0])}
      />
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          <span>{toast}</span>
          <button aria-label="Cerrar aviso" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {libraryOpen && (
        <PanelLibrary
          library={project.panelLibrary || []}
          width={bed.panelWidth}
          length={bed.panelLength}
          onSave={savePreset}
          onDelete={deletePreset}
          onClose={() => setLibraryOpen(false)}
        />
      )}
      {importName && (
        <div className="modal-backdrop">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-title"
          >
            <FolderOpen size={28} />
            <h2 id="import-title">Abrir «{importName}»</h2>
            <p>
              Se reemplazará el proyecto que ves en pantalla. Guarda una copia
              si quieres conservarlo.
            </p>
            <div>
              <button className="button outline" onClick={backup}>
                Descargar copia actual
              </button>
              <button
                className="button subtle"
                onClick={() => {
                  setImportName("");
                  importPending.current = null;
                }}
              >
                Cancelar
              </button>
              <button
                className="button primary"
                onClick={() => {
                  if (importPending.current) {
                    setProject(importPending.current);
                    selectBed(importPending.current.beds[0].id);
                  }
                  setImportName("");
                  importPending.current = null;
                  setToast("Proyecto abierto.");
                }}
              >
                <Check size={15} /> Abrir proyecto
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
export default App;
