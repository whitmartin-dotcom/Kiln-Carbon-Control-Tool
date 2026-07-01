/**
 * Kiln Carbon Control AI - Core Operating System
 * Multi-Variable Predictive Regression Module
 */

// ── Application Memory Cache State Contract ──
const AppState = {
  aiModel: {
    intercept: 15.12,
    w_pellet: -0.05,     
    w_casi: 1.54,        
    w_zn: -0.62,         
    rmse: 0.25 
  },
  prevFeedMoist: null,
  prevCarbMoist: null,
  rawFileHeaders: [],
  rawFileRows: [],
  databaseHistory: [],
  shiftLog: [],
  cycle: 1,
  pipeline: [
    { dry_feed_tph: 16.2, applied_carbon_pct: 15.1 },
    { dry_feed_tph: 15.9, applied_carbon_pct: 15.3 }
  ],
  zincChartInstance: null,
  chartLabels: [],
  actualZincData: [],
  acceptableZoneData: []
};

// ── Static DOM Elements Cache Configuration ──
const DOM = {
  navActive: document.getElementById('nav-active'),
  navHistory: document.getElementById('nav-history'),
  activeTabView: document.getElementById('active-tab-view'),
  historyTabView: document.getElementById('history-tab-view'),
  hdrStatus: document.getElementById('hdr-status'),
  wetFeed: document.getElementById('wet_feed'),
  caSi: document.getElementById('ca_si'),
  feedMoist: document.getElementById('feed_moist'),
  carbMoist: document.getElementById('carb_moist'),
  znGrade: document.getElementById('zn_grade'),
  hintFeedMoist: document.getElementById('hint-feed_moist'),
  hintCarbMoist: document.getElementById('hint-carb_moist'),
  btnClear: document.getElementById('btn-clear'),
  btnShowConfirm: document.getElementById('btn-show-confirm'),
  btnHideConfirm: document.getElementById('btn-hide-confirm'),
  btnRunAi: document.getElementById('btn-run-ai'),
  confirmPanel: document.getElementById('confirm-panel'),
  confirmTable: document.getElementById('confirm-table'),
  mandateBody: document.getElementById('mandate-body'),
  chartWrap: document.getElementById('chart-wrap'),
  trendChart: document.getElementById('trendChart'),
  diagPanel: document.getElementById('diag-panel'),
  diagRows: document.getElementById('diag-rows'),
  statusMsg: document.getElementById('status-msg'),
  pipeTrack: document.getElementById('pipe-track'),
  logEntries: document.getElementById('log-entries'),
  csvDropzone: document.getElementById('csv-dropzone'),
  csvFile: document.getElementById('csv-file'),
  csvPrompt: document.getElementById('csv-prompt'),
  csvMapperArea: document.getElementById('csv-mapper-area'),
  btnTrain: document.getElementById('btn-train'),
  mapTs: document.getElementById('map-ts'),
  mapFeed: document.getElementById('map-feed'),
  mapCarb: document.getElementById('map-carb'),
  mapCasi: document.getElementById('map-casi'),
  mapZn: document.getElementById('map-zn'),
  aiIntercept: document.getElementById('ai-intercept'),
  aiW1: document.getElementById('ai-w1'),
  aiW2: document.getElementById('ai-w2'),
  aiW3: document.getElementById('ai-w3'),
  aiRmse: document.getElementById('ai-rmse')
};

// ── Event Execution Wiring ──
DOM.navActive.addEventListener('click', function() { switchTab('active-tab-view', this); });
DOM.navHistory.addEventListener('click', function() { switchTab('history-tab-view', this); });
DOM.btnClear.addEventListener('click', clearInputs);
DOM.btnShowConfirm.addEventListener('click', showConfirm);
DOM.btnHideConfirm.addEventListener('click', hideConfirm);
DOM.btnRunAi.addEventListener('click', runAiCalculation);
DOM.csvDropzone.addEventListener('click', () => DOM.csvFile.click());
DOM.csvFile.addEventListener('change', function() { handleHistoryImport(this.files[0]); });
DOM.btnTrain.addEventListener('click', commitImportedData);

/**
 * Executes a clean operational tab view shift.
 * @param {string} viewId - Target layout view matching node configurations.
 * @param {HTMLElement} btnEl - Active selection controller element.
 */
function switchTab(viewId, btnEl) {
  document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  btnEl.classList.add('active');
}

/**
 * Initializes the ChartJS line graphics interface.
 */
function initChart() {
  const ctx = DOM.trendChart.getContext('2d');
  Chart.defaults.color = '#7a8099';
  Chart.defaults.font.family = "'Segoe UI', system-ui, sans-serif";
  
  AppState.zincChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: AppState.chartLabels,
      datasets: [
        {
          label: 'Acceptable Range (0-2%)',
          data: AppState.acceptableZoneData,
          borderColor: '#27c97a',
          backgroundColor: 'rgba(39, 201, 122, 0.15)',
          borderWidth: 1,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: 'origin',
          tension: 0
        },
        {
          label: 'Lab Zinc % (Actual)',
          data: AppState.actualZincData,
          borderColor: '#4a9eff',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 4,
          tension: 0.3,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10 } } },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        y: { 
          grid: { color: '#2a2f3d' }, 
          min: 0.0,
          max: 8.0 
        },
        x: { grid: { display: false } }
      }
    }
  });
}

/**
 * Appends standard running run elements straight into graph data structures.
 * @param {number} cycleNum - Present numerical shift index block.
 * @param {number} actualZn - Evaluated chemical asset mass concentration.
 */
function updateChart(cycleNum, actualZn) {
  if (!AppState.zincChartInstance) initChart();
  DOM.chartWrap.style.display = 'block';
  
  AppState.chartLabels.push(`C-${cycleNum}`);
  AppState.actualZincData.push(actualZn);
  AppState.acceptableZoneData.push(2.0);

  if (AppState.chartLabels.length > 10) {
    AppState.chartLabels.shift();
    AppState.actualZincData.shift();
    AppState.acceptableZoneData.shift();
  }
  
  AppState.zincChartInstance.update();
}

/**
 * Safe, fault-tolerant historical storage handler block.
 * @param {File} file - Blob dataset container from modern browser payload.
 */
function handleHistoryImport(file) {
  if (!file) return;
  DOM.csvPrompt.textContent = `AI Core Training on: ${file.name}...`;
  
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      if (json.length < 5) { 
        alert('Insufficient historical lines to train multi-variable model.'); 
        return; 
      }
      
      AppState.rawFileHeaders = json[0].map(h => String(h).trim());
      AppState.rawFileRows = json.slice(1).filter(r => r.some(c => c !== ''));

      populateSelectFields();

      const tsVal = DOM.mapTs.value;
      const feedVal = DOM.mapFeed.value;
      const carbVal = DOM.mapCarb.value;
      const casiVal = DOM.mapCasi.value;
      const znVal = DOM.mapZn.value;

      if (tsVal && feedVal && carbVal && casiVal && znVal) {
        DOM.csvMapperArea.style.display = 'none';
        commitImportedData();
      } else {
        DOM.csvMapperArea.style.display = 'block';
      }
    } catch (err) {
      console.error("Critical Ingestion System Interruption: ", err);
      DOM.csvPrompt.textContent = "❌ Parsing Failure. File Matrix structure abnormal.";
      alert("System encountered layout matrix parsing abnormalities mapping target parameters.");
    }
  };
  reader.readAsArrayBuffer(file);
}

/**
 * Automates smart header matching configurations across extracted structures.
 */
function populateSelectFields() {
  const fields = [DOM.mapTs, DOM.mapFeed, DOM.mapCarb, DOM.mapCasi, DOM.mapZn];
  fields.forEach(el => {
    el.innerHTML = AppState.rawFileHeaders.map(h => `<option value="${h}">${h}</option>`).join('');
  });

  const match = (kws, el) => {
    const found = AppState.rawFileHeaders.find(h => kws.some(kw => h.toLowerCase().includes(kw)));
    if (found) el.value = found;
  };
  match(['date', 'time', 'timestamp'], DOM.mapTs);
  match(['pellet', 'feed', 'tonnage', 'tph'], DOM.mapFeed);
  match(['carbon', 'reductant', 'rate', 'c%'], DOM.mapCarb);
  match(['ca/si', 'basi', 'flux', 'ratio'], DOM.mapCasi);
  match(['zinc', 'zn', 'grade'], DOM.mapZn);
}

/**
 * Maps raw matrix values directly into core application parameters.
 */
function commitImportedData() {
  const feedCol = AppState.rawFileHeaders.indexOf(DOM.mapFeed.value);
  const carbCol = AppState.rawFileHeaders.indexOf(DOM.mapCarb.value);
  const casiCol = AppState.rawFileHeaders.indexOf(DOM.mapCasi.value);
  const znCol = AppState.rawFileHeaders.indexOf(DOM.mapZn.value);

  AppState.databaseHistory = AppState.rawFileRows.map(row => {
    return {
      feed: parseFloat(row[feedCol]) || 0,
      carbon: parseFloat(row[carbCol]) || 15.0,
      casi: parseFloat(row[casiCol]) || 1.20,
      zn: parseFloat(row[znCol]) || 2.0
    };
  }).filter(item => item.feed > 0 && !isNaN(item.zn));

  trainPredictiveAiModel();

  const lastRows = AppState.databaseHistory.slice(-2);
  AppState.pipeline = lastRows.map(e => ({ dry_feed_tph: e.feed * 0.92, applied_carbon_pct: e.carbon }));

  if (!AppState.zincChartInstance) initChart();
  
  AppState.chartLabels.length = 0;
  AppState.actualZincData.length = 0;
  AppState.acceptableZoneData.length = 0;

  const recentHistory = AppState.databaseHistory.slice(-10);
  recentHistory.forEach((row, index) => {
    AppState.chartLabels.push(`Hist-${index + 1}`);
    AppState.actualZincData.push(row.zn);
    AppState.acceptableZoneData.push(2.0);
  });
  
  AppState.zincChartInstance.update();

  DOM.hdrStatus.textContent = `✓ Adaptive Model Synced (${AppState.databaseHistory.length} Rows)`;
  DOM.hdrStatus.className = "hist-status loaded";
  DOM.csvPrompt.textContent = `✅ Dynamic Machine Learning Grid Locked In!`;
  DOM.csvMapperArea.style.display = 'none'; 
  
  updateHistoryUI();
  renderPipeline();
localStorage.setItem('kiln_ai_history', JSON.stringify(AppState.databaseHistory));
}

/**
 * Refreshes static numeric displays reflecting active matrix weights.
 */
function updateHistoryUI() {
  DOM.aiIntercept.textContent = AppState.aiModel.intercept.toFixed(4);
  DOM.aiW1.textContent = AppState.aiModel.w_pellet.toFixed(4);
  DOM.aiW2.textContent = AppState.aiModel.w_casi.toFixed(4);
  DOM.aiW3.textContent = AppState.aiModel.w_zn.toFixed(4);
  DOM.aiRmse.textContent = `±${AppState.aiModel.rmse.toFixed(2)}%`;
}

/**
 * Solves standard Multi-Variable Ordinary Least Squares Regression equations 
 * updating baseline intercept calculations dynamically.
 */
function trainPredictiveAiModel() {
  const n = AppState.databaseHistory.length;
  if (n === 0) return;
  
  let sum_y = 0, sum_x1 = 0, sum_x2 = 0, sum_x3 = 0;
  
  AppState.databaseHistory.forEach(d => {
    sum_y += d.carbon; sum_x1 += d.feed; sum_x2 += d.casi; sum_x3 += d.zn;
  });

  const mean_y = sum_y / n;
  const mean_x1 = sum_x1 / n;
  const mean_x2 = sum_x2 / n;
  const mean_x3 = sum_x3 / n;

  let num1 = 0, den1 = 0, num2 = 0, den2 = 0, num3 = 0, den3 = 0;
  AppState.databaseHistory.forEach(d => {
    num1 += (d.feed - mean_x1) * (d.carbon - mean_y); den1 += Math.pow(d.feed - mean_x1, 2);
    num2 += (d.casi - mean_x2) * (d.carbon - mean_y); den2 += Math.pow(d.casi - mean_x2, 2);
    num3 += (d.zn - mean_x3) * (d.carbon - mean_y); den3 += Math.pow(d.zn - mean_x3, 2);
  });

  if (den1 !== 0) AppState.aiModel.w_pellet = num1 / den1;
  if (den2 !== 0) AppState.aiModel.w_casi = num2 / den2;
  if (den3 !== 0) AppState.aiModel.w_zn = num3 / den3;
  
  AppState.aiModel.intercept = mean_y - (AppState.aiModel.w_pellet * mean_x1) - (AppState.aiModel.w_casi * mean_x2) - (AppState.aiModel.w_zn * mean_x3);
  
  let sse = 0;
  AppState.databaseHistory.forEach(d => {
    let predicted_carbon = AppState.aiModel.intercept + (AppState.aiModel.w_pellet * d.feed) + (AppState.aiModel.w_casi * d.casi) + (AppState.aiModel.w_zn * d.zn);
    sse += Math.pow(predicted_carbon - d.carbon, 2);
  });
  
  AppState.aiModel.rmse = Math.sqrt(sse / n) || 0.25;
}

/**
 * Drives running core feed targets using actively mapped parameter baselines.
 */
function runAiCalculation() {
  const wf = parseFloat(DOM.wetFeed.value);
  const cs = parseFloat(DOM.caSi.value || 1.20);
  const fm = parseFloat(DOM.feedMoist.value);
  const cm = parseFloat(DOM.carbMoist.value);
  const zn = parseFloat(DOM.znGrade.value);

  const dryFeedWeight = wf * (1.0 - fm / 100.0);
  
  const TARGET_ZINC = 0.0;
  const zincErrorDelta = zn - TARGET_ZINC; 
  
  let predictedCarbonTarget = AppState.aiModel.intercept + (AppState.aiModel.w_pellet * dryFeedWeight) + (AppState.aiModel.w_casi * cs) + (AppState.aiModel.w_zn * TARGET_ZINC);

  if (zincErrorDelta > 0) {
    predictedCarbonTarget += (zincErrorDelta * Math.abs(AppState.aiModel.w_zn) * 0.7);
  } else {
    predictedCarbonTarget -= (Math.abs(zincErrorDelta) * Math.abs(AppState.aiModel.w_zn) * 0.4);
  }

  if (predictedCarbonTarget > 18.5) predictedCarbonTarget = 18.5;
  if (predictedCarbonTarget < 12.0) predictedCarbonTarget = 12.0;

  const targetDryCarbonTph = (predictedCarbonTarget / 100.0) * dryFeedWeight;
  const wetCarbonRequiredTph = targetDryCarbonTph / (1.0 - cm / 100.0);
  const scaleSetpointRatioPct = (wetCarbonRequiredTph / wf) * 100.0;

  AppState.databaseHistory.push({ feed: dryFeedWeight, carbon: predictedCarbonTarget, casi: cs, zn: zn });
  trainPredictiveAiModel();
  updateHistoryUI(); 
  
  updateChart(AppState.cycle, zn);
  
  localStorage.setItem('kiln_ai_history', JSON.stringify(AppState.databaseHistory));
  
  AppState.pipeline.shift();
  AppState.pipeline.push({ dry_feed_tph: dryFeedWeight, applied_carbon_pct: predictedCarbonTarget });
  AppState.prevFeedMoist = fm; 
  AppState.prevCarbMoist = cm;

  DOM.mandateBody.innerHTML = `
    <div class="mandate-row">
      <div class="mlabel">Calculated Wet Carbon Target <span style="color:var(--amber); text-transform:none">(±${AppState.aiModel.rmse.toFixed(2)}% Conf)</span></div>
      <div class="mval">${wetCarbonRequiredTph.toFixed(3)}</div>
      <div class="munit">Tons Per Hour (TPH)</div>
    </div>
    <div class="mandate-row" style="margin-top: 6px;">
      <div class="mlabel">Feeder Controller Scale Setpoint</div>
      <div class="mval" style="color:var(--purple);">${scaleSetpointRatioPct.toFixed(3)}</div>
      <div class="munit">% of Total Mass Flow Weight Ratio</div>
    </div>`;

  DOM.diagRows.innerHTML = `
    <div class="info-row"><span class="ikey">Calculated Dry Feed Mass</span><span class="ival">${dryFeedWeight.toFixed(2)} TPH</span></div>
    <div class="info-row"><span class="ikey">Statistical AI Intercept Base</span><span class="ival">${AppState.aiModel.intercept.toFixed(2)}%</span></div>
    <div class="info-row"><span class="ikey">Ca/Si Basicity Contribution</span><span class="ival" style="color:var(--amber); font-weight:bold;">+${(AppState.aiModel.w_casi * cs).toFixed(2)}%</span></div>
    <div class="info-row"><span class="ikey">Zinc Feedback Deviation Adjust</span><span class="ival">${zincErrorDelta > 0 ? '+' : ''}${(zincErrorDelta * AppState.aiModel.w_zn * -0.7).toFixed(2)}%</span></div>`;

  DOM.statusMsg.textContent = `Continuous Learning Triggered: Model ingested cycle ${AppState.cycle} data and retrained matrix weights to account for new basicity coefficient (${cs.toFixed(2)}).`;
  DOM.statusMsg.className = `status-msg good`;
  DOM.diagPanel.style.display = 'block';

  const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  AppState.shiftLog.unshift(`Cycle ${AppState.cycle} [${timeString}]: Retrained on Lab Zn ${zn.toFixed(2)}% → New Model Base: ${AppState.aiModel.intercept.toFixed(2)}`);
  DOM.logEntries.innerHTML = AppState.shiftLog.map(log => `<div class="log-entry">${log}</div>`).join('');

  AppState.cycle++; 
  renderPipeline(); 
  hideConfirm(); 
  clearInputs();
}

/**
 * Renders data confirmation modals preventing erratic telemetry entry.
 */
function showConfirm() {
  if (!DOM.wetFeed.value || !DOM.znGrade.value) {
    alert('Please enter active production figures before running AI calculations.'); 
    return;
  }
  if (DOM.feedMoist.value === '' && AppState.prevFeedMoist !== null) { 
    DOM.feedMoist.value = AppState.prevFeedMoist; 
    DOM.feedMoist.classList.add('sticky'); 
  }
  if (DOM.carbMoist.value === '' && AppState.prevCarbMoist !== null) { 
    DOM.carbMoist.value = AppState.prevCarbMoist; 
    DOM.carbMoist.classList.add('sticky'); 
  }

  const metrics = [
    ['Wet Ore Mass Flow Tonnage', DOM.wetFeed.value, 'TPH'],
    ['Flux Ratio (Ca/Si Structure)', DOM.caSi.value || '1.20', ''],
    ['Raw Feed Matrix Moisture', DOM.feedMoist.value || '8.0', '%'],
    ['Carbon Fuel Source Moisture', DOM.carbMoist.value || '5.0', '%'],
    ['Byproduct Discharged Zinc Grade', DOM.znGrade.value, '%']
  ];
  DOM.confirmTable.innerHTML = metrics.map(([lbl, val, unit]) => `
    <tr><td class="cf-label">${lbl}</td><td class="cf-val">${parseFloat(val).toFixed(2)}</td><td class="cf-unit">${unit}</td></tr>`).join('');
  DOM.confirmPanel.style.display = 'block';
}

/**
 * Refreshes current downstream process track displays.
 */
function renderPipeline() {
  const layouts = [
    { label: 'Exiting Kiln Discharge Right Now', cls: 'exiting' },
    { label: 'Mid-Kiln Zone (Exits in 2 Hours)', cls: 'active' }
  ];
  DOM.pipeTrack.innerHTML = AppState.pipeline.map((p, i) => `
    <div class="pipe-slot ${layouts[i].cls}">
      <div class="ps-label">${layouts[i].label}</div>
      <div class="ps-val">${p.applied_carbon_pct.toFixed(2)}% Carbon Target</div>
      <div class="ps-val" style="font-size:10px; color:var(--text-dim); margin-top:2px">Dry Weight: ${p.dry_feed_tph.toFixed(1)} TPH</div>
    </div>`).join('');
}

function hideConfirm() { DOM.confirmPanel.style.display = 'none'; }

/**
 * Resets dynamic input form zones gracefully.
 */
function clearInputs() {
  [DOM.wetFeed, DOM.caSi, DOM.znGrade, DOM.feedMoist, DOM.carbMoist].forEach(el => {
    el.value = ''; 
    el.classList.remove('sticky');
  });
  if (AppState.prevFeedMoist !== null) DOM.hintFeedMoist.innerHTML = `<span class="blue">Prior: ${AppState.prevFeedMoist.toFixed(1)}% (Leave blank to inherit)</span>`;
  if (AppState.prevCarbMoist !== null) DOM.hintCarbMoist.innerHTML = `<span class="blue">Prior: ${AppState.prevCarbMoist.toFixed(1)}% (Leave blank to inherit)</span>`;
}

// ── Initial Boot Sequences ──
(function bootstrapSavedData() {
  const savedData = localStorage.getItem('kiln_ai_history');
  
  if (savedData) {
    try {
      // 1. Pull the data back into the App memory
      AppState.databaseHistory = JSON.parse(savedData);
      
      // 2. Retrain the AI model weights instantly
      trainPredictiveAiModel();
      updateHistoryUI();
      
      // 3. Update the UI headers to show it recovered the data
      DOM.hdrStatus.textContent = `✓ Auto-Synced Saved Session (${AppState.databaseHistory.length} Rows)`;
      DOM.hdrStatus.className = "hist-status loaded";
      
      // 4. Pre-populate the chart with the last 10 historical entries
      if (!AppState.zincChartInstance) initChart();
      const recentHistory = AppState.databaseHistory.slice(-10);
      recentHistory.forEach((row, index) => {
        AppState.chartLabels.push(`Hist-${index + 1}`);
        AppState.actualZincData.push(row.zn);
        AppState.acceptableZoneData.push(2.0);
      });
      AppState.zincChartInstance.update();
      
      console.log("💾 Persistent browser memory successfully restored.");
    } catch (err) {
      console.error("Failed to restore local session:", err);
      localStorage.removeItem('kiln_ai_history'); // Clean up corrupted data
    }
  }
})();

renderPipeline();
if (!AppState.zincChartInstance) initChart(); // Fallback if no data was restored