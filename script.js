/*
 * Precious Metals Price Tracker
 *
 * This script reads a local JSON file containing historical price data for
 * several metals and displays an interactive line chart along with a
 * performance table showing the change in price over multiple time frames.
 *
 * If you wish to fetch real-time data from an external API instead of using
 * the provided sample dataset, replace the fetch call below with your API
 * request and shape the response to match the structure used in this
 * example. See README in the repository for setup instructions.
 */

let metalsData = window.METALS_DATA;
let chart;

/*
 * Initialize the interface once the DOM is ready. Since we're loading
 * sample data synchronously via a script tag (data.js), we can safely
 * call initInterface immediately. If you replace the sample data with
 * asynchronous API calls, move initInterface invocation into the
 * promise resolution.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Ensure the sample data has loaded into the global METALS_DATA variable
    if (!metalsData) {
        console.error('METALS_DATA is not defined. Ensure data.js is loaded.');
        alert('Sample data not loaded. Please check your setup.');
        return;
    }
    // Initialise UI controls and dark mode
    initInterface();
    initDarkMode();
});

/**
 * Initialize the UI controls and set up event listeners.
 */
function initInterface() {
    const select = document.getElementById('metal-select');
    select.addEventListener('change', () => updateDisplay(select.value));
    // populate with the default selection
    updateDisplay(select.value);
}

/**
 * Set up dark mode toggle behaviour. When the toggle button is clicked the
 * "dark-mode" class is toggled on the <body> element. The current
 * preference is saved in localStorage so it persists across page loads.
 */
function initDarkMode() {
    const toggleBtn = document.getElementById('darkModeToggle');
    const body = document.body;
    // Apply saved preference on page load
    const saved = localStorage.getItem('metalDarkMode');
    if (saved === 'true') {
        body.classList.add('dark-mode');
        toggleBtn.textContent = '☀️ Light Mode';
    }
    toggleBtn.addEventListener('click', () => {
        const enabled = body.classList.toggle('dark-mode');
        // update button label according to state
        toggleBtn.textContent = enabled ? '☀️ Light Mode' : '🌙 Dark Mode';
        localStorage.setItem('metalDarkMode', enabled);
        // recreate the chart with updated axis/text colours
        updateDisplay(document.getElementById('metal-select').value);
    });
}

/**
 * Populate the global metals statistics bar. This function iterates through
 * each metal defined in the sample dataset and displays the latest price
 * for that metal. The output is formatted similarly to the top bar on
 * CoinGecko, with each stat separated by a small gap. If you connect
 * live data, adjust the values accordingly.
 */
function populateStatsBar() {
    // This function is retained for backward compatibility. In the new design,
    // there is no global statistics bar like the CoinGecko-style page, so this
    // function intentionally does nothing.
    return;
}

/**
 * Update the chart and performance table for the selected metal.
 *
 * @param {string} metalName Name of the metal (matches keys in data.json)
 */
function updateDisplay(metalName) {
    if (!metalsData || !metalsData.metals) return;
    const metalSeries = metalsData.metals[metalName];
    if (!metalSeries) return;

    const startDate = new Date(metalsData.start_date);
    const totalDays = metalSeries.length;
    const currentPrice = metalSeries[totalDays - 1];

    // Build labels and data for the last 30 days
    const chartLabels = [];
    const chartPoints = [];
    const lastNDays = 30;
    const startIdx = Math.max(0, totalDays - lastNDays);
    for (let i = startIdx; i < totalDays; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        // Format date as YYYY-MM-DD
        const iso = date.toISOString().split('T')[0];
        chartLabels.push(iso);
        chartPoints.push(metalSeries[i]);
    }

    // Destroy previous chart if it exists to avoid duplicate canvas plots
    if (chart) {
        chart.destroy();
    }
    // Create a new line chart
    const ctx = document.getElementById('price-chart').getContext('2d');
    // Determine axis and text colours based on dark mode
    const isDark = document.body.classList.contains('dark-mode');
    const axisColor = isDark ? '#e2e8f0' : '#333';
    const gridColor = isDark ? '#334155' : '#e0e0e0';
    const lineColor = isDark ? '#f87171' : '#d32f2f';
    const textColor = axisColor;
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [
                {
                    label: `${capitalize(metalName)} price (INR)`,
                    data: chartPoints,
                    fill: false,
                    borderColor: lineColor,
                    backgroundColor: lineColor,
                    tension: 0.1,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: textColor,
                    },
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                },
            },
            scales: {
                x: {
                    display: true,
                    ticks: {
                        maxTicksLimit: 8,
                        color: textColor,
                    },
                    grid: {
                        display: false,
                    },
                },
                y: {
                    display: true,
                    ticks: {
                        color: textColor,
                    },
                    grid: {
                        color: gridColor,
                    },
                },
            },
        },
    });

    // Update current price display (hidden heading used for accessibility)
    const currentPriceElem = document.getElementById('current-price');
    currentPriceElem.textContent = `Current Price: INR ${currentPrice.toFixed(2)}`;

    // Update the price summary at the top for the selected metal
    const prevPrice = totalDays >= 2 ? metalSeries[totalDays - 2] : currentPrice;
    updatePriceSummary(metalName, currentPrice, prevPrice);

    // Compute performance for each period
    const periods = [
        { name: 'Today', days: 1 },
        { name: '30 Days', days: 30 },
        { name: '6 Months', days: 180 },
        { name: '1 Year', days: 365 },
        { name: '5 Years', days: 365 * 5 },
        { name: '20 Years', days: 365 * 20 },
    ];
    const tbody = document.getElementById('performance-body');
    tbody.innerHTML = '';
    periods.forEach((period) => {
        const idx = totalDays - period.days;
        // Fallback to the earliest available price if requested period exceeds dataset
        const pastPrice = idx >= 0 ? metalSeries[idx] : metalSeries[0];
        const amountChange = currentPrice - pastPrice;
        const percentChange = pastPrice !== 0 ? (amountChange / pastPrice) * 100 : 0;
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        nameCell.textContent = period.name;
        const amountCell = document.createElement('td');
        amountCell.textContent = `${amountChange >= 0 ? '+' : ''}${amountChange.toFixed(2)}`;
        amountCell.className = amountChange >= 0 ? 'positive' : 'negative';
        const percentCell = document.createElement('td');
        percentCell.textContent = `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}%`;
        percentCell.className = percentChange >= 0 ? 'positive' : 'negative';
        row.appendChild(nameCell);
        row.appendChild(amountCell);
        row.appendChild(percentCell);
        tbody.appendChild(row);
    });

    // Add 50-day moving average difference row
    if (totalDays > 0) {
        const lookback = Math.min(50, totalDays);
        let sum = 0;
        for (let i = totalDays - lookback; i < totalDays; i++) {
            sum += metalSeries[i];
        }
        const avg50 = sum / lookback;
        const diff = currentPrice - avg50;
        const pctDiff = avg50 !== 0 ? (diff / avg50) * 100 : 0;
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        nameCell.textContent = '50 DMA';
        const amountCell = document.createElement('td');
        amountCell.textContent = `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}`;
        amountCell.className = diff >= 0 ? 'positive' : 'negative';
        const percentCell = document.createElement('td');
        percentCell.textContent = `${pctDiff >= 0 ? '+' : ''}${pctDiff.toFixed(2)}%`;
        percentCell.className = pctDiff >= 0 ? 'positive' : 'negative';
        row.appendChild(nameCell);
        row.appendChild(amountCell);
        row.appendChild(percentCell);
        tbody.appendChild(row);
    }
}

/**
 * Capitalize the first letter of a string.
 *
 * @param {string} str
 * @returns {string}
 */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Update the price summary bar for the selected metal. It displays the current
 * price along with the difference and percentage change from the previous
 * day's closing price. The summary uses arrows and colours to indicate
 * whether the price is up or down.
 *
 * @param {string} metalName The name of the selected metal
 * @param {number} currentPrice The latest price of the metal
 * @param {number} prevPrice The price of the metal on the previous day
 */
function updatePriceSummary(metalName, currentPrice, prevPrice) {
    const summaryEl = document.getElementById('price-summary');
    if (!summaryEl) return;
    const diff = currentPrice - prevPrice;
    const pctDiff = prevPrice !== 0 ? (diff / prevPrice) * 100 : 0;
    const isPositive = diff >= 0;
    // Use up/down arrow unicode characters
    const arrow = isPositive ? '▲' : '▼';
    // Format numbers with locale separators and two decimals
    function formatNumber(num) {
        return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    const currentFormatted = formatNumber(currentPrice);
    const diffFormatted = formatNumber(Math.abs(diff));
    const pctFormatted = `${pctDiff >= 0 ? '+' : ''}${pctDiff.toFixed(2)}%`;
    // Build HTML output
    summaryEl.innerHTML = `
        <span class="current-value">INR ${currentFormatted}</span>
        <span class="change ${isPositive ? 'positive' : 'negative'}">${arrow} ${diffFormatted}</span>
        <span class="change ${isPositive ? 'positive' : 'negative'}">${pctFormatted}</span>
    `;
}