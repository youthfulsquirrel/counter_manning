const cols = 24;

// Mode and shift selection
let mode = "arrival"; // default mode
let shift = "morning"; // default shift

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
const tableWrapper = document.getElementById("table-wrapper");
const summaryText = document.getElementById("summary-text");
const clearButton = document.getElementById("clear-button");

// Drag state variables (moved to global scope)
let dragging = false;
let startRow = null;
let startCol = null;
let dragDirection = null;
let paintedCells = new Set();

// LocalStorage functions
function saveToLocalStorage() {
  try {
    localStorage.setItem('counterData', JSON.stringify(dataStore));
    localStorage.setItem('currentMode', mode);
    localStorage.setItem('currentShift', shift);
  } catch (e) {
    console.error('Error saving to localStorage:', e);
  }
}

function loadFromLocalStorage() {
  try {
    const savedData = localStorage.getItem('counterData');
    const savedMode = localStorage.getItem('currentMode');
    const savedShift = localStorage.getItem('currentShift');
    
    if (savedData) {
      const parsed = JSON.parse(savedData);
      dataStore.arrival = parsed.arrival;
      dataStore.departure = parsed.departure;
    }
    
    if (savedMode) {
      mode = savedMode;
      // Update active tab
      document.querySelectorAll(".tab").forEach(t => {
        t.classList.remove("active");
        if (t.dataset.mode === mode) {
          t.classList.add("active");
        }
      });
    }
    
    if (savedShift) {
      shift = savedShift;
      // Update shift selector
      document.getElementById("shift-select").value = shift;
    }
  } catch (e) {
    console.error('Error loading from localStorage:', e);
  }
}

function clearCurrentMode() {
  const modeName = mode.charAt(0).toUpperCase() + mode.slice(1);
  
  if (confirm(`Are you sure you want to clear all data for ${modeName}? This cannot be undone.`)) {
    // Reset data for current mode
    dataStore[mode] = initializeData(mode);
    
    // Save to localStorage
    saveToLocalStorage();
    
    // Re-render table
    renderTable();
    
    // Show feedback
    alert(`${modeName} data cleared successfully!`);
  }
}

function updateClearButtonText() {
  const modeName = mode.charAt(0).toUpperCase() + mode.slice(1);
  clearButton.textContent = `Clear All (${modeName})`;
}

// Generate column headers based on shift
function generateColHeaders() {
  const headers = [];
  const startHour = shift === "morning" ? 10 : 22;
  let hour = startHour, minute = 0;
  
  for (let i = 0; i < cols; i++) {
    headers.push(`${hour.toString().padStart(2, '0')}${minute.toString().padStart(2, '0')}`);
    minute += 30;
    if (minute >= 60) { 
      minute = 0; 
      hour += 1; 
      if (hour >= 24) hour = 0; 
    }
  }
  return headers;
}

let colHeaders = generateColHeaders();

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

function handleDrag(currentRow, currentCol) {
  // Determine drag direction on first move
  if (dragDirection === null) {
    if (currentRow !== startRow && currentCol === startCol) {
      dragDirection = 'vertical';
    } else if (currentCol !== startCol && currentRow === startRow) {
      dragDirection = 'horizontal';
    } else if (currentRow !== startRow || currentCol !== startCol) {
      return; // Wait for clearer direction
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
    else {
    style += "border-right: 1px solid;";
    } 
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

      df[rowIndex].forEach((cellValue, colIndex) => {
        let style = "";
        if ((colIndex + 1) % 2 === 0) style += "border-right: 5px solid;";
        else {
          style += "border-right: 1px dashed;";
        }
        if (isLastInZone) style += "border-bottom: 5px solid;";
        
        // Add background color based on cell value
        if (cellValue === 1) {
          style += " background-color: blue;";
        } else {
          style += " background-color: transparent;";
        }
        
        html += `<td data-row="${rowIndex}" data-col="${colIndex}" style="${style}">${cellValue}</td>`;
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
      else{
        style += " border-right: 1px dashed";
      }
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
    else{
      style += "border-right: 1px dashed";
    }
    html += `<td class="grandtotal" data-col="${col}" style="${style}">0</td>`;
  }
  html += "</tr>";

  // Motorbike row
  html += `<tr class="motor-row">`;
  html += `<th style="border-top:5px solid; border-bottom:5px solid;">${motorRowIndex + 1}</th>`;
  for (let col = 0; col < cols; col++) {
    let style = "border-top:5px solid; border-bottom:5px solid;";
    if ((col + 1) % 2 === 0) style += " border-right:5px solid;";
    else {
      style += "border-right: 1px dashed;";
    }
    
    // Add background color based on motor cell value
    const motorValue = df[motorRowIndex][col];
    if (motorValue === 1) {
      style += " background-color: blue;";
    } else {
      style += " background-color: transparent;";
    }
    
    html += `<td class="motor" data-row="${motorRowIndex}" data-col="${col}" style="${style}">${motorValue}</td>`;
  }
  html += "</tr>";

  html += "</table>";
  container.innerHTML = html;

  // Click + drag with horizontal OR vertical direction (for both mouse and touch)
  const allCells = container.querySelectorAll("td[data-row]");
  
  allCells.forEach(td => {
    // Mouse events
    td.addEventListener("mousedown", (e) => {
      dragging = true;
      document.body.classList.add('is-dragging');
      startRow = Number(td.dataset.row);
      startCol = Number(td.dataset.col);
      dragDirection = null;
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
      handleDrag(currentRow, currentCol);
    });

    // Touch events
    td.addEventListener("touchstart", (e) => {
      dragging = true;
      document.body.classList.add('is-dragging');
      startRow = Number(td.dataset.row);
      startCol = Number(td.dataset.col);
      dragDirection = null;
      paintedCells.clear();

      const key = `${startRow}-${startCol}`;
      paintedCells.add(key);
      toggleCell(td);
      e.preventDefault();
    });

    td.addEventListener("touchmove", (e) => {
      if (!dragging) return;
      e.preventDefault(); // Prevent scrolling during drag
      
      // Get the element at touch point
      const touch = e.touches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      
      if (element && element.dataset.row !== undefined) {
        const currentRow = Number(element.dataset.row);
        const currentCol = Number(element.dataset.col);
        handleDrag(currentRow, currentCol);
      }
    });

    td.addEventListener("touchend", (e) => {
      dragging = false;
      document.body.classList.remove('is-dragging');
      startRow = null;
      startCol = null;
      dragDirection = null;
      paintedCells.clear();
      e.preventDefault();
    });

    td.addEventListener("touchcancel", (e) => {
      dragging = false;
      document.body.classList.remove('is-dragging');
      startRow = null;
      startCol = null;
      dragDirection = null;
      paintedCells.clear();
    });
  });

  // Mouse up event
  document.addEventListener("mouseup", () => {
    dragging = false;
    document.body.classList.remove('is-dragging');
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
  saveToLocalStorage(); // Save after every change
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
    for (let r = 0; r < rows - 1; r++) sum += df[r][col];
    cell.textContent = sum;
  });

  renderSummary(subtotalValues);
}

function renderSummary(subtotalValues) {
  const df = getCurrentData();
  const motorRowIndex = df.length - 1;
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

// Shift selector
document.getElementById("shift-select").addEventListener("change", (e) => {
  shift = e.target.value;
  colHeaders = generateColHeaders();
  saveToLocalStorage(); // Save shift preference
  renderTable();
});

// Tab switching
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    mode = tab.dataset.mode;
    updateClearButtonText(); // Update button text
    saveToLocalStorage(); // Save mode preference
    renderTable();
  });
});

// Clear button
clearButton.addEventListener("click", clearCurrentMode);

// Copy to clipboard
document.getElementById("copy-button").addEventListener("click", () => {
  const button = document.getElementById("copy-button");
  const copyText = document.getElementById("copy-text");
  
  navigator.clipboard.writeText(summaryText.textContent)
    .then(() => {
      button.classList.add("copied");
      copyText.textContent = "Copied!";
      
      setTimeout(() => {
        button.classList.remove("copied");
        copyText.textContent = "Copy";
      }, 2000);
    })
    .catch(err => {
      alert("Copy failed: " + err);
    });
});

// Load data from localStorage on page load
loadFromLocalStorage();

// Update clear button text on load
updateClearButtonText();

// Initial render
renderTable();
