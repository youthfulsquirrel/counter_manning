const cols = 24;

// Mode selection
let mode = "arrival"; // default mode

// Define zone sizes for each mode
const zoneSizes = {
  arrival: [10, 10, 10, 10],    // 4 zones of 10 counters each
  departure: [8, 10, 10, 8]     // zones of 8, 10, 10, 8 counters
};

// Data storage for both modes
const dataStore = {
  arrival: null,
  departure: null
};

const container = document.getElementById("table-container");
const summaryText = document.getElementById("summary-text");

let dragging = false;

// Generate column headers: start at 10:00, +30 minutes per column
function generateColHeaders() {
  const headers = [];
  let hour = 10, minute = 0;
  for (let i = 0; i < cols; i++) {
    headers.push(`${hour.toString().padStart(2, '0')}${minute.toString().padStart(2, '0')}`);
    minute += 30;
    if (minute >= 60) { minute = 0; hour += 1; if (hour >= 24) hour = 0; }
  }
  return headers;
}

const colHeaders = generateColHeaders();

// Initialize data for a specific mode, including motor row
function initializeData(modeName) {
  const zones = zoneSizes[modeName];
  const rows = zones.reduce((sum, size) => sum + size, 0);
  const df = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));

  // Add motor row as last row
  df.push(Array(cols).fill(0));
  return df;
}

// Get current data matrix
function getCurrentData() {
  if (!dataStore[mode]) {
    dataStore[mode] = initializeData(mode);
  }
  return dataStore[mode];
}

function renderTable() {
  const df = getCurrentData();
  const zones = zoneSizes[mode];
  const rows = df.length - 1; // exclude motor row for zone rendering
  const motorRowIndex = df.length - 1;

  let html = "<table>";

  // Column headers
  html += "<tr><th></th>";
  colHeaders.forEach((header, colIndex) => {
    let style = "";
    if ((colIndex + 1) % 2 === 0) style += "border-right: 5px solid;";
    html += `<th style="${style}">${header}</th>`;
  });
  html += "</tr>";

  let currentRow = 0;
  let zoneIndex = 0;

  // Iterate through each zone
  for (let zoneSize of zones) {
    const zoneStart = currentRow;
    const zoneEnd = currentRow + zoneSize - 1;

    for (let i = 0; i < zoneSize; i++) {
      const rowIndex = currentRow;
      const isLastInZone = (i === zoneSize - 1);
      let rowStyle = isLastInZone ? "border-bottom: 5px solid;" : "";
      
      html += `<tr style="${rowStyle}">`;

      let rowHeaderStyle = isLastInZone ? "border-bottom: 5px solid;" : "";
      html += `<th style="${rowHeaderStyle}">${rowIndex + 1}</th>`;

      df[rowIndex].forEach((cell, colIndex) => {
        let style = "";
        if ((colIndex + 1) % 2 === 0) style += "border-right: 5px solid;";
        if (isLastInZone) style += "border-bottom: 5px solid;";
        html += `<td data-row="${rowIndex}" data-col="${colIndex}" style="${style}">${cell}</td>`;
      });

      html += "</tr>";
      currentRow++;
    }

    // Subtotal row
    html += `<tr class="subtotal-row">`;
    html += `<th style="border-top:5px solid; border-bottom:5px solid;">Zone ${zoneIndex + 1}</th>`;
    for (let col = 0; col < cols; col++) {
      let style = "border-top:5px solid; border-bottom:5px solid;";
      if ((col + 1) % 2 === 0) style += " border-right:5px solid;";
      html += `<td class="subtotal" data-sub-start="${zoneStart}" data-sub-end="${zoneEnd}" data-col="${col}" style="${style}">0</td>`;
    }
    html += "</tr>";

    zoneIndex++;
  }

  // Grand total row
  html += `<tr class="grandtotal-row">`;
  html += `<th style="border-top:5px solid; border-bottom:5px solid;">Total(Car)</th>`;
  for (let col = 0; col < cols; col++) {
    let style = "border-top:5px solid; border-bottom:5px solid;";
    if ((col + 1) % 2 === 0) style += " border-right:5px solid;";
    html += `<td class="grandtotal" data-col="${col}" style="${style}">0</td>`;
  }
  html += "</tr>";

  // Motorbike row - show index instead of "Motor"
  html += `<tr class="motor-row">`;
  html += `<th style="border-top:5px solid; border-bottom:5px solid;">${motorRowIndex + 1}</th>`;
  for (let col = 0; col < cols; col++) {
    let style = "border-top:5px solid; border-bottom:5px solid;";
    if ((col + 1) % 2 === 0) style += " border-right:5px solid;";
    html += `<td class="motor" data-row="${motorRowIndex}" data-col="${col}" style="${style}">0</td>`;
  }
  html += "</tr>";

  html += "</table>";
  container.innerHTML = html;

  // Click + drag with horizontal OR vertical direction (not both)
  let startRow = null;
  let startCol = null;
  let dragDirection = null; // 'horizontal', 'vertical', or null
  let paintedCells = new Set();

  const allCells = container.querySelectorAll("td[data-row]");
  allCells.forEach(td => {
    td.addEventListener("mousedown", (e) => {
      dragging = true;
      startRow = Number(td.dataset.row);
      startCol = Number(td.dataset.col);
      dragDirection = null; // Reset direction
      paintedCells.clear();

      const key = `${startRow}-${startCol}`;
      paintedCells.add(key);
      toggleCell(td);
      e.preventDefault();
    });

    td.addEventListener("mouseover", (e) => {
      if (!dragging) return;
      
      const currentRow = Number(td.dataset.row);
      const currentCol = Number(td.dataset.col);

      // Determine drag direction on first move
      if (dragDirection === null) {
        if (currentRow !== startRow && currentCol === startCol) {
          dragDirection = 'vertical';
        } else if (currentCol !== startCol && currentRow === startRow) {
          dragDirection = 'horizontal';
        }
        // If moved diagonally on first move, do nothing yet
        else if (currentRow !== startRow || currentCol !== startCol) {
          // User moved diagonally - pick direction based on larger movement
          // or just wait for next move
          return;
        }
      }

      // Apply direction constraint
      let targetRow, targetCol;
      
      if (dragDirection === 'horizontal') {
        targetRow = startRow;
        targetCol = currentCol;
      } else if (dragDirection === 'vertical') {
        targetRow = currentRow;
        targetCol = startCol;
      } else {
        // Direction not yet determined
        return;
      }

      const key = `${targetRow}-${targetCol}`;
      if (!paintedCells.has(key)) {
        const targetCell = container.querySelector(`td[data-row="${targetRow}"][data-col="${targetCol}"]`);
        if (targetCell) {
          paintedCells.add(key);
          toggleCell(targetCell);
        }
      }
    });
  });

  document.addEventListener("mouseup", () => {
    dragging = false;
    startRow = null;
    startCol = null;
    dragDirection = null;
    paintedCells.clear();
  });

  updateAllTotals();
}

function toggleCell(td) {
  const df = getCurrentData();
  const r = Number(td.dataset.row);
  const c = Number(td.dataset.col);

  df[r][c] = df[r][c] === 0 ? 1 : 0;
  td.textContent = df[r][c];
  td.style.backgroundColor = df[r][c] === 1 ? "blue" : "transparent";

  updateAllTotals();
}

function updateAllTotals() {
  const df = getCurrentData();
  const rows = df.length;
  const subtotalValues = [];

  // Subtotals
  document.querySelectorAll(".subtotal").forEach(cell => {
    const start = Number(cell.dataset.subStart);
    const end = Number(cell.dataset.subEnd);
    const col = Number(cell.dataset.col);
    let sum = 0;
    for (let r = start; r <= end; r++) sum += df[r][col];
    cell.textContent = sum;

    if (!subtotalValues[col]) subtotalValues[col] = [];
    subtotalValues[col].push(sum);
  });

  // Grand totals
  document.querySelectorAll(".grandtotal").forEach(cell => {
    const col = Number(cell.dataset.col);
    let sum = 0;
    for (let r = 0; r < rows - 1; r++) sum += df[r][col]; // skip motor row
    cell.textContent = sum;
  });

  renderSummary(subtotalValues);
}

function renderSummary(subtotalValues) {
  const df = getCurrentData();
  const motorRowIndex = df.length - 1; // last row is motor
  const prefix = mode === "arrival" ? "ACar" : "DCar";
  
  let text = `${prefix}\n\n`;
  let prevSubEven = "";
  let prevMotorEven = "";
  for (let c = 0; c < cols; c++) {
    const header = colHeaders[c];
    const grandTotal = document.querySelector(`.grandtotal[data-col="${c}"]`).textContent;
    const motorValue = df[motorRowIndex][c];
    const subs = subtotalValues[c].join("/");
    if (c%2==1){
      if (subs !==prevSubEven || motorValue!=prevMotorEven ){
        text += `${header}:${String(grandTotal).padStart(2,"0")}/${String(motorValue).padStart(2,"0")}\n${subs}\n\n`;
      }
    }else {
      text += `${header}:${String(grandTotal).padStart(2,"0")}/${String(motorValue).padStart(2,"0")}\n${subs}\n\n`;
      prevSubEven = subs;
      prevMotorEven = motorValue;
    }
    
  }
  summaryText.textContent = text;
}

// Tab switching
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    // Update active tab
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    // Switch mode and re-render
    mode = tab.dataset.mode;
    renderTable();
  });
});

// Copy to clipboard with visual feedback
document.getElementById("copy-button").addEventListener("click", () => {
  const button = document.getElementById("copy-button");
  const copyText = document.getElementById("copy-text");
  
  navigator.clipboard.writeText(summaryText.textContent)
    .then(() => {
      // Show success state
      button.classList.add("copied");
      copyText.textContent = "Copied!";
      
      // Reset after 2 seconds
      setTimeout(() => {
        button.classList.remove("copied");
        copyText.textContent = "Copy";
      }, 2000);
    })
    .catch(err => {
      alert("Copy failed: " + err);
    });
});

// Initial render
renderTable();