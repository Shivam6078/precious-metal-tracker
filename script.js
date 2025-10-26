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
    if (!metalsData) {
        console.error('METALS_DATA is not defined. Ensure data.js is loaded.');
        alert('Sample data not loaded. Please check your setup.');
        return;
    }
    initInterface();
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
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [
                {
                    label: `${capitalize(metalName)} price (INR)`,
                    data: chartPoints,
                    fill: false,
                    borderColor: '#d32f2f',
                    backgroundColor: '#d32f2f',
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
                        color: '#333',
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
                        color: '#333',
                    },
                    grid: {
                        display: false,
                    },
                },
                y: {
                    display: true,
                    ticks: {
                        color: '#333',
                    },
                    grid: {
                        color: '#e0e0e0',
                    },
                },
            },
        },
    });

    // Update current price display
    const currentPriceElem = document.getElementById('current-price');
    currentPriceElem.textContent = `Current Price: INR ${currentPrice.toFixed(2)}`;

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