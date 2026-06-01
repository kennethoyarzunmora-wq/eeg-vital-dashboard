const state = {
  data: null,
  currentCaseId: null,
  currentDatabaseCaseId: null,
  savedDatabaseCases: [],
  compactClinicalView: true,
  visibleSignals: new Set(["qCON", "qNOX", "BSR", "EMG", "SQI"]),
  events: [],
  currentRange: null,
  dsa: {
    palette: "thermal",
    min: 0.62,
    max: 0.85,
    clean: false,
  },
  patient: {
    age: "",
    gender: "",
    height: "",
    weight: "",
    pkpdModel: "",
  },
};

const colors = {
  qCON: "#24d2ff",
  qNOX: "#ffbf4d",
  BSR: "#ff4d6d",
  EMG: "#d946ef",
  SQI: "#67e8a5",
  Delta: "#38bdf8",
  Theta: "#a78bfa",
  Alpha: "#67e8a5",
  Beta: "#facc15",
  Gamma: "#fb7185",
};

const clinicalSignals = ["qCON", "qNOX", "BSR", "EMG", "SQI"];
const clinicalDomains = {
  dsa: [0.57, 1],
  qCON: [0.462, 0.552],
  qNOX: [0.348, 0.438],
  BSR: [0.234, 0.324],
  EMG: [0.12, 0.21],
  SQI: [0.006, 0.096],
};

const dsaColorScale = [
  [0, "#02040a"],
  [0.08, "#071326"],
  [0.18, "#0b2a78"],
  [0.3, "#0068c9"],
  [0.42, "#00c7e6"],
  [0.54, "#33d17a"],
  [0.66, "#f7f23b"],
  [0.78, "#ff9a16"],
  [0.9, "#f43f1a"],
  [0.97, "#d0008b"],
  [1, "#fff7ff"],
];

const dsaPalettes = {
  conoxLite: dsaColorScale,
  conoxHigh: [
    [0, "#000000"],
    [0.1, "#030a1a"],
    [0.22, "#002f8f"],
    [0.36, "#00a9ff"],
    [0.5, "#00e676"],
    [0.64, "#ffff00"],
    [0.78, "#ff8c00"],
    [0.9, "#ff1f00"],
    [0.97, "#d400ff"],
    [1, "#ffffff"],
  ],
  thermal: [
    [0, "#050505"],
    [0.2, "#18206f"],
    [0.4, "#2fb7ff"],
    [0.58, "#32d977"],
    [0.72, "#fff04a"],
    [0.86, "#ff7b00"],
    [1, "#ff1744"],
  ],
};

const isLocalDashboard = ["127.0.0.1", "localhost"].includes(window.location.hostname);
const defaultRemoteApiBase = atob("aHR0cHM6Ly9lZWctdml0YWwtZGFzaGJvYXJkLWFwaS5vbnJlbmRlci5jb20=");
const defaultApiBase = isLocalDashboard ? window.location.origin : defaultRemoteApiBase;
const databaseName = "eeg_vital_clinical_database";
const databaseVersion = 1;
const databaseStoreName = "cases";

const elements = {
  fileInput: document.getElementById("fileInput"),
  resetZoomButton: document.getElementById("resetZoomButton"),
  clearButton: document.getElementById("clearButton"),
  exportButton: document.getElementById("exportButton"),
  printButton: document.getElementById("printButton"),
  exportDatabaseButton: document.getElementById("exportDatabaseButton"),
  applyRangeButton: document.getElementById("applyRangeButton"),
  applyDsaButton: document.getElementById("applyDsaButton"),
  paletteSelect: document.getElementById("paletteSelect"),
  powerMin: document.getElementById("powerMin"),
  powerMax: document.getElementById("powerMax"),
  cleanDsaToggle: document.getElementById("cleanDsaToggle"),
  rangeStart: document.getElementById("rangeStart"),
  rangeEnd: document.getElementById("rangeEnd"),
  message: document.getElementById("message"),
  dsaStatus: document.getElementById("dsaStatus"),
  eventType: document.getElementById("eventType"),
  eventTime: document.getElementById("eventTime"),
  eventDescription: document.getElementById("eventDescription"),
  addEventButton: document.getElementById("addEventButton"),
  eventList: document.getElementById("eventList"),
  analysisList: document.getElementById("analysisList"),
  patientAge: document.getElementById("patientAge"),
  patientCode: document.getElementById("patientCode"),
  procedureDate: document.getElementById("procedureDate"),
  hospital: document.getElementById("hospital"),
  operatingRoom: document.getElementById("operatingRoom"),
  surgeryType: document.getElementById("surgeryType"),
  anesthesiaType: document.getElementById("anesthesiaType"),
  patientGender: document.getElementById("patientGender"),
  patientHeight: document.getElementById("patientHeight"),
  patientWeight: document.getElementById("patientWeight"),
  pkpdModel: document.getElementById("pkpdModel"),
  savePatientButton: document.getElementById("savePatientButton"),
  saveCaseButton: document.getElementById("saveCaseButton"),
  saveCommentsButton: document.getElementById("saveCommentsButton"),
  refreshCasesButton: document.getElementById("refreshCasesButton"),
  caseComments: document.getElementById("caseComments"),
  caseList: document.getElementById("caseList"),
  databaseSearch: document.getElementById("databaseSearch"),
  refreshDatabaseButton: document.getElementById("refreshDatabaseButton"),
  exportAllCasesButton: document.getElementById("exportAllCasesButton"),
  exportOneCaseButton: document.getElementById("exportOneCaseButton"),
  deleteDatabaseCaseButton: document.getElementById("deleteDatabaseCaseButton"),
  databaseCaseList: document.getElementById("databaseCaseList"),
  patientSummary: document.getElementById("patientSummary"),
  legendSummary: document.getElementById("legendSummary"),
};

document.addEventListener("DOMContentLoaded", () => {
  window.addEventListener("error", (event) => {
    showMessage(`Error de visualizacion: ${event.message}`);
  });
  window.addEventListener("unhandledrejection", (event) => {
    showMessage(`Error de proceso: ${event.reason?.message || event.reason || "desconocido"}`);
  });

  elements.fileInput.addEventListener("change", handleFileUpload);
  elements.resetZoomButton.addEventListener("click", resetZoom);
  elements.clearButton.addEventListener("click", clearDashboard);
  elements.exportButton.addEventListener("click", exportDashboardData);
  elements.printButton.addEventListener("click", printDashboard);
  elements.exportDatabaseButton.addEventListener("click", exportDatabaseToExcel);
  elements.applyRangeButton.addEventListener("click", applyManualRange);
  elements.applyDsaButton.addEventListener("click", applyDsaSettings);
  elements.cleanDsaToggle.addEventListener("change", () => {
    state.dsa.clean = elements.cleanDsaToggle.checked;
    renderDsa();
  });
  elements.addEventButton.addEventListener("click", addManualEvent);
  elements.savePatientButton.addEventListener("click", savePatientData);
  elements.saveCaseButton.addEventListener("click", saveCurrentCase);
  elements.saveCommentsButton.addEventListener("click", saveCaseComments);
  elements.refreshCasesButton.addEventListener("click", loadCaseList);
  elements.databaseSearch.addEventListener("input", renderDatabaseCaseList);
  elements.refreshDatabaseButton.addEventListener("click", loadSavedCases);
  elements.exportAllCasesButton.addEventListener("click", exportDatabaseToExcel);
  elements.exportOneCaseButton.addEventListener("click", exportCurrentDatabaseCaseToExcel);
  elements.deleteDatabaseCaseButton.addEventListener("click", deleteCurrentDatabaseCase);

  document.querySelectorAll("[data-signal]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const signal = event.target.dataset.signal;
      event.target.checked ? state.visibleSignals.add(signal) : state.visibleSignals.delete(signal);
      renderIndices();
    });
  });

  clearDashboard({ silent: true });
  loadCaseList();
  loadSavedCases();
});

async function handleFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (isLocalDashboard && /\.(vital|json|csv)$/i.test(file.name)) {
    updateFileName(file.name);
    await importAndSaveCase(file);
    return;
  }

  if (file.name.toLowerCase().endsWith(".vital")) {
    updateFileName(file.name);
    await uploadVitalFile(file);
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    loadDashboard(parsed, file.name);
  } catch (error) {
    showMessage(`No se pudo leer el JSON: ${error.message}`);
  }
}

async function uploadVitalFile(file) {
  const apiBase = getApiBase();
  showMessage("Procesando archivo .vital en Python. Esto puede tardar algunos minutos segun el tamano del registro.");
  setLoading(true);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("fs", "128");
  formData.append("interval", "1");

  try {
    const response = await fetch(`${apiBase}/api/convert-vital`, {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();
    if (!response.ok) {
      const logHint = payload.log ? ` Log: ${payload.log}` : "";
      throw new Error(`${payload.error || "El servidor local no pudo convertir el archivo."}${logHint}`);
    }
    loadDashboard(payload, file.name);
    showMessage("Archivo .vital convertido y cargado correctamente.");
  } catch (error) {
    showMessage(
      `No se pudo procesar el .vital. Revisa que el servidor Python este activo. Detalle: ${error.message}`,
    );
  } finally {
    setLoading(false);
  }
}

async function importAndSaveCase(file) {
  const apiBase = getApiBase();
  showMessage(`Importando y guardando caso local (${file.name}).`);
  setLoading(true);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("metadata", JSON.stringify(getCaseMetadata()));
  formData.append("fs", "128");
  formData.append("interval", "1");

  try {
    const response = await fetch(`${apiBase}/api/import-case`, {
      method: "POST",
      body: formData,
    });
    const record = await response.json();
    if (!response.ok) throw new Error(record.error || "No se pudo importar el caso.");
    await openCase(record.id, { silent: true, saveToDatabase: true });
    await loadCaseList();
    showMessage("Caso importado, analizado y guardado localmente.");
  } catch (error) {
    showMessage(`No se pudo importar el caso local. Detalle: ${error.message}`);
  } finally {
    setLoading(false);
  }
}

function getCaseMetadata() {
  return {
    patient_code: elements.patientCode.value,
    procedure_date: elements.procedureDate.value,
    surgery_type: elements.surgeryType.value,
    hospital: elements.hospital.value,
    operating_room: elements.operatingRoom.value,
    anesthesia_type: elements.anesthesiaType.value,
    comments: elements.caseComments.value,
  };
}

function setLoading(isLoading) {
  elements.fileInput.disabled = isLoading;
  elements.resetZoomButton.disabled = isLoading;
  elements.applyDsaButton.disabled = isLoading;
  elements.clearButton.disabled = isLoading;
  elements.exportButton.disabled = isLoading;
  elements.exportDatabaseButton.disabled = isLoading;
  elements.printButton.disabled = isLoading;
  elements.saveCaseButton.disabled = isLoading;
  elements.saveCommentsButton.disabled = isLoading;
}

function getApiBase() {
  return sanitizeApiBase(defaultApiBase);
}

function sanitizeApiBase(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function loadDashboard(rawData, fileName, options = {}) {
  state.data = normalizeData(rawData);
  state.currentCaseId = null;
  state.currentDatabaseCaseId = options.databaseCaseId || null;
  state.events = [...state.data.events];
  state.currentRange = null;
  resetDsaSettings({ clean: false });
  loadPatientFromMetadata();
  updateFileName(fileName);
  updateSummary();
  updateRangeInputs();
  renderPatientSummary();
  renderAll();
  showMessage("");
  if (!options.skipDatabaseSave) {
    saveCurrentStateToDatabase(fileName, { silent: true });
  }
}

function loadPatientFromMetadata() {
  const patient = state.data?.metadata?.patient || {};
  state.patient = {
    age: patient.age || "",
    gender: patient.gender || "",
    height: patient.height || "",
    weight: patient.weight || "",
    pkpdModel: patient.pkpdModel || state.data?.metadata?.pkpd_model || "",
  };
  elements.patientAge.value = state.patient.age;
  elements.patientGender.value = state.patient.gender;
  elements.patientHeight.value = state.patient.height;
  elements.patientWeight.value = state.patient.weight;
  elements.pkpdModel.value = state.patient.pkpdModel;
}

function normalizeData(raw) {
  const metadata = raw.metadata || {};
  const dsa = raw.dsa || {};
  const indices = raw.indices || {};
  const time = toNumberArray(raw.time || dsa.times || indices.time || []);
  const dsaTimes = toNumberArray(dsa.times || time);
  const frequencies = toNumberArray(dsa.frequencies || []);
  const power = Array.isArray(dsa.power) ? dsa.power.map(toNullableNumberArray) : [];

  return {
    metadata: {
      patient_id: metadata.patient_id || metadata.patientId || "anonimized",
      surgery_date: metadata.surgery_date || metadata.surgeryDate || "",
      start_time: metadata.start_time || metadata.startTime || "",
      end_time: metadata.end_time || metadata.endTime || "",
      sampling_rate: metadata.sampling_rate || metadata.samplingRate || metadata.fs || "",
      device: metadata.device || metadata.monitor || "Desconocido",
      dsa_source: metadata.dsa_source || metadata.dsaSource || "",
      patient: metadata.patient || {},
      pkpd_model: metadata.pkpd_model || metadata.pkpdModel || "",
    },
    time,
    eeg: toNullableNumberArray(raw.eeg || raw.EEG || raw.eeg_raw || []),
    dsa: { frequencies, times: dsaTimes, power },
    indices: normalizeIndices(indices, time),
    events: Array.isArray(raw.events) ? raw.events.map(normalizeEvent).filter(Boolean) : [],
  };
}

function normalizeIndices(indices, fallbackTime) {
  const output = {};
  ["qCON", "qNOX", "BSR", "EMG", "SQI"].forEach((key) => {
    const aliases = [key, key.toLowerCase(), key.replace("q", "q_"), key.replace("q", "Q")];
    const values = aliases.map((name) => indices[name]).find(Array.isArray) || [];
    output[key] = toNullableNumberArray(values);
  });
  output.time = toNumberArray(indices.time || indices.times || fallbackTime);
  return output;
}

function normalizeEvent(event) {
  if (!event) return null;
  const time = Number(event.time ?? event.minute ?? event.t);
  if (!Number.isFinite(time)) return null;
  return {
    label: String(event.label || event.type || "evento"),
    time,
    description: String(event.description || event.descripcion || ""),
    user: String(event.user || event.usuario || ""),
    registered_at: event.registered_at || event.timestamp_registro || new Date().toISOString(),
  };
}

function toNumberArray(values) {
  if (!Array.isArray(values)) return [];
  return values.map(Number).filter((value) => Number.isFinite(value));
}

function toNullableNumberArray(values) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  });
}

function updateFileName(fileName) {
  document.getElementById("fileName").textContent = fileName;
}

function updateSummary() {
  const { data } = state;
  const maxTime = getMaxTime(data);
  document.getElementById("duration").textContent = maxTime ? `${formatNumber(maxTime)} min` : "--";
  document.getElementById("startTime").textContent = data.metadata.start_time || "--";
  document.getElementById("endTime").textContent = data.metadata.end_time || "--";
  document.getElementById("samplingRate").textContent = data.metadata.sampling_rate
    ? `${data.metadata.sampling_rate} Hz`
    : "--";
  document.getElementById("device").textContent = data.metadata.device || "--";
}

function updateRangeInputs() {
  const maxTime = Math.ceil(getMaxTime(state.data) || 60);
  elements.rangeStart.value = 0;
  elements.rangeEnd.value = maxTime;
  elements.rangeEnd.max = maxTime;
}

function getMaxTime(data) {
  const candidates = [data.time, data.dsa.times, data.indices.time].flat().filter(Number.isFinite);
  return candidates.length ? Math.max(...candidates) : 0;
}

function renderAll() {
  try {
    renderDsa();
    renderBands();
    renderIndices();
    renderEvents();
    renderAnalysis();
    renderLegendSummary();
    requestAnimationFrame(resizeCharts);
  } catch (error) {
    showMessage(`No se pudo dibujar el dashboard: ${error.message}`);
  }
}

function renderDsa() {
  if (!state.data) {
    elements.dsaStatus.textContent = "Sin datos";
    Plotly.purge("dsaChart");
    return;
  }
  const { dsa } = state.data;
  if (!dsa.times.length || !dsa.frequencies.length || !dsa.power.length) {
    elements.dsaStatus.textContent = "DSA no disponible";
    Plotly.purge("dsaChart");
    return;
  }

  const sourceLabel = state.data.metadata.dsa_source === "native" ? "DSA nativo" : "DSA reconstruido desde EEG";
  elements.dsaStatus.textContent = `${sourceLabel} · ${dsa.frequencies[0]}-${dsa.frequencies.at(-1)} Hz`;
  const shapes = state.dsa.clean ? [] : buildShapes();
  const annotations = state.dsa.clean ? [] : buildAnnotations(state.compactClinicalView ? 0.995 : 1.02);
  const dsaMatrix = transposeIfNeeded(dsa.power, dsa.frequencies.length);
  const zRange = robustColorRange(dsaMatrix);
  const zmin = Number.isFinite(state.dsa.min) ? state.dsa.min : zRange.min;
  const zmax = Number.isFinite(state.dsa.max) && state.dsa.max > zmin ? state.dsa.max : zRange.max;
  const sefSeries = computeSef(dsa.frequencies, dsaMatrix, 0.95);
  const customData = dsaMatrix.map(() => sefSeries);
  const indexX = state.data.indices.time.length ? state.data.indices.time : state.data.time;
  const clinicalTraces = clinicalSignals
    .map((key, index) => ({ key, axisNumber: index + 2 }))
    .filter(({ key }) => state.visibleSignals.has(key) && state.data.indices[key]?.length)
    .map(({ key, axisNumber }) => {
      return {
        type: "scatter",
        mode: "lines",
        name: key,
        x: indexX,
        y: state.data.indices[key],
        xaxis: `x${axisNumber}`,
        yaxis: `y${axisNumber}`,
        line: { color: colors[key], width: 1.6 },
        hovertemplate: `<b>${key}</b><br>%{x:.1f} min<br>%{y:.1f}<extra></extra>`,
        hoverlabel: { bgcolor: "#ffffff", font: { color: "#000000", size: 13 } },
      };
    });

  Plotly.react(
    "dsaChart",
    [
      {
        type: "heatmap",
        x: dsa.times,
        y: dsa.frequencies,
        z: dsaMatrix,
        customdata: customData,
        colorscale: dsaPalettes[state.dsa.palette] || dsaPalettes.conoxLite,
        zmin,
        zmax,
        colorbar: {
          title: "SEF",
          len: state.compactClinicalView ? 0.45 : 1,
          y: state.compactClinicalView ? 0.762 : 0.5,
          yanchor: "middle",
          thickness: 10,
          tickfont: { color: "#91a2b8", size: 9 },
          titlefont: { color: "#edf4ff", size: 10 },
        },
        hoverlabel: { bgcolor: "#ffffff", font: { color: "#000000", size: 13 } },
        hovertemplate:
          "<b>Tiempo</b> %{x:.1f} min<br><b>Frecuencia</b> %{y:.1f} Hz<br><b>SEF95</b> %{customdata:.1f} Hz<br><b>SEF</b> %{z:.2f}<extra></extra>",
        zsmooth: "best",
      },
      ...clinicalTraces,
    ],
    state.compactClinicalView
      ? clinicalMonitorLayout({ shapes, annotations })
      : plotLayout("Tiempo quirurgico (min)", "Frecuencia (Hz)", { shapes, annotations }),
    plotConfig(),
  );

  syncRelayout("dsaChart");
}

function computeSef(frequencies, matrix, fraction = 0.95) {
  if (!frequencies.length || !matrix.length) return [];
  const columns = matrix[0]?.length || 0;
  return Array.from({ length: columns }, (_, timeIndex) => {
    const spectrum = frequencies.map((frequency, rowIndex) => ({
      frequency,
      power: Math.max(0, Number(matrix[rowIndex]?.[timeIndex]) || 0),
    }));
    const total = spectrum.reduce((sum, item) => sum + item.power, 0);
    if (!total) return null;
    let cumulative = 0;
    for (const item of spectrum) {
      cumulative += item.power;
      if (cumulative / total >= fraction) return item.frequency;
    }
    return spectrum.at(-1)?.frequency ?? null;
  });
}

function robustColorRange(matrix) {
  const values = matrix.flat().filter((value) => Number.isFinite(value));
  if (!values.length) return { min: 0, max: 1 };
  values.sort((a, b) => a - b);
  const low = values[Math.floor(values.length * 0.02)];
  const high = values[Math.floor(values.length * 0.995)];
  return high > low ? { min: low, max: high } : { min: 0, max: 1 };
}

function renderBands() {
  if (state.compactClinicalView) {
    Plotly.purge("bandsChart");
    return;
  }
  if (!state.data) {
    Plotly.purge("bandsChart");
    return;
  }
  const bandSeries = computeBandPower();
  const traces = Object.entries(bandSeries).map(([name, values]) => ({
    type: "scatter",
    mode: "lines",
    name,
    x: state.data.dsa.times,
    y: values,
    line: { color: colors[name], width: 2 },
    hovertemplate: `${name}<br>%{x:.1f} min<br>%{y:.2f}<extra></extra>`,
    hoverlabel: { bgcolor: "#ffffff", font: { color: "#000000", size: 13 } },
  }));

  Plotly.react("bandsChart", traces, plotLayout("Tiempo quirurgico (min)", "Potencia relativa"), plotConfig());
  syncRelayout("bandsChart");
}

function renderIndices() {
  if (state.compactClinicalView) {
    Plotly.purge("indicesChart");
    return;
  }
  if (!state.data) {
    Plotly.purge("indicesChart");
    return;
  }
  const { indices } = state.data;
  const x = indices.time.length ? indices.time : state.data.time;
  const traces = ["qCON", "qNOX", "BSR", "EMG", "SQI"]
    .filter((key) => state.visibleSignals.has(key) && indices[key]?.length)
    .map((key) => ({
      type: "scatter",
      mode: "lines",
      name: key,
      x,
      y: indices[key],
      line: { color: colors[key], width: 2 },
      hovertemplate: `${key}<br>%{x:.1f} min<br>%{y:.1f}<extra></extra>`,
      hoverlabel: { bgcolor: "#ffffff", font: { color: "#000000", size: 13 } },
    }));

  Plotly.react(
    "indicesChart",
    traces,
    plotLayout("Tiempo quirurgico (min)", "Indice", { shapes: buildShapes(), annotations: buildAnnotations(0.95) }),
    plotConfig(),
  );
  syncRelayout("indicesChart");
}

function plotLayout(xTitle, yTitle, extra = {}) {
  const xRange = state.currentRange ? { range: state.currentRange } : {};
  return {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "#09111d",
    margin: { l: 56, r: 20, t: 12, b: 46 },
    font: { color: "#edf4ff" },
    hoverlabel: {
      bgcolor: "#ffffff",
      bordercolor: "#111827",
      font: { color: "#000000", size: 13 },
    },
    hovermode: "x unified",
    xaxis: {
      title: xTitle,
      gridcolor: "#1e2a3c",
      zerolinecolor: "#253246",
      rangeslider: { visible: false },
      ...xRange,
    },
    yaxis: {
      title: yTitle,
      gridcolor: "#1e2a3c",
      zerolinecolor: "#253246",
    },
    legend: { orientation: "h", x: 0, y: 1.12 },
    ...extra,
  };
}

function clinicalMonitorLayout(extra = {}) {
  const range = state.currentRange ? { range: state.currentRange } : {};
  const compactXAxis = {
    domain: [0, 1],
    gridcolor: "#132033",
    zerolinecolor: "#253246",
    showticklabels: false,
    ticks: "",
    showgrid: false,
    rangeslider: { visible: false },
    ...range,
  };
  const visibleXAxis = {
    ...compactXAxis,
    title: { text: "Tiempo quirurgico (min)", standoff: 2, font: { size: 10 } },
    showticklabels: true,
    ticks: "outside",
    tickfont: { size: 10 },
    showgrid: true,
  };
  const clinicalYAxis = (title, domain, color) => ({
    domain,
    title: { text: title, standoff: 6, font: { size: 11, color } },
    gridcolor: "#132033",
    zeroline: true,
    zerolinecolor: "#edf4ff",
    zerolinewidth: 1.5,
    tickmode: "array",
    tickvals: [0, 50, 100],
    ticktext: ["0", "50", "100"],
    tickfont: { size: 8, color: "#d8e2f0" },
    ticks: "outside",
    ticklen: 3,
    tickpadding: 2,
    automargin: true,
    range: [-4, 104],
    fixedrange: false,
  });

  return {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "#050b14",
    margin: { l: 58, r: 44, t: 2, b: 26 },
    font: { color: "#edf4ff", size: 10 },
    hoverlabel: {
      bgcolor: "#ffffff",
      bordercolor: "#111827",
      font: { color: "#000000", size: 13 },
    },
    hovermode: "x unified",
    showlegend: false,
    xaxis: compactXAxis,
    yaxis: {
      domain: clinicalDomains.dsa,
      title: { text: "Hz", standoff: 4, font: { size: 11 } },
      gridcolor: "#132033",
      zerolinecolor: "#253246",
      tickfont: { size: 9 },
    },
    xaxis2: { ...compactXAxis, matches: "x" },
    yaxis2: clinicalYAxis("qCON", clinicalDomains.qCON, colors.qCON),
    xaxis3: { ...compactXAxis, matches: "x" },
    yaxis3: clinicalYAxis("qNOX", clinicalDomains.qNOX, colors.qNOX),
    xaxis4: { ...compactXAxis, matches: "x" },
    yaxis4: clinicalYAxis("BSR", clinicalDomains.BSR, colors.BSR),
    xaxis5: { ...compactXAxis, matches: "x" },
    yaxis5: clinicalYAxis("EMG", clinicalDomains.EMG, colors.EMG),
    xaxis6: { ...visibleXAxis, matches: "x" },
    yaxis6: clinicalYAxis("SQI", clinicalDomains.SQI, colors.SQI),
    ...extra,
  };
}

function plotConfig() {
  return {
    responsive: true,
    displaylogo: false,
    modeBarButtonsToRemove: ["lasso2d", "select2d"],
  };
}

function buildShapes() {
  const issueShapes = [
    ...detectThresholdSegments("SQI", (value) => value < 70, "rgba(255, 191, 77, 0.12)"),
    ...detectThresholdSegments("EMG", (value) => value > 45, "rgba(217, 70, 239, 0.12)"),
  ];
  const eventShapes = state.events.map((event) => ({
    type: "line",
    x0: event.time,
    x1: event.time,
    yref: "paper",
    y0: 0,
    y1: 1,
    line: { color: "#edf4ff", width: 1, dash: "dot" },
  }));
  return [...issueShapes, ...eventShapes];
}

function buildAnnotations(y = 1.02) {
  return state.events.map((event) => ({
    x: event.time,
    y,
    xref: "x",
    yref: "paper",
    text: event.label,
    showarrow: false,
    font: { color: "#edf4ff", size: 11 },
    bgcolor: "rgba(16, 23, 34, 0.85)",
    bordercolor: "#253246",
    borderpad: 3,
  }));
}

function detectThresholdSegments(key, predicate, fillcolor) {
  const x = state.data.indices.time;
  const y = state.data.indices[key];
  if (!x?.length || !y?.length) return [];

  const shapes = [];
  let start = null;
  y.forEach((value, index) => {
    const active = Number.isFinite(value) && predicate(value);
    if (active && start === null) start = x[index];
    if ((!active || index === y.length - 1) && start !== null) {
      const end = active && index === y.length - 1 ? x[index] : x[index - 1];
      shapes.push({
        type: "rect",
        x0: start,
        x1: end,
        yref: "paper",
        y0: 0,
        y1: 1,
        fillcolor,
        line: { width: 0 },
        layer: "below",
      });
      start = null;
    }
  });
  return shapes;
}

function computeBandPower() {
  if (!state.data) return {};
  const { frequencies, power } = state.data.dsa;
  const matrix = transposeIfNeeded(power, frequencies.length);
  const bands = {
    Delta: [0.5, 4],
    Theta: [4, 8],
    Alpha: [8, 13],
    Beta: [13, 30],
    Gamma: [30, Infinity],
  };

  return Object.fromEntries(
    Object.entries(bands).map(([name, [low, high]]) => {
      const indices = frequencies
        .map((frequency, index) => (frequency >= low && frequency < high ? index : -1))
        .filter((index) => index >= 0);
      const values = state.data.dsa.times.map((_, timeIndex) => {
        const total = indices.reduce((sum, frequencyIndex) => sum + (matrix[frequencyIndex]?.[timeIndex] || 0), 0);
        return indices.length ? total / indices.length : 0;
      });
      return [name, values];
    }),
  );
}

function transposeIfNeeded(matrix, expectedRows) {
  if (!matrix.length) return [];
  if (matrix.length === expectedRows) return matrix;
  return matrix[0].map((_, columnIndex) => matrix.map((row) => row[columnIndex]));
}

function renderEvents() {
  elements.eventList.innerHTML = "";
  if (!state.events.length) {
    elements.eventList.innerHTML = "<li>Sin marcadores registrados.</li>";
    return;
  }
  state.events
    .slice()
    .sort((a, b) => a.time - b.time)
    .forEach((event) => {
      const item = document.createElement("li");
      item.textContent = `${event.label}: ${formatNumber(event.time)} min`;
      elements.eventList.appendChild(item);
    });
}

function renderAnalysis() {
  if (!state.data) {
    elements.analysisList.innerHTML = "";
    return;
  }
  const findings = runAutomaticAnalysis();
  elements.analysisList.innerHTML = "";
  findings.forEach((finding) => {
    const card = document.createElement("div");
    card.className = `analysis-card severity-${finding.severity}`;
    card.innerHTML = `<strong>${finding.title}</strong><span>${finding.detail}</span>`;
    elements.analysisList.appendChild(card);
  });
}

function renderLegendSummary() {
  if (!state.data) {
    elements.legendSummary.textContent = "Sin eventos relevantes.";
    return;
  }
  const findings = runAutomaticAnalysis();
  const high = findings.filter((finding) => finding.severity === "high").slice(0, 5);
  const medium = findings.filter((finding) => finding.severity === "medium").slice(0, 4);
  const low = findings.filter((finding) => finding.severity === "low").slice(0, 3);
  const selected = [...high, ...medium, ...low].slice(0, 8);
  if (!selected.length) {
    elements.legendSummary.textContent = "Sin eventos relevantes.";
    return;
  }
  elements.legendSummary.innerHTML = selected
    .map(
      (finding) =>
        `<div class="legend-item legend-${finding.severity}"><strong>${finding.title}</strong><span>${finding.detail}</span></div>`,
    )
    .join("");
}

function runAutomaticAnalysis() {
  if (!state.data) {
    return [];
  }
  const findings = [];
  const bands = computeBandPower();
  const dominant = getDominantBands(bands, state.data.dsa.times);
  findings.push(...summarizeDominance(dominant, "Delta", "Predominio Delta", "low"));
  findings.push(...summarizeDominance(dominant, "Alpha", "Predominio Alpha", "low"));
  findings.push(...summarizeThreshold("BSR", (v) => v >= 5, "Posible burst suppression", "high"));
  findings.push(...summarizeThreshold("qCON", (v) => v < 40, "qCON < 40: riesgo de supresion", "high"));
  findings.push(...summarizeThreshold("qCON", (v) => v > 60, "qCON > 60: riesgo de despertar", "high"));
  findings.push(...summarizeThreshold("qNOX", (v) => v > 65, "Aumento de qNOX", "medium"));
  findings.push(...summarizeThreshold("EMG", (v) => v > 45, "Artefacto probable por EMG", "medium"));
  findings.push(...summarizeThreshold("SQI", (v) => v < 70, "Segmento de baja calidad SQI", "medium"));

  return findings.length
    ? findings
    : [{ title: "Sin alertas", detail: "No se detectaron segmentos relevantes con los umbrales actuales.", severity: "low" }];
}

function applyDsaSettings() {
  const min = Number(elements.powerMin.value);
  const max = Number(elements.powerMax.value);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    showMessage("La escala SEF del DSA debe tener minimo y maximo validos.");
    return;
  }
  state.dsa.palette = elements.paletteSelect.value;
  state.dsa.min = min;
  state.dsa.max = max;
  state.dsa.clean = elements.cleanDsaToggle.checked;
  renderDsa();
}

function resetDsaSettings(options = {}) {
  state.dsa = {
    palette: "thermal",
    min: 0.62,
    max: 0.85,
    clean: Boolean(options.clean),
  };
  elements.paletteSelect.value = state.dsa.palette;
  elements.powerMin.value = state.dsa.min;
  elements.powerMax.value = state.dsa.max;
  elements.cleanDsaToggle.checked = state.dsa.clean;
}

function savePatientData() {
  state.patient = {
    age: elements.patientAge.value,
    gender: elements.patientGender.value,
    height: elements.patientHeight.value,
    weight: elements.patientWeight.value,
    pkpdModel: elements.pkpdModel.value,
  };
  if (state.data) {
    state.data.metadata.patient = { ...state.patient };
    state.data.metadata.pkpd_model = state.patient.pkpdModel;
  }
  state.dsa.clean = true;
  elements.cleanDsaToggle.checked = true;
  renderPatientSummary();
  renderDsa();
  if (state.data) saveCurrentStateToDatabase(document.getElementById("fileName").textContent || "caso", { silent: true });
  showMessage("Datos del paciente actualizados. DSA limpio activado para lectura sin superposiciones.");
}

async function loadCaseList() {
  if (!isLocalDashboard) {
    elements.caseList.textContent = "Historial local disponible en la version de escritorio.";
    return;
  }
  try {
    const response = await fetch(`${getApiBase()}/api/cases`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "No se pudo cargar la lista.");
    renderCaseList(payload.cases || []);
  } catch (error) {
    elements.caseList.textContent = `No se pudo leer la base local: ${error.message}`;
  }
}

function renderCaseList(cases) {
  if (!cases.length) {
    elements.caseList.textContent = "Sin casos guardados.";
    return;
  }
  elements.caseList.innerHTML = "";
  cases.slice(0, 12).forEach((record) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "case-card";
    card.innerHTML = `
      <strong>${escapeHtml(record.patient_code || record.source_file_name || "Caso sin nombre")}</strong>
      <span>${escapeHtml(record.procedure_date || record.created_at || "")}</span><br />
      <span>${escapeHtml(record.hospital || "")} ${escapeHtml(record.surgery_type || "")}</span>
    `;
    card.addEventListener("click", () => openCase(record.id));
    elements.caseList.appendChild(card);
  });
}

async function openCase(caseId, options = {}) {
  try {
    const response = await fetch(`${getApiBase()}/api/cases/${caseId}`);
    const record = await response.json();
    if (!response.ok) throw new Error(record.error || "No se pudo abrir el caso.");
    fillCaseForm(record);
    loadDashboard(record.analysis, record.source_file_name, { skipDatabaseSave: true });
    state.currentCaseId = record.id;
    elements.caseComments.value = record.comments || "";
    if (options.saveToDatabase) {
      await saveCurrentStateToDatabase(record.source_file_name, { silent: true });
    }
    setTimeout(resizeCharts, 150);
    if (!options.silent) showMessage("Caso cargado desde la base local.");
  } catch (error) {
    showMessage(`No se pudo abrir el caso. Detalle: ${error.message}`);
  }
}

function resizeCharts() {
  ["dsaChart", "bandsChart", "indicesChart"].forEach((id) => {
    const chart = document.getElementById(id);
    if (chart?._fullLayout) Plotly.Plots.resize(chart);
  });
}

function fillCaseForm(record) {
  elements.patientCode.value = record.patient_code || "";
  elements.procedureDate.value = record.procedure_date || "";
  elements.hospital.value = record.hospital || "";
  elements.operatingRoom.value = record.operating_room || "";
  elements.surgeryType.value = record.surgery_type || "";
  elements.anesthesiaType.value = record.anesthesia_type || "";
}

async function saveCurrentCase() {
  if (!state.data) {
    showMessage("Primero carga un archivo para guardar el caso.");
    return;
  }
  await saveCurrentStateToDatabase(document.getElementById("fileName").textContent || "caso", { silent: false });
}

async function saveCaseComments() {
  if (state.currentDatabaseCaseId && state.data) {
    await saveCurrentStateToDatabase(document.getElementById("fileName").textContent || "caso", { silent: true });
  }
  if (!state.currentCaseId) {
    showMessage(state.currentDatabaseCaseId ? "Comentarios guardados en base de datos local." : "Primero abre o importa un caso guardado.");
    return;
  }
  try {
    const response = await fetch(`${getApiBase()}/api/cases/${state.currentCaseId}/comments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comments: elements.caseComments.value }),
    });
    const record = await response.json();
    if (!response.ok) throw new Error(record.error || "No se pudieron guardar comentarios.");
    await loadCaseList();
    showMessage("Comentarios guardados en la base local.");
  } catch (error) {
    showMessage(`No se pudieron guardar comentarios. Detalle: ${error.message}`);
  }
}

function openClinicalDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB no esta disponible en este navegador."));
      return;
    }
    const request = indexedDB.open(databaseName, databaseVersion);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(databaseStoreName)) {
        const store = db.createObjectStore(databaseStoreName, { keyPath: "case_id" });
        store.createIndex("fecha", "metadata.fecha", { unique: false });
        store.createIndex("institucion", "metadata.institucion", { unique: false });
        store.createIndex("tipo_cirugia", "metadata.tipo_cirugia", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function databaseTransaction(mode, callback) {
  const db = await openClinicalDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(databaseStoreName, mode);
    const store = tx.objectStore(databaseStoreName);
    let result;
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    result = callback(store);
  });
}

async function saveCaseToDatabase(caseData) {
  await databaseTransaction("readwrite", (store) => store.put(caseData));
  state.currentDatabaseCaseId = caseData.case_id;
  await loadSavedCases();
  return caseData.case_id;
}

async function loadSavedCases() {
  try {
    const cases = await databaseTransaction("readonly", (store) => {
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
    state.savedDatabaseCases = cases.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    renderDatabaseCaseList();
  } catch (error) {
    elements.databaseCaseList.textContent = `No se pudo abrir IndexedDB: ${error.message}`;
  }
}

async function deleteCase(caseId) {
  await databaseTransaction("readwrite", (store) => store.delete(caseId));
  if (state.currentDatabaseCaseId === caseId) state.currentDatabaseCaseId = null;
  await loadSavedCases();
}

async function updateCaseMetadata(caseId, metadata) {
  const record = await getDatabaseCase(caseId);
  if (!record) throw new Error("Caso no encontrado.");
  record.metadata = { ...record.metadata, ...metadata };
  record.updated_at = new Date().toISOString();
  await saveCaseToDatabase(record);
}

async function getDatabaseCase(caseId) {
  return databaseTransaction("readonly", (store) => {
    return new Promise((resolve, reject) => {
      const request = store.get(caseId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  });
}

async function saveCurrentStateToDatabase(fileName, options = {}) {
  if (!state.data) return null;
  const caseData = buildCurrentCaseData(fileName);
  await saveCaseToDatabase(caseData);
  if (!options.silent) showMessage(`Caso guardado en base local: ${caseData.case_id}`);
  return caseData.case_id;
}

function buildCurrentCaseData(fileName) {
  const now = new Date();
  const existingId = state.currentDatabaseCaseId;
  const caseId = existingId || createCaseId(now);
  const cleanData = {
    ...state.data,
    metadata: {
      ...state.data.metadata,
      patient_id: "anonimizado",
      patient: { ...state.patient },
      pkpd_model: state.patient.pkpdModel,
    },
    events: state.events,
  };
  const metadata = {
    fecha: elements.procedureDate.value || now.toISOString().slice(0, 10),
    institucion: elements.hospital.value || "",
    pabellon: elements.operatingRoom.value || "",
    tipo_cirugia: elements.surgeryType.value || "",
    tipo_anestesia: elements.anesthesiaType.value || "",
    observaciones: elements.caseComments.value || "",
    archivo_origen: fileName || "",
    duracion_min: getMaxTime(state.data) || 0,
  };
  return {
    case_id: caseId,
    created_at: existingId ? undefined : now.toISOString(),
    updated_at: now.toISOString(),
    metadata,
    data: cleanData,
    events: state.events,
    dsa_settings: state.dsa,
    aggregated: calculateAggregatedIndicators(cleanData),
  };
}

function createCaseId(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `CASE_${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function renderDatabaseCaseList() {
  const query = (elements.databaseSearch.value || "").toLowerCase().trim();
  const cases = state.savedDatabaseCases.filter((record) => {
    const text = [
      record.case_id,
      record.metadata?.fecha,
      record.metadata?.institucion,
      record.metadata?.tipo_cirugia,
      record.metadata?.tipo_anestesia,
    ]
      .join(" ")
      .toLowerCase();
    return !query || text.includes(query);
  });
  if (!cases.length) {
    elements.databaseCaseList.textContent = "Sin casos en base local.";
    return;
  }
  elements.databaseCaseList.innerHTML = "";
  cases.slice(0, 30).forEach((record) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "case-card";
    card.innerHTML = `
      <strong>${escapeHtml(record.case_id)}</strong>
      <span>${escapeHtml(record.metadata?.fecha || "")}</span><br />
      <span>${escapeHtml(record.metadata?.institucion || "")} ${escapeHtml(record.metadata?.tipo_cirugia || "")}</span>
    `;
    card.addEventListener("click", () => openDatabaseCase(record.case_id));
    elements.databaseCaseList.appendChild(card);
  });
}

async function openDatabaseCase(caseId) {
  const record = await getDatabaseCase(caseId);
  if (!record) {
    showMessage("Caso no encontrado en IndexedDB.");
    return;
  }
  fillDatabaseCaseForm(record);
  loadDashboard(record.data, record.metadata?.archivo_origen || record.case_id, {
    skipDatabaseSave: true,
    databaseCaseId: record.case_id,
  });
  state.currentDatabaseCaseId = record.case_id;
  showMessage(`Caso cargado desde base de datos: ${record.case_id}`);
}

function fillDatabaseCaseForm(record) {
  const metadata = record.metadata || {};
  elements.patientCode.value = "";
  elements.procedureDate.value = metadata.fecha || "";
  elements.hospital.value = metadata.institucion || "";
  elements.operatingRoom.value = metadata.pabellon || "";
  elements.surgeryType.value = metadata.tipo_cirugia || "";
  elements.anesthesiaType.value = metadata.tipo_anestesia || "";
  elements.caseComments.value = metadata.observaciones || "";
}

async function deleteCurrentDatabaseCase() {
  if (!state.currentDatabaseCaseId) {
    showMessage("Primero selecciona un caso de la base de datos.");
    return;
  }
  const id = state.currentDatabaseCaseId;
  await deleteCase(id);
  clearDashboard({ silent: true });
  showMessage(`Caso eliminado: ${id}`);
}

async function exportCurrentDatabaseCaseToExcel() {
  if (!state.currentDatabaseCaseId) {
    showMessage("Primero selecciona o guarda un caso.");
    return;
  }
  const record = await getDatabaseCase(state.currentDatabaseCaseId);
  if (!record) {
    showMessage("Caso no encontrado para exportar.");
    return;
  }
  exportCasesToExcel([record], `eeg_case_${record.case_id}.xlsx`);
}

async function exportDatabaseToExcel() {
  await loadSavedCases();
  if (!state.savedDatabaseCases.length) {
    showMessage("No hay casos guardados para exportar.");
    return;
  }
  exportCasesToExcel(state.savedDatabaseCases, "eeg_base_datos_casos.xlsx");
}

function exportCasesToExcel(cases, filename) {
  const sheets = {
    Resumen_Casos: buildResumenCasosSheet(cases),
    Series_Temporales: cases.flatMap(flattenTimeSeriesForExcel),
    Eventos_Clinicos: cases.flatMap(flattenEventsForExcel),
    DSA_Matriz: cases.flatMap(flattenDSAForExcel),
    Indicadores_Agregados: cases.map((record) => ({ case_id: record.case_id, ...calculateAggregatedIndicators(record.data) })),
  };
  const blob = createXlsxWorkbook(sheets);
  downloadBlob(blob, filename);
  showMessage(`Excel exportado: ${filename}`);
}

function buildResumenCasosSheet(cases) {
  return cases.map((record) => {
    const data = record.data || {};
    const indices = data.indices || {};
    const aggregated = calculateAggregatedIndicators(data);
    return {
      case_id: record.case_id,
      fecha: record.metadata?.fecha || "",
      institucion: record.metadata?.institucion || "",
      pabellon: record.metadata?.pabellon || "",
      tipo_cirugia: record.metadata?.tipo_cirugia || "",
      tipo_anestesia: record.metadata?.tipo_anestesia || "",
      duracion_min: record.metadata?.duracion_min || getMaxTime(data),
      qCON_promedio: average(indices.qCON),
      qCON_min: minValue(indices.qCON),
      qCON_max: maxValue(indices.qCON),
      qNOX_promedio: average(indices.qNOX),
      BSR_max: maxValue(indices.BSR),
      EMG_promedio: average(indices.EMG),
      SQI_promedio: average(indices.SQI),
      banda_predominante_global: aggregated.banda_predominante_global,
      eventos_relevantes: (record.events || []).map((event) => event.label).join("; "),
      observaciones: record.metadata?.observaciones || "",
    };
  });
}

function flattenTimeSeriesForExcel(record) {
  const data = record.data || {};
  const indices = data.indices || {};
  const times = indices.time?.length ? indices.time : data.time || [];
  const bandSeries = computeBandPowerForData(data);
  return times.map((time, index) => {
    const bands = bandValuesAt(bandSeries, index);
    const predominant = predominantBand(bands);
    const sqi = valueAt(indices.SQI, index);
    const emg = valueAt(indices.EMG, index);
    return {
      case_id: record.case_id,
      tiempo_seg: minutesToSeconds(time),
      qCON: valueAt(indices.qCON, index),
      qNOX: valueAt(indices.qNOX, index),
      BSR: valueAt(indices.BSR, index),
      EMG: emg,
      SQI: sqi,
      delta_power: bands.Delta,
      theta_power: bands.Theta,
      alpha_power: bands.Alpha,
      beta_power: bands.Beta,
      gamma_power: bands.Gamma,
      banda_predominante: predominant,
      calidad_senal: sqi == null ? "" : sqi >= 70 ? "adecuada" : "baja",
      artefacto_probable: emg != null && emg > 45 ? "si" : "no",
    };
  });
}

function flattenEventsForExcel(record) {
  return (record.events || []).map((event) => ({
    case_id: record.case_id,
    tiempo_seg: minutesToSeconds(event.time),
    evento: event.label || "",
    descripcion: event.description || "",
    usuario: event.user || "operador",
    timestamp_registro: event.registered_at || "",
  }));
}

function flattenDSAForExcel(record) {
  const data = record.data || {};
  const dsa = data.dsa || {};
  const frequencies = dsa.frequencies || [];
  const times = dsa.times || [];
  const matrix = transposeIfNeeded(dsa.power || [], frequencies.length);
  const rows = [];
  frequencies.forEach((frequency, frequencyIndex) => {
    times.forEach((time, timeIndex) => {
      rows.push({
        case_id: record.case_id,
        tiempo_seg: minutesToSeconds(time),
        frecuencia_hz: frequency,
        potencia: matrix[frequencyIndex]?.[timeIndex] ?? null,
        banda_eeg: eegBandForFrequency(frequency),
      });
    });
  });
  return rows;
}

function calculateAggregatedIndicators(caseData) {
  const indices = caseData.indices || {};
  const bandSeries = computeBandPowerForData(caseData);
  const predominant = (indices.time || caseData.time || []).map((_, index) => predominantBand(bandValuesAt(bandSeries, index)));
  const total = Math.max(predominant.filter(Boolean).length, 1);
  const percent = (band) => (predominant.filter((value) => value === band).length / total) * 100;
  return {
    porcentaje_tiempo_delta: percent("Delta"),
    porcentaje_tiempo_theta: percent("Theta"),
    porcentaje_tiempo_alpha: percent("Alpha"),
    porcentaje_tiempo_beta: percent("Beta"),
    porcentaje_tiempo_gamma: percent("Gamma"),
    tiempo_qCON_menor_40: countWhere(indices.qCON, (value) => value < 40),
    tiempo_qCON_40_60: countWhere(indices.qCON, (value) => value >= 40 && value <= 60),
    tiempo_qCON_mayor_60: countWhere(indices.qCON, (value) => value > 60),
    tiempo_BSR_mayor_0: countWhere(indices.BSR, (value) => value > 0),
    tiempo_EMG_alto: countWhere(indices.EMG, (value) => value > 45),
    tiempo_SQI_bajo: countWhere(indices.SQI, (value) => value < 70),
    banda_predominante_global: mode(predominant.filter(Boolean)) || "",
  };
}


function renderPatientSummary() {
  const parts = [];
  const bmi = calculateBmi(state.patient);
  if (state.patient.age) parts.push(`Edad: ${state.patient.age} anos`);
  if (state.patient.gender) parts.push(`Genero: ${state.patient.gender}`);
  if (state.patient.height) parts.push(`Talla: ${state.patient.height} cm`);
  if (state.patient.weight) parts.push(`Peso: ${state.patient.weight} kg`);
  if (bmi) parts.push(`IMC: ${bmi.value} kg/m2 (${bmi.classification})`);
  if (state.patient.pkpdModel) parts.push(`PK-PD: ${state.patient.pkpdModel}`);
  elements.patientSummary.textContent = parts.length ? parts.join(" | ") : "Sin datos clinicos ingresados.";
}

function calculateBmi(patient) {
  const heightCm = Number(patient.height);
  const weightKg = Number(patient.weight);
  const age = Number(patient.age);
  if (!Number.isFinite(heightCm) || !Number.isFinite(weightKg) || heightCm <= 0 || weightKg <= 0) return null;
  const value = weightKg / (heightCm / 100) ** 2;
  return {
    value: value.toFixed(1),
    classification: classifyBmi(value, age),
  };
}

function classifyBmi(bmi, age) {
  if (Number.isFinite(age) && age >= 65) {
    if (bmi < 23.1) return "Desnutrido";
    if (bmi < 28) return "Normal";
    if (bmi < 32) return "Sobrepeso";
    if (bmi < 40) return "Obeso";
    return "Obeso extremo";
  }
  if (bmi < 18.5) return "Desnutrido";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Sobrepeso";
  if (bmi < 40) return "Obeso";
  return "Obeso extremo";
}

function getDominantBands(bands, times) {
  return times.map((time, index) => {
    const entries = Object.entries(bands).map(([name, values]) => [name, values[index] || 0]);
    entries.sort((a, b) => b[1] - a[1]);
    return { time, band: entries[0]?.[0] || "N/A" };
  });
}

function summarizeDominance(dominant, band, title, severity) {
  const segments = collectSegments(
    dominant.map((item) => item.time),
    dominant.map((item) => item.band),
    (value) => value === band,
  );
  return segments.map(([start, end]) => ({
    title,
    detail: `${formatNumber(start)} a ${formatNumber(end)} min`,
    severity,
  }));
}

function summarizeThreshold(key, predicate, title, severity) {
  const x = state.data.indices.time;
  const y = state.data.indices[key];
  if (!x?.length || !y?.length) return [];
  return collectSegments(x, y, predicate).map(([start, end]) => ({
    title,
    detail: `${formatNumber(start)} a ${formatNumber(end)} min`,
    severity,
  }));
}

function collectSegments(x, y, predicate) {
  const segments = [];
  let start = null;
  y.forEach((value, index) => {
    const active = typeof value === "number" ? Number.isFinite(value) && predicate(value) : predicate(value);
    if (active && start === null) start = x[index];
    if ((!active || index === y.length - 1) && start !== null) {
      const end = active && index === y.length - 1 ? x[index] : x[Math.max(0, index - 1)];
      if (end - start >= 1) segments.push([start, end]);
      start = null;
    }
  });
  return segments.slice(0, 8);
}

function addManualEvent() {
  const time = Number(elements.eventTime.value);
  if (!Number.isFinite(time)) return;
  state.events.push({
    label: elements.eventType.value,
    time,
    description: elements.eventDescription.value,
    user: "operador",
    registered_at: new Date().toISOString(),
  });
  elements.eventDescription.value = "";
  elements.eventTime.value = "";
  renderAll();
  if (state.data) saveCurrentStateToDatabase(document.getElementById("fileName").textContent || "caso", { silent: true });
}

function applyManualRange() {
  const start = Number(elements.rangeStart.value);
  const end = Number(elements.rangeEnd.value);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    showMessage("La ventana temporal debe tener inicio y fin validos.");
    return;
  }
  state.currentRange = [start, end];
  renderAll();
}

function resetZoom() {
  state.currentRange = null;
  renderAll();
}

function clearDashboard(options = {}) {
  state.data = null;
  state.events = [];
  state.currentRange = null;
  state.currentCaseId = null;
  state.currentDatabaseCaseId = null;
  state.patient = { age: "", gender: "", height: "", weight: "", pkpdModel: "" };
  resetDsaSettings({ clean: true });
  elements.patientCode.value = "";
  elements.procedureDate.value = "";
  elements.hospital.value = "";
  elements.operatingRoom.value = "";
  elements.surgeryType.value = "";
  elements.anesthesiaType.value = "";
  elements.caseComments.value = "";
  elements.patientAge.value = "";
  elements.patientGender.value = "";
  elements.patientHeight.value = "";
  elements.patientWeight.value = "";
  elements.pkpdModel.value = "";
  elements.fileInput.value = "";
  elements.eventDescription.value = "";
  updateFileName("Sin archivo");
  ["duration", "startTime", "endTime", "samplingRate", "device"].forEach((id) => {
    document.getElementById(id).textContent = "--";
  });
  elements.dsaStatus.textContent = "Sin datos";
  Plotly.purge("dsaChart");
  Plotly.purge("bandsChart");
  Plotly.purge("indicesChart");
  elements.eventList.innerHTML = "<li>Sin marcadores registrados.</li>";
  elements.analysisList.innerHTML = "";
  elements.legendSummary.textContent = "Sin eventos relevantes.";
  renderPatientSummary();
  if (!options.silent) showMessage("Datos limpiados. El DSA quedo sin imagen ni informacion en pantalla.");
}

function computeBandPowerForData(data) {
  const dsa = data?.dsa || {};
  const frequencies = dsa.frequencies || [];
  const matrix = transposeIfNeeded(dsa.power || [], frequencies.length);
  const bands = {
    Delta: [0.5, 4],
    Theta: [4, 8],
    Alpha: [8, 13],
    Beta: [13, 30],
    Gamma: [30, Infinity],
  };
  return Object.fromEntries(
    Object.entries(bands).map(([name, [low, high]]) => {
      const frequencyIndexes = frequencies
        .map((frequency, index) => (frequency >= low && frequency < high ? index : -1))
        .filter((index) => index >= 0);
      const values = (dsa.times || []).map((_, timeIndex) => {
        const total = frequencyIndexes.reduce((sum, frequencyIndex) => sum + (matrix[frequencyIndex]?.[timeIndex] || 0), 0);
        return frequencyIndexes.length ? total / frequencyIndexes.length : 0;
      });
      return [name, values];
    }),
  );
}

function bandValuesAt(series, index) {
  return {
    Delta: valueAt(series.Delta, index) || 0,
    Theta: valueAt(series.Theta, index) || 0,
    Alpha: valueAt(series.Alpha, index) || 0,
    Beta: valueAt(series.Beta, index) || 0,
    Gamma: valueAt(series.Gamma, index) || 0,
  };
}

function predominantBand(values) {
  return Object.entries(values).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
}

function eegBandForFrequency(frequency) {
  if (frequency < 4) return "Delta";
  if (frequency < 8) return "Theta";
  if (frequency < 13) return "Alpha";
  if (frequency < 30) return "Beta";
  return "Gamma";
}

function minutesToSeconds(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number * 60 : "";
}

function valueAt(values, index) {
  const value = values?.[index];
  return Number.isFinite(value) ? value : null;
}

function numberValues(values = []) {
  return values.filter((value) => Number.isFinite(value));
}

function average(values = []) {
  const clean = numberValues(values);
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : "";
}

function minValue(values = []) {
  const clean = numberValues(values);
  return clean.length ? Math.min(...clean) : "";
}

function maxValue(values = []) {
  const clean = numberValues(values);
  return clean.length ? Math.max(...clean) : "";
}

function countWhere(values = [], predicate) {
  return numberValues(values).filter(predicate).length;
}

function mode(values) {
  const counts = new Map();
  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
}

async function exportDashboardData() {
  if (!state.data) {
    showMessage("No hay datos para exportar.");
    return;
  }
  const payload = {
    ...state.data,
    metadata: {
      ...state.data.metadata,
      patient: state.patient,
      pkpd_model: state.patient.pkpdModel,
      exported_at: new Date().toISOString(),
    },
    events: state.events,
    analysis: runAutomaticAnalysis(),
    dsa_settings: state.dsa,
  };
  const text = JSON.stringify(payload, null, 2);
  if (window.showSaveFilePicker) {
    const handle = await window.showSaveFilePicker({
      suggestedName: "eeg-vital-dashboard-export.json",
      types: [{ description: "JSON", accept: { "application/json": [".json"] } }],
    });
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
    showMessage("Datos exportados correctamente.");
    return;
  }

  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "eeg-vital-dashboard-export.json";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 1000);
  showMessage("Exportacion iniciada. Revisa la carpeta de descargas.");
}

function createXlsxWorkbook(sheets) {
  const sheetNames = Object.keys(sheets);
  const files = {
    "[Content_Types].xml": contentTypesXml(sheetNames),
    "_rels/.rels": rootRelsXml(),
    "xl/workbook.xml": workbookXml(sheetNames),
    "xl/_rels/workbook.xml.rels": workbookRelsXml(sheetNames),
    "xl/styles.xml": stylesXml(),
  };
  sheetNames.forEach((name, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = worksheetXml(sheets[name]);
  });
  return new Blob([zipFiles(files)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function worksheetXml(rows) {
  const headers = rows.length ? Object.keys(rows[0]) : ["sin_datos"];
  const headerRow = `<row r="1">${headers.map((header, index) => cellXml(1, index + 1, header, true)).join("")}</row>`;
  const dataRows = rows.map((row, rowIndex) => {
    const r = rowIndex + 2;
    return `<row r="${r}">${headers.map((header, index) => cellXml(r, index + 1, row[header])).join("")}</row>`;
  });
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetData>${headerRow}${dataRows.join("")}</sheetData></worksheet>`;
}

function cellXml(row, column, value, header = false) {
  const ref = `${columnName(column)}${row}`;
  const style = header ? ' s="1"' : "";
  if (value == null || value === "") return `<c r="${ref}"${style}/>`;
  if (typeof value === "number" && Number.isFinite(value)) return `<c r="${ref}"><v>${value}</v></c>`;
  return `<c r="${ref}" t="inlineStr"${style}><is><t>${escapeXml(String(value))}</t></is></c>`;
}

function columnName(index) {
  let name = "";
  while (index > 0) {
    const rem = (index - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    index = Math.floor((index - 1) / 26);
  }
  return name;
}

function contentTypesXml(sheetNames) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheetNames.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`;
}

function rootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
}

function workbookXml(sheetNames) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetNames.map((name, index) => `<sheet name="${escapeXml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}</sheets></workbook>`;
}

function workbookRelsXml(sheetNames) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheetNames.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}<Relationship Id="rId${sheetNames.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font/><font><b/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>`;
}

function zipFiles(files) {
  const encoder = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;
  Object.entries(files).forEach(([name, content]) => {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const crc = crc32(data);
    const local = zipHeader(0x04034b50, [[2, 20], [2, 0], [2, 0], [2, 0], [2, 0], [4, crc], [4, data.length], [4, data.length], [2, nameBytes.length], [2, 0]]);
    chunks.push(local, nameBytes, data);
    central.push({ nameBytes, crc, size: data.length, offset });
    offset += local.length + nameBytes.length + data.length;
  });
  const centralStart = offset;
  central.forEach((entry) => {
    const header = zipHeader(0x02014b50, [[2, 20], [2, 20], [2, 0], [2, 0], [2, 0], [2, 0], [4, entry.crc], [4, entry.size], [4, entry.size], [2, entry.nameBytes.length], [2, 0], [2, 0], [2, 0], [2, 0], [4, 0], [4, entry.offset]]);
    chunks.push(header, entry.nameBytes);
    offset += header.length + entry.nameBytes.length;
  });
  const centralSize = offset - centralStart;
  chunks.push(zipHeader(0x06054b50, [[2, 0], [2, 0], [2, central.length], [2, central.length], [4, centralSize], [4, centralStart], [2, 0]]));
  return new Blob(chunks);
}

function zipHeader(signature, fields) {
  const length = 4 + fields.reduce((sum, [size]) => sum + size, 0);
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  view.setUint32(0, signature, true);
  let offset = 4;
  fields.forEach(([size, value]) => {
    if (size === 2) view.setUint16(offset, value, true);
    if (size === 4) view.setUint32(offset, value >>> 0, true);
    offset += size;
  });
  return new Uint8Array(buffer);
}

function crc32(bytes) {
  let crc = -1;
  for (let index = 0; index < bytes.length; index += 1) crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[index]) & 0xff];
  return (crc ^ -1) >>> 0;
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function escapeXml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}

function printDashboard() {
  const analysis = runAutomaticAnalysis();
  const patient = elements.patientSummary.textContent || "Sin datos clinicos ingresados.";
  const fileName = document.getElementById("fileName").textContent;
  const duration = document.getElementById("duration").textContent;
  const dsaStatus = elements.dsaStatus.textContent;
  const analysisHtml = analysis.length
    ? analysis.map((item) => `<li><strong>${escapeHtml(item.title)}</strong>: ${escapeHtml(item.detail)}</li>`).join("")
    : "<li>Sin eventos relevantes.</li>";
  const html = `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Reporte EEG Vital</title>
        <style>
          body { font-family: Arial, sans-serif; color: #000; margin: 28px; }
          h1 { margin: 0 0 12px; }
          .box { border: 1px solid #bbb; padding: 12px; margin: 12px 0; }
          li { margin: 6px 0; }
        </style>
      </head>
      <body>
        <h1>Reporte EEG Vital Dashboard</h1>
        <div class="box">
          <strong>Archivo:</strong> ${escapeHtml(fileName)}<br />
          <strong>Registro total:</strong> ${escapeHtml(duration)}<br />
          <strong>DSA:</strong> ${escapeHtml(dsaStatus)}
        </div>
        <div class="box"><strong>Paciente:</strong><br />${escapeHtml(patient)}</div>
        <div class="box">
          <strong>Analisis automatico</strong>
          <ul>${analysisHtml}</ul>
        </div>
      </body>
    </html>
  `;
  const oldFrame = document.getElementById("printFrame");
  if (oldFrame) oldFrame.remove();
  const frame = document.createElement("iframe");
  frame.id = "printFrame";
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const frameDoc = frame.contentWindow?.document;
  if (!frameDoc) {
    window.print();
    return;
  }
  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
  }, 150);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function syncRelayout(chartId) {
  const chart = document.getElementById(chartId);
  if (!chart || chart.dataset.syncRelayoutAttached === "true") return;
  chart.dataset.syncRelayoutAttached = "true";
  chart.on("plotly_relayout", (event) => {
    const axisName = Object.keys(event)
      .find((key) => /^xaxis\d*\.range\[0\]$/.test(key))
      ?.replace(".range[0]", "");
    const start = axisName ? event[`${axisName}.range[0]`] : undefined;
    const end = axisName ? event[`${axisName}.range[1]`] : undefined;
    if (start !== undefined && end !== undefined) {
      state.currentRange = [Number(start), Number(end)];
      const rangeUpdate = state.compactClinicalView
        ? {
            "xaxis.range": state.currentRange,
            "xaxis2.range": state.currentRange,
            "xaxis3.range": state.currentRange,
            "xaxis4.range": state.currentRange,
            "xaxis5.range": state.currentRange,
            "xaxis6.range": state.currentRange,
          }
        : { "xaxis.range": state.currentRange };
      ["dsaChart", "bandsChart", "indicesChart"].forEach((id) => {
        const target = document.getElementById(id);
        if (id !== chartId && target?._fullLayout) Plotly.relayout(id, rangeUpdate);
      });
    }
    if (event["xaxis.autorange"] || event["xaxis6.autorange"]) {
      state.currentRange = null;
    }
  });
}

function showMessage(text) {
  elements.message.textContent = text;
  elements.message.classList.toggle("hidden", !text);
}

function formatNumber(value) {
  return Number(value).toLocaleString("es-CL", { maximumFractionDigits: 1 });
}

function createDemoData() {
  const minutes = 150;
  const dsaTimes = Array.from({ length: minutes + 1 }, (_, index) => index);
  const frequencies = Array.from({ length: 41 }, (_, index) => index + 1);
  const power = frequencies.map((frequency) =>
    dsaTimes.map((time) => {
      const alpha = gaussian(frequency, 10, 2.1) * (time > 18 && time < 115 ? 1.8 : 0.55);
      const delta = gaussian(frequency, 2.4, 1.2) * (time > 8 && time < 95 ? 2.2 : 0.8);
      const beta = gaussian(frequency, 21, 4.2) * (time < 18 || time > 118 ? 1.5 : 0.35);
      const artifact = time > 58 && time < 67 ? gaussian(frequency, 35, 5) * 2.4 : 0;
      const burst = time > 82 && time < 91 ? Math.sin(time * 1.7) ** 2 * 2.3 : 0;
      return Math.max(0, alpha + delta + beta + artifact + burst + Math.random() * 0.18);
    }),
  );

  const indicesTime = dsaTimes;
  return {
    metadata: {
      patient_id: "anonimized",
      surgery_date: "",
      start_time: "08:12",
      end_time: "10:42",
      sampling_rate: 128,
      device: "Conox",
    },
    time: dsaTimes,
    eeg: [],
    dsa: { frequencies, times: dsaTimes, power },
    indices: {
      time: indicesTime,
      qCON: indicesTime.map((t) => clamp(48 + Math.sin(t / 14) * 7 - (t > 78 && t < 92 ? 18 : 0), 0, 99)),
      qNOX: indicesTime.map((t) => clamp(38 + Math.sin(t / 9) * 8 + (t > 42 && t < 54 ? 30 : 0), 0, 99)),
      BSR: indicesTime.map((t) => (t > 82 && t < 91 ? 8 + Math.sin(t) * 4 : 0)),
      EMG: indicesTime.map((t) => clamp(18 + Math.sin(t / 6) * 5 + (t > 58 && t < 67 ? 42 : 0), 0, 99)),
      SQI: indicesTime.map((t) => clamp(92 - (t > 58 && t < 67 ? 35 : 0) - (t > 122 && t < 128 ? 28 : 0), 0, 100)),
    },
    events: [
      { label: "induccion", time: 8 },
      { label: "intubacion", time: 16 },
      { label: "incision", time: 44 },
      { label: "mantenimiento", time: 70 },
      { label: "despertar", time: 122 },
      { label: "extubacion", time: 138 },
    ],
  };
}

function gaussian(value, mean, sigma) {
  return Math.exp(-((value - mean) ** 2) / (2 * sigma ** 2));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
