// DOM Element Targets Registry
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const dashboard = document.getElementById('dashboard');
const selectX = document.getElementById('select-x');
const selectY = document.getElementById('select-y');
const fileHistoryList = document.getElementById('file-history-list');
const historyCountEl = document.getElementById('history-count');
const historyEmptyState = document.getElementById('history-empty-state');

let currentOperator = 'User_Alpha';
let userWorkspaces = {
    User_Alpha: { history: [], activeIndex: null },
    User_Beta: { history: [], activeIndex: null }
};

let chartInstance = null;

// --- EVENT LISTENERS ---
dropZone.addEventListener('click', () => fileInput.click());

['dragenter', 'dragover'].forEach(name => {
    dropZone.addEventListener(name, (e) => { 
        e.preventDefault(); 
        dropZone.classList.add('border-indigo-500/40', 'bg-indigo-500/5'); 
    }, false);
});

['dragleave', 'drop'].forEach(name => {
    dropZone.addEventListener(name, (e) => { 
        e.preventDefault(); 
        dropZone.classList.remove('border-indigo-500/40', 'bg-indigo-500/5'); 
    }, false);
});

dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length) handleFile(files[0]);
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFile(e.target.files[0]);
});

selectX.addEventListener('change', () => {
    const record = userWorkspaces[currentOperator].history[userWorkspaces[currentOperator].activeIndex];
    record.selectedX = selectX.value;
    calculateMetrics(record);
});

selectY.addEventListener('change', () => {
    const record = userWorkspaces[currentOperator].history[userWorkspaces[currentOperator].activeIndex];
    record.selectedY = selectY.value;
    calculateMetrics(record);
});

// --- CORE LOGIC PIPELINE ---
function switchUser(userKey) {
    currentOperator = userKey;
    const t1 = document.getElementById('tab-user1');
    const t2 = document.getElementById('tab-user2');
    
    if(userKey === 'User_Alpha') {
        t1.className = "text-[10px] py-1.5 rounded text-center font-bold transition-all bg-blue-500/10 text-blue-600 border border-blue-500/20 cursor-pointer";
        t2.className = "text-[10px] py-1.5 rounded text-center font-bold transition-all text-slate-400 hover:text-slate-600 cursor-pointer";
    } else {
        t2.className = "text-[10px] py-1.5 rounded text-center font-bold transition-all bg-blue-500/10 text-blue-600 border border-blue-500/20 cursor-pointer";
        t1.className = "text-[10px] py-1.5 rounded text-center font-bold transition-all text-slate-400 hover:text-slate-600 cursor-pointer";
    }

    renderHistoryList();
    const workspace = userWorkspaces[currentOperator];
    if (workspace.activeIndex !== null) {
        loadHistoryItem(workspace.activeIndex);
    } else {
        dashboard.classList.add('hidden');
        dashboard.style.display = 'none';
    }
}

function handleFile(file) {
    if (!file.name.endsWith('.csv')) return alert('Error: Requires valid .csv structure.');
    const reader = new FileReader();
    reader.onload = (e) => {
        ingestCSVData(file.name, e.target.result);
        // --- INPUT VALUE RESET ---
        // Clears the target element value so the exact same file name can re-trigger a change event
        fileInput.value = '';
    };
    reader.readAsText(file);
}

function ingestCSVData(fileName, rawText) {
    const rows = rawText.split(/\r?\n/).map(r => r.trim()).filter(r => r.length > 0);
    if (rows.length === 0) return;

    const parsedRows = rows.map(row => {
        let matches = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || row.split(',');
        return matches.map(c => c.replace(/^"|"$/g, '').trim());
    });

    let headers = parsedRows[0];
    let dataStartIndex = 1;
    
    // Check if it's a completely raw, headerless numeric file
    if (parsedRows[0].map(c => Number(c)).every(n => !isNaN(n))) {
        headers = parsedRows[0].map((_, i) => `Column ${i + 1}`);
        dataStartIndex = 0;
    }

    const dataRows = parsedRows.slice(dataStartIndex);
    
    // ImageJ unlabelled tracking index patch
    if (dataRows.length > 0 && dataRows[0].length === headers.length + 1) {
        headers.unshift("Index");
    }

    let columnMetadata = {};
    headers.forEach((header, colIdx) => {
        let numericCount = 0, textCount = 0;
        dataRows.forEach(row => {
            if (row[colIdx] === undefined || row[colIdx] === '') return;
            if (!isNaN(Number(row[colIdx]))) numericCount++; else textCount++;
        });
        columnMetadata[header] = { index: colIdx, type: numericCount >= textCount ? 'quantitative' : 'qualitative' };
    });

    const quantitativeHeaders = headers.filter(h => columnMetadata[h].type === 'quantitative');
    
    // Dynamic Fallback Axis Auto-Selection
    const selectedX = headers[0];
    const selectedY = quantitativeHeaders.length > 1 
        ? (quantitativeHeaders[1] === headers[1] && headers.length > 2 ? headers[2] : quantitativeHeaders[1])
        : quantitativeHeaders[0] || headers[0];

    const datasetRecord = {
        name: fileName,
        headers: headers,
        rows: dataRows,
        meta: columnMetadata,
        selectedX: selectedX,
        selectedY: selectedY
    };

    const workspace = userWorkspaces[currentOperator];
    workspace.history.push(datasetRecord);
    workspace.activeIndex = workspace.history.length - 1;

    renderHistoryList();
    loadHistoryItem(workspace.activeIndex);
}

function renderHistoryList() {
    const workspace = userWorkspaces[currentOperator];
    const items = workspace.history;
    historyCountEl.innerText = items.length;

    const domesticItems = fileHistoryList.querySelectorAll('.history-item');
    domesticItems.forEach(el => el.remove());

    if (items.length === 0) {
        historyEmptyState.style.display = 'block';
        return;
    }
    historyEmptyState.style.display = 'none';

    items.forEach((item, idx) => {
        const rowContainer = document.createElement('div');
        const isActive = idx === workspace.activeIndex;
        
        // Flex container to hold the filename and the "x" button inline
        rowContainer.className = `history-item group flex items-center justify-between p-2 rounded border cursor-pointer transition-all text-[10px] uppercase font-bold tracking-tight ${
            isActive ? 'glass-panel-active text-blue-600 bg-white' : 'border-slate-200/60 bg-white/40 text-slate-500 hover:bg-white hover:text-slate-800'
        }`;
        
        // Left side: File icon and name (wrapped in a div that triggers the file load)
        const nameWrapper = document.createElement('div');
        nameWrapper.className = 'truncate flex-1 pr-2';
        nameWrapper.innerHTML = `🗎 ${item.name}`;
        nameWrapper.onclick = () => loadHistoryItem(idx);
        rowContainer.appendChild(nameWrapper);

        // Right side: Interactive delete cross
        const deleteBtn = document.createElement('span');
        deleteBtn.className = 'text-slate-600 hover:text-rose-400 hover:glow-rose px-1 transition-colors text-[11px] font-light cursor-pointer';
        deleteBtn.innerHTML = '&#x2715;'; // Unicode multiplication sign / X cross
        deleteBtn.onclick = (e) => {
            e.stopPropagation(); // Prevents clicking "x" from accidentally loading the file first
            deleteHistoryItem(idx);
        };
        rowContainer.appendChild(deleteBtn);

        fileHistoryList.appendChild(rowContainer);
    });
}

function loadHistoryItem(idx) {
    const workspace = userWorkspaces[currentOperator];
    workspace.activeIndex = idx;
    const record = workspace.history[idx];

    selectX.innerHTML = ''; selectY.innerHTML = '';
    record.headers.forEach(h => {
        const typeLabel = record.meta[h].type === 'quantitative' ? 'NUM' : 'TXT';
        selectX.add(new Option(`${h} (${typeLabel})`, h));
        selectY.add(new Option(`${h} (${typeLabel})`, h));
    });

    selectX.value = record.selectedX;
    selectY.value = record.selectedY;

    calculateMetrics(record);

    // --- VISUAL SYNC FIX ---
    // Forces the sidebar to immediately redraw and shift the active blue outline state
    renderHistoryList();
    // -----------------------
}

function calculateMetrics(record) {
    const idxX = record.meta[record.selectedX].index;
    const idxY = record.meta[record.selectedY].index;
    const isYQuant = record.meta[record.selectedY].type === 'quantitative';

    // Filter trailing empty lines instead of plotting artificial zeros
    let alignmentData = record.rows.map(row => {
        const rawX = row[idxX];
        const rawY = row[idxY];
        const cleanY = (rawY === undefined || rawY === null || rawY.trim() === '') ? NaN : Number(rawY);
        return { x: rawX, y: cleanY };
    }).filter(d => !isNaN(d.y));

    const container = document.getElementById('insights-container');
    container.innerHTML = "";

    if (!isYQuant || alignmentData.length === 0) {
        document.getElementById('stat-count').innerText = alignmentData.length;
        document.getElementById('stat-mean').innerText = "N/A";
        document.getElementById('stat-median').innerText = "N/A";
        document.getElementById('stat-std').innerText = "N/A";
        document.getElementById('stat-outliers').innerText = "0";
        
        const trendEl = document.getElementById('stat-trend');
        trendEl.innerText = "Non-Numeric";
        trendEl.className = "text-[10px] font-bold mt-2 uppercase tracking-wide text-slate-500";

        container.innerHTML = `<div class="p-3 rounded border border-white/5 bg-white/[0.005]">
            <span class="text-indigo-400 font-bold">Qualitative Profile:</span> Target variable [${record.selectedY}] holds non-numeric parameters. Standard quantitative sigma filters cannot map distributions onto string elements.
        </div>`;

        renderChart(alignmentData.map(d => d.x), alignmentData.map(() => 1), record.selectedY, [], alignmentData.map(d => d.y));
        return;
    }

    const rawYValues = alignmentData.map(d => d.y);
    const count = rawYValues.length;
    const mean = rawYValues.reduce((a, b) => a + b, 0) / count;

    const sortedY = [...rawYValues].sort((a, b) => a - b);
    const median = count % 2 !== 0 ? sortedY[Math.floor(count / 2)] : (sortedY[count / 2 - 1] + sortedY[count / 2]) / 2;

    const variance = rawYValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / count;
    const stdDev = Math.sqrt(variance);

    const outlierIndices = [];
    rawYValues.forEach((val, i) => {
        if (stdDev > 0 && Math.abs(val - mean) / stdDev > 2) outlierIndices.push(i);
    });

    let xSum = 0, ySum = 0, xySum = 0, xxSum = 0;
    for (let i = 0; i < count; i++) {
        xSum += i; ySum += rawYValues[i]; xySum += i * rawYValues[i]; xxSum += i * i;
    }
    const slope = (count * xySum - xSum * ySum) / (count * xxSum - xSum * xSum);
    let trendText = "Steady Static", trendClass = "text-slate-400";
    if (slope > 0.005) { trendText = "Positive Drift ↑"; trendClass = "text-emerald-400 glow-green"; }
    else if (slope < -0.005) { trendText = "Negative Drift ↓"; trendClass = "text-rose-400 glow-rose"; }

    document.getElementById('stat-count').innerText = count;
    document.getElementById('stat-mean').innerText = mean.toFixed(3);
    document.getElementById('stat-median').innerText = median.toFixed(3);
    document.getElementById('stat-std').innerText = stdDev.toFixed(3);
    document.getElementById('stat-outliers').innerText = outlierIndices.length;
    
    const trendEl = document.getElementById('stat-trend');
    trendEl.innerText = trendText;
    trendEl.className = `text-[10px] font-bold mt-2 uppercase tracking-wide ${trendClass}`;

    const max = Math.max(...rawYValues);
    const min = Math.min(...rawYValues);

    const insights = [
        `Ingestion trace path mapping array parameter [${record.selectedY}] evaluated over matrix domain tracker [${record.selectedX}].`,
        `Boundary envelope parameters registered high peak target ceiling at <span class="text-white font-bold">${max.toFixed(3)}</span> and low base floor at <span class="text-white font-bold">${min.toFixed(3)}</span>.`,
        `Data density dispersion metrics output variance parameter standard calculation standard deviation = ${stdDev.toFixed(3)}.`,
        outlierIndices.length > 0
            ? `<span class="text-rose-400 font-bold">Anomalous Spike:</span> Engine scanned <span class="text-rose-400 font-bold">${outlierIndices.length}</span> individual array indexes fracturing regular 2-sigma variance limits.`
            : `<span class="text-emerald-400 font-bold">Integrity Pass:</span> Vector dataset remains inside expected static variance parameters.`
    ];

    insights.forEach(text => {
        const item = document.createElement('div');
        item.className = "p-3 rounded border border-white/5 bg-white/[0.005] hover:bg-white/[0.015] transition-colors";
        item.innerHTML = text;
        container.appendChild(item);
    });

    // --- FIT CALCULATOR SEGMENT ---
    const fitType = document.getElementById('select-fit')?.value || 'none';
    let regressionPoints = null;
    let numericX = alignmentData.map((_, idx) => idx); // Fallback uniform domain index mapping

    // Try parsing X column as numerical values for scale-accurate tracking
    const isXQuant = record.meta[record.selectedX].type === 'quantitative';
    if (isXQuant) {
        numericX = alignmentData.map(d => Number(d.x)).filter(x => !isNaN(x));
    }

    if (fitType !== 'none' && numericX.length === rawYValues.length) {
        regressionPoints = [];
        if (fitType === 'linear') {
            const coeffs = fitPolynomial(numericX, rawYValues, 1);
            numericX.forEach(x => regressionPoints.push(coeffs[0] + coeffs[1] * x));
        } else if (fitType === 'poly2') {
            const coeffs = fitPolynomial(numericX, rawYValues, 2);
            numericX.forEach(x => regressionPoints.push(coeffs[0] + coeffs[1] * x + coeffs[2] * Math.pow(x, 2)));
        } else if (fitType === 'poly3') {
            const coeffs = fitPolynomial(numericX, rawYValues, 3);
            numericX.forEach(x => regressionPoints.push(coeffs[0] + coeffs[1] * x + coeffs[2] * Math.pow(x, 2) + coeffs[3] * Math.pow(x, 3)));
        } else if (fitType === 'poly4') {
            const coeffs = fitPolynomial(numericX, rawYValues, 4);
            numericX.forEach(x => regressionPoints.push(coeffs[0] + coeffs[1] * x + coeffs[2] * Math.pow(x, 2) + coeffs[3] * Math.pow(x, 3) + coeffs[4] * Math.pow(x, 4)));
        } else if (fitType === 'spline3') {
            // --- CUBIC SPLINE INTERPOLATION INTERFACE ---
            const splineResult = computeCubicSpline(numericX, rawYValues);
            if (splineResult) {
                regressionPoints = splineResult;
            } else {
                regressionPoints = null;
                alert("Spline Error: Ensure dataset contains at least 3 sorted numeric coordinates.");
            }
        } else if (fitType === 'exponential') {
            // Transform to linear domain via ln(y) -> strict check to prevent taking log of zero/negatives
            const validIndices = rawYValues.map((y, i) => y > 0 ? i : null).filter(v => v !== null);
            const logX = validIndices.map(i => numericX[i]);
            const logY = validIndices.map(i => Math.log(rawYValues[i]));
            
            if (logX.length > 1) {
                const coeffs = fitPolynomial(logX, logY, 1); // Linear fit on logged data
                const a = Math.exp(coeffs[0]);
                const b = coeffs[1];
                numericX.forEach(x => regressionPoints.push(a * Math.exp(b * x)));
            }
        }
    }


    // --- INTEGRATED GRAPH TYPE MATRIX ROUTING ---
    const chartType = document.getElementById('select-chart-type')?.value || 'line';
    
    if (chartType === 'histogram' && isYQuant && alignmentData.length > 0) {
        const totalBins = parseInt(document.getElementById('input-bins').value) || 10;
        const minVal = Math.min(...rawYValues);
        const maxVal = Math.max(...rawYValues);
        const range = maxVal - minVal;
        
        // Handle edge-case constant datasets to avoid divide-by-zero intervals
        const binWidth = range === 0 ? 1 : range / totalBins; 
        
        const binCounts = new Array(totalBins).fill(0);
        const binLabels = new Array(totalBins);

        // Generate mathematical bin range thresholds labels
        for (let i = 0; i < totalBins; i++) {
            const start = minVal + i * binWidth;
            const end = start + binWidth;
            binLabels[i] = `${start.toFixed(2)}-${end.toFixed(2)}`;
        }

        // Allocate elements into respective bins
        rawYValues.forEach(val => {
            let binIdx = Math.floor((val - minVal) / binWidth);
            if (binIdx >= totalBins) binIdx = totalBins - 1; // Safely handle maximum boundary peak
            if (binIdx < 0) binIdx = 0;
            binCounts[binIdx]++;
        });

        // Override graph context mapping specifically for distribution profiling
        renderChart(binLabels, binCounts, `Frequency Count [${record.selectedY}]`, [], null, null, 'bar');
        return;
    }

    // Default route: Standard Regression Processing and Line Plots 
    // (Ensure your existing regression/spline calculation block and the regular renderChart() call stay right below here)
    renderChart(alignmentData.map(d => d.x), rawYValues, record.selectedY, outlierIndices, null, regressionPoints);
}

function updateChartStyles() {
    if (!chartInstance) return;
    
    const xTitle = document.getElementById('input-x-title').value || selectX.value;
    const yTitle = document.getElementById('input-y-title').value || selectY.value;
    const showGrid = document.getElementById('check-grid').checked;
    const showTicks = document.getElementById('check-ticks').checked;

    // Apply adjustments directly to live chart configuration architecture
    chartInstance.options.scales.x.title.text = xTitle;
    chartInstance.options.scales.y.title.text = yTitle;
    
    chartInstance.options.scales.x.grid.display = showGrid;
    chartInstance.options.scales.y.grid.display = showGrid;
    
    chartInstance.options.scales.x.ticks.display = showTicks;
    chartInstance.options.scales.y.ticks.display = showTicks;
    chartInstance.options.scales.x.border.display = showTicks;
    chartInstance.options.scales.y.border.display = showTicks;

    chartInstance.update();
}

function resetZoom() {
    if (chartInstance) chartInstance.resetZoom();
}

function renderChart(xLabels, yValues, yLabel, outlierIndices, textLabels, regressionPoints = null, forcedType = null) {
    const ctx = document.getElementById('analyticsChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    const selectedChartType = forcedType || document.getElementById('select-chart-type')?.value || 'line';
    const isCategorical = textLabels !== null;
    
    let datasetConfig = {
        label: yLabel,
        data: yValues,
        fill: false
    };

    // Style dynamically based on underlying plot type selection
    if (selectedChartType === 'bar') {
        const chosenGap = parseFloat(document.getElementById('select-bar-gap').value) || 0;
        datasetConfig.type = 'bar';
        datasetConfig.backgroundColor = 'rgba(37, 99, 235, 0.65)'; // Transparent clear royal blue bars
        datasetConfig.borderColor = '#2563eb';
        datasetConfig.borderWidth = 1.5;
        // Setting categories layout bar size gaps structure parameters
        datasetConfig.barPercentage = 1 - chosenGap; 
        datasetConfig.categoryPercentage = 1.0; 
    } else {
        datasetConfig.type = isCategorical ? 'bubble' : 'line';
        datasetConfig.borderColor = isCategorical ? 'rgba(148, 163, 184, 0.4)' : '#2563eb';
        datasetConfig.borderWidth = 1.5;
        datasetConfig.tension = 0.05;

        if (isCategorical) {
            datasetConfig.pointBackgroundColor = '#64748b';
            datasetConfig.pointRadius = 4;
            datasetConfig.showLine = false;
        } else {
            datasetConfig.pointBackgroundColor = yValues.map((_, idx) => outlierIndices.includes(idx) ? '#e11d48' : '#2563eb');
            datasetConfig.pointBorderColor = yValues.map((_, idx) => outlierIndices.includes(idx) ? '#e11d48' : '#2563eb');
            datasetConfig.pointRadius = yValues.map((_, idx) => outlierIndices.includes(idx) ? 5 : 1);
        }
    }

    const datasetsArray = [datasetConfig];

    if (selectedChartType !== 'bar' && regressionPoints && regressionPoints.length > 0) {
        datasetsArray.push({
            type: 'line',
            label: 'Analytical Curve Fit',
            data: regressionPoints,
            borderColor: '#ea580c',
            borderWidth: 2,
            borderDash: [4, 4],
            pointRadius: 0,
            fill: false,
            tension: 0.1
        });
    }

    // Capture fallback label configurations strings profiles
    let defaultXTitle = selectX.value;
    if (selectedChartType === 'bar') {
        defaultXTitle = `${selectY.value} Range Intervals`;
    }
    
    const currentXTitle = document.getElementById('input-x-title').value || defaultXTitle;
    const currentYTitle = document.getElementById('input-y-title').value || yLabel;
    const showGrid = document.getElementById('check-grid').checked;
    const showTicks = document.getElementById('check-ticks').checked;

    chartInstance = new Chart(ctx, {
        data: {
            labels: xLabels,
            datasets: datasetsArray
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { 
                    display: (selectedChartType !== 'bar' && regressionPoints !== null),
                    labels: { font: { family: 'monospace', size: 9 }, boxWidth: 12 }
                },
                zoom: {
                    pan: { enabled: true, mode: 'x', threshold: 10 },
                    zoom: { wheel: { enabled: true, speed: 0.08 }, pinch: { enabled: true }, mode: 'x' }
                }
            },
            scales: {
                x: { 
                    grid: { display: showGrid, color: '#e2e8f0', drawTicks: true }, 
                    border: { display: showTicks, color: '#0f172a', width: 1.5 },
                    ticks: { display: showTicks, color: '#0f172a', font: { family: 'monospace', size: 9 } },
                    title: { display: true, text: currentXTitle, color: '#0f172a', font: { family: 'monospace', size: 11, weight: 'bold' } }
                },
                y: { 
                    grid: { display: showGrid, color: '#e2e8f0', drawTicks: true }, 
                    border: { display: showTicks, color: '#0f172a', width: 1.5 },
                    ticks: { display: showTicks, color: '#0f172a', font: { family: 'monospace', size: 9 } },
                    title: { display: true, text: currentYTitle, color: '#0f172a', font: { family: 'monospace', size: 11, weight: 'bold' } }
                }
            }
        }
    });

    dashboard.classList.remove('hidden');
    dashboard.style.display = 'block';
}

// Ensure axis option fields populate correctly upon switching file records
function loadHistoryItem(idx) {
    const workspace = userWorkspaces[currentOperator];
    workspace.activeIndex = idx;
    const record = workspace.history[idx];

    selectX.innerHTML = ''; selectY.innerHTML = '';
    record.headers.forEach(h => {
        const typeLabel = record.meta[h].type === 'quantitative' ? 'NUM' : 'TXT';
        selectX.add(new Option(`${h} (${typeLabel})`, h));
        selectY.add(new Option(`${h} (${typeLabel})`, h));
    });

    selectX.value = record.selectedX;
    selectY.value = record.selectedY;

    // Synchronize publication titles back to raw column fields initially
    document.getElementById('input-x-title').value = record.selectedX;
    document.getElementById('input-y-title').value = record.selectedY;

    calculateMetrics(record);
    renderHistoryList();
}

function deleteHistoryItem(idx) {
    const workspace = userWorkspaces[currentOperator];
    
    workspace.history.splice(idx, 1);

    if (workspace.history.length === 0) {
        workspace.activeIndex = null;
        dashboard.classList.add('hidden');
        dashboard.style.display = 'none';
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
    } else if (workspace.activeIndex === idx) {
        workspace.activeIndex = Math.min(idx, workspace.history.length - 1);
        loadHistoryItem(workspace.activeIndex);
    } else if (workspace.activeIndex > idx) {
        workspace.activeIndex--;
    }

    // --- SAFETY RESET ---
    fileInput.value = '';
    
    renderHistoryList();
}

// Solves a system of linear equations using Gaussian Elimination (Ax = B)
function solveGaussian(A, B) {
    const n = B.length;
    for (let i = 0; i < n; i++) {
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k;
        }
        [A[i], A[maxRow]] = [A[maxRow], A[i]];
        [B[i], B[maxRow]] = [B[maxRow], B[i]];

        for (let k = i + 1; k < n; k++) {
            const c = -A[k][i] / A[i][i];
            for (let j = i; j < n; j++) {
                A[k][j] += c * A[i][j];
            }
            B[k] += c * B[i];
        }
    }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        let sum = 0;
        for (let j = i + 1; j < n; j++) sum += A[i][j] * x[j];
        x[i] = (B[i] - sum) / A[i][i];
    }
    return x; // Returns array of coefficients [a0, a1, a2...]
}

// Polynomial Regression Engine
function fitPolynomial(xArr, yArr, order) {
    const n = xArr.length;
    const matrixA = Array.from({ length: order + 1 }, () => new Array(order + 1).fill(0));
    const vectorB = new Array(order + 1).fill(0);

    for (let i = 0; i <= order; i++) {
        for (let j = 0; j <= order; j++) {
            matrixA[i][j] = xArr.reduce((sum, x) => sum + Math.pow(x, i + j), 0);
        }
        vectorB[i] = xArr.reduce((sum, x, idx) => sum + yArr[idx] * Math.pow(x, i), 0);
    }
    return solveGaussian(matrixA, vectorB);
}

function runCurveFit() {
    const workspace = userWorkspaces[currentOperator];
    if (workspace.activeIndex === null) return;
    calculateMetrics(workspace.history[workspace.activeIndex]);
}

// Computes coefficients for a Natural Cubic Spline and interpolates high-resolution steps
function computeCubicSpline(xArr, yArr, resolutionPoints = 200) {
    const n = xArr.length;
    if (n < 3) return null; // Splines require at least 3 points to build curvature equations

    // Ensure data is sorted by X domain for interval tracking
    const points = xArr.map((x, i) => ({ x: x, y: yArr[i] })).sort((a, b) => a.x - b.x);
    const X = points.map(p => p.x);
    const Y = points.map(p => p.y);

    const h = new Array(n - 1);
    for (let i = 0; i < n - 1; i++) h[i] = X[i + 1] - X[i];

    // Tridiagonal Matrix System tracking for internal curvature values (c coefficients)
    const a = new Array(n).fill(0);
    const b = new Array(n).fill(0);
    const c = new Array(n).fill(0);
    const d = new Array(n).fill(0);

    for (let i = 1; i < n - 1; i++) {
        a[i] = h[i - 1];
        b[i] = 2 * (h[i - 1] + h[i]);
        c[i] = h[i];
        d[i] = 3 * ((Y[i + 1] - Y[i]) / h[i] - (Y[i] - Y[i - 1]) / h[i - 1]);
    }

    // Natural boundary conditions: second derivatives at endpoints are zero
    b[0] = 1; b[n - 1] = 1;

    // Thomas Algorithm (Forward Sweep to solve tridiagonal matrix)
    const cPrime = new Array(n).fill(0);
    const dPrime = new Array(n).fill(0);
    cPrime[0] = c[0] / b[0];
    dPrime[0] = d[0] / b[0];

    for (let i = 1; i < n; i++) {
        const m = b[i] - a[i] * cPrime[i - 1];
        cPrime[i] = c[i] / m;
        dPrime[i] = (d[i] - a[i] * dPrime[i - 1]) / m;
    }

    // Back Substitution to isolate C coefficients
    const C = new Array(n).fill(0);
    C[n - 1] = dPrime[n - 1];
    for (let i = n - 2; i >= 0; i--) {
        C[i] = dPrime[i] - cPrime[i] * C[i + 1];
    }

    // Deriving localized polynomial coefficients: S_i(x) = A_i + B_i(x - x_i) + C_i(x - x_i)^2 + D_i(x - x_i)^3
    const A = Y;
    const B = new Array(n - 1);
    const D = new Array(n - 1);

    for (let i = 0; i < n - 1; i++) {
        B[i] = (Y[i + 1] - Y[i]) / h[i] - h[i] * (2 * C[i] + C[i + 1]) / 3;
        D[i] = (C[i + 1] - C[i]) / (3 * h[i]);
    }

    // Generate continuous high-resolution visualization data mapping across the boundaries
    const splineOutput = [];
    const minX = X[0];
    const maxX = X[n - 1];
    const step = (maxX - minX) / (resolutionPoints - 1);

    // Generate step points mapped directly matching the original labels array keys length
    for (let k = 0; k < xArr.length; k++) {
        const targetX = xArr[k];
        // Find corresponding spline segment interval
        let i = n - 2;
        for (let j = 0; j < n - 1; j++) {
            if (targetX >= X[j] && targetX <= X[j + 1]) {
                i = j;
                break;
            }
        }
        const dx = targetX - X[i];
        const interpolatedY = A[i] + B[i] * dx + C[i] * Math.pow(dx, 2) + D[i] * Math.pow(dx, 3);
        splineOutput.push(interpolatedY);
    }

    return splineOutput;
}

function toggleChartTypeUi() {
    const type = document.getElementById('select-chart-type').value;
    const curvePanel = document.getElementById('panel-curve-fit');
    const histPanel = document.getElementById('panel-histogram-bins');
    const xTitleInput = document.getElementById('input-x-title');

    if (type === 'histogram') {
        curvePanel.style.display = 'none';
        histPanel.style.display = 'block';
        xTitleInput.placeholder = "Value Range Bin Bin";
    } else {
        curvePanel.style.display = 'block';
        histPanel.style.display = 'none';
        xTitleInput.placeholder = "X Variable";
    }
    runCurveFit(); // Force update trigger
}

// Function 1: Compiles canvas to a Blob and copies it directly to the system clipboard
async function copyChartToClipboard() {
    if (!chartInstance) return alert("Export Error: No active chart configuration found to copy.");

    try {
        const canvas = document.getElementById('analyticsChart');
        
        // We use the HTML5 Canvas .toBlob API to convert the image data into a format the clipboard expects
        canvas.toBlob(async (blob) => {
            if (!blob) {
                alert("Export Error: Failed to compile canvas pixels.");
                return;
            }
            
            // Create a ClipboardItem container holding our raw PNG data stream
            const item = new ClipboardItem({ "image/png": blob });
            await navigator.clipboard.write([item]);
            
            // Provide a brief, non-intrusive alert confirmation
            alert("Success: Graph copied to clipboard as a high-resolution PNG!");
        }, "image/png");
        
    } catch (err) {
        console.error("Clipboard export failed:", err);
        alert("Clipboard Security Error: Browser block detected or context insecure. Ensure you are running locally or via HTTPS.");
    }
}

// Function 2: Triggers an automated anchor download loop to save the file locally
function downloadChartAsPng() {
    if (!chartInstance) return alert("Export Error: No active chart configuration found to download.");

    // Extract the base64 data URL representation from Chart.js
    const image64 = chartInstance.toBase64Image();
    
    // Programmatically construct a virtual anchor element to trigger the download sequence
    const downloadAnchor = document.createElement('a');
    
    // Pull the active chart title or use a generic fallback for the filename
    const yTitle = document.getElementById('input-y-title').value || selectY.value || "matrix_plot";
    const cleanFilename = yTitle.toLowerCase().replace(/[^a-z0-9]/g, "_");
    
    downloadAnchor.download = `${cleanFilename}_export.png`;
    downloadAnchor.href = image64;
    
    // Append, execute click, and cleanly evict the node from the document context
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
}

// Sidebar State Management Engine
let isSidebarCollapsed = false;

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    
    // Toggle a structural class on the sidebar element
    sidebar.classList.toggle('-translate-x-full');
    
    // Check if the sidebar is currently off-screen (collapsed)
    const isCollapsed = sidebar.classList.contains('-translate-x-full');
    
    if (isCollapsed) {
        toggleBtn.innerText = '▸';
        // Reposition button slightly so it remains visible floating on the left screen edge
        toggleBtn.style.right = '-28px'; 
    } else {
        toggleBtn.innerText = '◂';
        toggleBtn.style.right = '-14px'; // Resets to standard inset positioning
    }
}

const sidebarDropZone = document.getElementById('drop-zone-sidebar');

if (sidebarDropZone) {
    ['dragenter', 'dragover'].forEach(name => {
        sidebarDropZone.addEventListener(name, (e) => { 
            e.preventDefault(); 
            sidebarDropZone.classList.add('border-blue-500', 'bg-blue-50/50'); 
        }, false);
    });

    ['dragleave', 'drop'].forEach(name => {
        sidebarDropZone.addEventListener(name, (e) => { 
            e.preventDefault(); 
            sidebarDropZone.classList.remove('border-blue-500', 'bg-blue-50/50'); 
        }, false);
    });

    sidebarDropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length) handleFile(files[0]);
    });
}