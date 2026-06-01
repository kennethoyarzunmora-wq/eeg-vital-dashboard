const state = {
  data: null,
  currentCaseId: null,
  compactClinicalView: true,
  visibleSignals: new Set(["qCON", "qNOX", "BSR", "EMG", "SQI"]),
  events: [],
  currentRange: null,
  dsa: {
    palette: "conoxLite",
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
  dsa: [0.525, 1],
  qCON: [0.42, 0.52],
  qNOX: [0.315, 0.415],
  BSR: [0.21, 0.31],
  EMG: [0.105, 0.205],
  SQI: [0, 0.1],
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
const defaultRemoteApiBase = "https://eeg-vital-dashboard-api.onrender.com";
const apiStorageKey = "eegVitalDashboardApiBase";
const defaultApiBase = isLocalDashboard ? window.location.origin : defaultRemoteApiBase;

const elements = {
  fileInput: document.getElementById("fileInput"),
  resetZoomButton: document.getElementById("resetZoomButton"),
  clearButton: document.getElementById("clearButton"),
  exportButton: document.getElementById("exportButton"),
  printButton: document.getElementById("printButton"),
  applyRangeButton: document.getElementById("applyRangeButton"),
  applyDsaButton: document.getElementById("applyDsaButton"),
  paletteSelect: document.getElementById("paletteSelect"),
  powerMin: document.getElementById("powerMin"),
  powerMax: document.getElementById("powerMax"),
  cleanDsaToggle: document.getElementById("cleanDsaToggle"),
  backendUrl: document.getElementById("backendUrl"),
  saveBackendButton: document.getElementById("saveBackendButton"),
  rangeStart: document.getElementById("rangeStart"),
  rangeEnd: document.getElementById("rangeEnd"),
  message: document.getElementById("message"),
  dsaStatus: document.getElementById("dsaStatus"),
  eventType: document.getElementById("eventType"),
  eventTime: document.getElementById("eventTime"),
  addEventButton: document.getElementById("addEventButton"),
  eventList: document.getElementById("eventList"),
  analysisList: document.getElementById("analysisList"),
  patientAge: document.getElementById("patientAge"),
  patientCode: document.getElementById("patientCode"),
  procedureDate: document.getElementById("procedureDate"),
  hospital: document.getElementById("hospital"),
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
  patientSummary: document.getElementById("patientSummary"),
  legendSummary: document.getElementById("legendSummary"),
};

document.addEventListener("DOMContentLoaded", () => {
  elements.fileInput.addEventListener("change", handleFileUpload);
  elements.resetZoomButton.addEventListener("click", resetZoom);
  elements.clearButton.addEventListener("click", clearDashboard);
  elements.exportButton.addEventListener("click", exportDashboardData);
  elements.printButton.addEventListener("click", printDashboard);
  elements.applyRangeButton.addEventListener("click", applyManualRange);
  elements.applyDsaButton.addEventListener("click", applyDsaSettings);
  elements.saveBackendButton.addEventListener("click", saveBackendUrl);
  elements.cleanDsaToggle.addEventListener("change", () => {
    state.dsa.clean = elements.cleanDsaToggle.checked;
    renderDsa();
  });
  elements.addEventButton.addEventListener("click", addManualEvent);
  elements.savePatientButton.addEventListener("click", savePatientData);
  elements.saveCaseButton.addEventListener("click", saveCurrentCase);
  elements.saveCommentsButton.addEventListener("click", saveCaseComments);
  elements.refreshCasesButton.addEventListener("click", loadCaseList);

  document.querySelectorAll("[data-signal]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const signal = event.target.dataset.signal;
      event.target.checked ? state.visibleSignals.add(signal) : state.visibleSignals.delete(signal);
      renderIndices();
    });
  });

  clearDashboard({ silent: true });
  elements.backendUrl.value = getApiBase();
  loadCaseList();
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
  showMessage(`Procesando archivo .vital en Python (${apiBase}). Esto puede tardar algunos minutos segun el tamano del registro.`);
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
      `No se pudo procesar el .vital. Revisa que el servidor Python este activo y que la URL configurada sea correcta. Detalle: ${error.message}`,
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
    elements.caseComments.value = record.comments || "";
    loadDashboard(record.analysis, record.source_file_name || file.name);
    state.currentCaseId = record.id;
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
  elements.printButton.disabled = isLoading;
  elements.saveBackendButton.disabled = isLoading;
  elements.saveCaseButton.disabled = isLoading;
  elements.saveCommentsButton.disabled = isLoading;
}

function getApiBase() {
  return sanitizeApiBase(localStorage.getItem(apiStorageKey) || defaultApiBase);
}

function sanitizeApiBase(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

async function saveBackendUrl() {
  const apiBase = sanitizeApiBase(elements.backendUrl.value);
  if (!apiBase) {
    showMessage("Ingresa la URL del servidor Python.");
    return;
  }

  localStorage.setItem(apiStorageKey, apiBase);
  elements.backendUrl.value = apiBase;

  try {
    const response = await fetch(`${apiBase}/api/health`, { method: "GET" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    showMessage("Servidor Python conectado correctamente.");
  } catch (error) {
    showMessage(`URL guardada, pero no se pudo confirmar conexion con Python. Detalle: ${error.message}`);
  }
}

function loadDashboard(rawData, fileName) {
  state.data = normalizeData(rawData);
  state.currentCaseId = null;
  state.events = [...state.data.events];
  state.currentRange = null;
  loadPatientFromMetadata();
  updateFileName(fileName);
  updateSummary();
  updateRangeInputs();
  renderPatientSummary();
  renderAll();
  showMessage("");
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
  renderDsa();
  renderBands();
  renderIndices();
  renderEvents();
  renderAnalysis();
  renderLegendSummary();
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
    title: { text: title, standoff: 4, font: { size: 11, color } },
    gridcolor: "#132033",
    zerolinecolor: "#253246",
    tickfont: { size: 9 },
    range: [0, 100],
    fixedrange: false,
  });

  return {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "#050b14",
    margin: { l: 46, r: 44, t: 2, b: 24 },
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

async function openCase(caseId) {
  try {
    const response = await fetch(`${getApiBase()}/api/cases/${caseId}`);
    const record = await response.json();
    if (!response.ok) throw new Error(record.error || "No se pudo abrir el caso.");
    fillCaseForm(record);
    loadDashboard(record.analysis, record.source_file_name);
    state.currentCaseId = record.id;
    elements.caseComments.value = record.comments || "";
    showMessage("Caso cargado desde la base local.");
  } catch (error) {
    showMessage(`No se pudo abrir el caso. Detalle: ${error.message}`);
  }
}

function fillCaseForm(record) {
  elements.patientCode.value = record.patient_code || "";
  elements.procedureDate.value = record.procedure_date || "";
  elements.hospital.value = record.hospital || "";
  elements.surgeryType.value = record.surgery_type || "";
  elements.anesthesiaType.value = record.anesthesia_type || "";
}

async function saveCurrentCase() {
  showMessage(
    state.currentCaseId
      ? "El caso actual ya esta guardado. Puedes actualizar comentarios."
      : "Para guardar un caso nuevo, carga el archivo desde Cargar archivo en la version de escritorio.",
  );
}

async function saveCaseComments() {
  if (!state.currentCaseId) {
    showMessage("Primero abre o importa un caso guardado.");
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
  state.events.push({ label: elements.eventType.value, time });
  elements.eventTime.value = "";
  renderAll();
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
  state.patient = { age: "", gender: "", height: "", weight: "", pkpdModel: "" };
  state.dsa = { palette: "conoxLite", min: 0.62, max: 0.85, clean: true };
  elements.patientCode.value = "";
  elements.procedureDate.value = "";
  elements.hospital.value = "";
  elements.surgeryType.value = "";
  elements.anesthesiaType.value = "";
  elements.caseComments.value = "";
  elements.patientAge.value = "";
  elements.patientGender.value = "";
  elements.patientHeight.value = "";
  elements.patientWeight.value = "";
  elements.pkpdModel.value = "";
  elements.fileInput.value = "";
  elements.paletteSelect.value = "conoxLite";
  elements.powerMin.value = 0.62;
  elements.powerMax.value = 0.85;
  elements.cleanDsaToggle.checked = true;
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
