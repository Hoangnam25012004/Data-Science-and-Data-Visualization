// CSV file path - relative to the HTML file
const csvFilePath = 'All_Trans_2000_2024_Top5Leagues.csv';

let rawData = []; // Store raw data for filtering
let yearlyData = []; // Store processed yearly data

// Load and process data
d3.csv(csvFilePath).then(data => {
    rawData = data; // Store raw data

    // Parse and aggregate data by year
    const yearlyStats = d3.rollup(
        data,
        group => ({
            totalSpend: d3.sum(group, d => +d.Transfer_Fee_In_MillionEuro || 0),
            count: group.length,
            avgFee: d3.mean(group, d => +d.Transfer_Fee_In_MillionEuro || 0),
            maxFee: d3.max(group, d => +d.Transfer_Fee_In_MillionEuro || 0),
            minFee: d3.min(group, d => +d.Transfer_Fee_In_MillionEuro || 0)
        }),
        d => d.Transfer_Window
    );

    // Convert to array and sort by year
    yearlyData = Array.from(yearlyStats, ([year, stats]) => ({
        year: +year,
        ...stats
    })).sort((a, b) => a.year - b.year);

    console.log('Yearly Data:', yearlyData);

    // Calculate statistics
    const totalSpendSum = d3.sum(yearlyData, d => d.totalSpend);
    const peakYear = yearlyData.reduce((a, b) => a.totalSpend > b.totalSpend ? a : b);
    const totalTransfers = d3.sum(yearlyData, d => d.count);
    const avgSpendPerYear = totalSpendSum / yearlyData.length;

    // Show statistics
    document.getElementById('stats').innerHTML = `
        <div class="stat-card">
            <h3>Total Spending (2000-2024)</h3>
            <div class="value">€${totalSpendSum.toFixed(0)}B</div>
        </div>
        <div class="stat-card">
            <h3>Peak Year</h3>
            <div class="value">${peakYear.year}</div>
        </div>
        <div class="stat-card">
            <h3>Total Transfers</h3>
            <div class="value">${totalTransfers.toLocaleString()}</div>
        </div>
        <div class="stat-card">
            <h3>Average Annual Spend</h3>
            <div class="value">€${avgSpendPerYear.toFixed(1)}B</div>
        </div>
    `;

    // Initialize filters
    initializeFilters(rawData, yearlyData);

    // Create visualizations
    updateCharts(yearlyData, rawData, null, null);

    // Hide loading, show content
    document.getElementById('loading').style.display = 'none';
    document.getElementById('controls').style.display = 'flex';
    document.getElementById('content').style.display = 'block';
}).catch(error => {
    console.error('Error loading CSV:', error);
    document.getElementById('loading').innerHTML = 'Error loading data. Make sure the CSV file is in the same directory as this HTML file.';
});

// Initialize filter dropdowns
function initializeFilters(data, yearlyData) {
    // Get all unique teams by transfer count
    const teamStats = d3.rollup(
        data,
        group => group.length,
        d => d.Club_Joined
    );
    const allTeams = Array.from(teamStats, ([team, count]) => ({ team, count }))
        .sort((a, b) => b.count - a.count)
        .map(d => d.team);

    const teamSelect = document.getElementById('team-select');
    allTeams.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        teamSelect.appendChild(option);
    });

    // Add event listeners
    teamSelect.addEventListener('change', () => applyFilters(data, yearlyData));
    document.getElementById('reset-filters').addEventListener('click', () => resetFilters(data, yearlyData));
}

// Apply filters and update charts
function applyFilters(data, yearlyData) {
    const selectedTeam = document.getElementById('team-select').value;

    updateCharts(yearlyData, data, null, selectedTeam);
}

// Reset all filters
function resetFilters(data, yearlyData) {
    document.getElementById('year-filter').value = '';
    document.getElementById('team-filter').value = '';
    updateCharts(yearlyData, data, null, null);
}

// Update all charts
function updateCharts(filteredYearlyData, filteredRawData, selectedYear, selectedTeam) {
    // Clear existing SVG content
    d3.selectAll('#chart-total-spend > *').remove();
    d3.selectAll('#chart-avg-fee > *').remove();
    d3.selectAll('#chart-transfer-count > *').remove();
    d3.selectAll('#chart-combined > *').remove();
    d3.selectAll('#chart-team-transfers > *').remove();

    // Create visualizations
    createTotalSpendChart(filteredYearlyData);
    createAvgFeeChart(filteredYearlyData);
    createTransferCountChart(filteredYearlyData);
    createCombinedChart(filteredYearlyData);
    createTeamTransfersChart(filteredRawData, selectedYear, selectedTeam);
}

// Chart 1: Total Spending
function createTotalSpendChart(data) {
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = 600 - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;

    const svg = d3.select('#chart-total-spend')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.year))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.totalSpend)])
        .range([height, 0]);

    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.totalSpend));

    // Add grid lines
    svg.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.1)
        .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(''));

    // Add line path
    svg.append('path')
        .datum(data)
        .attr('class', 'line line-total')
        .attr('d', line);

    // Add circles for data points
    svg.selectAll('.dot-total')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'dot dot-total')
        .attr('cx', d => xScale(d.year))
        .attr('cy', d => yScale(d.totalSpend))
        .attr('r', 4)
        .on('mouseover', function (event, d) {
            showTooltip(event, `Year: ${d.year}<br>Total Spend: €${d.totalSpend.toFixed(1)}M`);
        })
        .on('mouseout', hideTooltip);

    // Add axes
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format('d')));

    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(yScale));

    // Add labels
    svg.append('text')
        .attr('class', 'axis-label')
        .attr('x', width / 2)
        .attr('y', height + 35)
        .text('Year');

    svg.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - height / 2)
        .attr('dy', '1em')
        .text('Spending (Million €)');
}

// Chart 2: Average Fee
function createAvgFeeChart(data) {
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = 600 - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;

    const svg = d3.select('#chart-avg-fee')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.year))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.avgFee)])
        .range([height, 0]);

    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.avgFee));

    // Add grid lines
    svg.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.1)
        .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(''));

    // Add line path
    svg.append('path')
        .datum(data)
        .attr('class', 'line line-avg')
        .attr('d', line);

    // Add circles
    svg.selectAll('.dot-avg')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'dot dot-avg')
        .attr('cx', d => xScale(d.year))
        .attr('cy', d => yScale(d.avgFee))
        .attr('r', 4)
        .on('mouseover', function (event, d) {
            showTooltip(event, `Year: ${d.year}<br>Avg Fee: €${d.avgFee.toFixed(2)}M`);
        })
        .on('mouseout', hideTooltip);

    // Add axes
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format('d')));

    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(yScale));

    // Add labels
    svg.append('text')
        .attr('class', 'axis-label')
        .attr('x', width / 2)
        .attr('y', height + 35)
        .text('Year');

    svg.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - height / 2)
        .attr('dy', '1em')
        .text('Average Fee (Million €)');
}

// Chart 3: Transfer Count
function createTransferCountChart(data) {
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = 1200 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select('#chart-transfer-count')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.year))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.count)])
        .range([height, 0]);

    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.count));

    // Add grid lines
    svg.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.1)
        .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(''));

    // Add line path
    svg.append('path')
        .datum(data)
        .attr('class', 'line line-count')
        .attr('d', line);

    // Add circles
    svg.selectAll('.dot-count')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'dot dot-count')
        .attr('cx', d => xScale(d.year))
        .attr('cy', d => yScale(d.count))
        .attr('r', 4)
        .on('mouseover', function (event, d) {
            showTooltip(event, `Year: ${d.year}<br>Transfers: ${d.count}`);
        })
        .on('mouseout', hideTooltip);

    // Add axes
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format('d')));

    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(yScale));

    // Add labels
    svg.append('text')
        .attr('class', 'axis-label')
        .attr('x', width / 2)
        .attr('y', height + 35)
        .text('Year');

    svg.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - height / 2)
        .attr('dy', '1em')
        .text('Number of Transfers');
}

// Chart 4: Combined (Normalized)
function createCombinedChart(data) {
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = 1200 - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;

    const svg = d3.select('#chart-combined')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Normalize data to 0-100 scale
    const maxSpend = d3.max(data, d => d.totalSpend);
    const maxAvg = d3.max(data, d => d.avgFee);
    const maxCount = d3.max(data, d => d.count);

    const normalizedData = data.map(d => ({
        ...d,
        normalizedSpend: (d.totalSpend / maxSpend) * 100,
        normalizedAvg: (d.avgFee / maxAvg) * 100,
        normalizedCount: (d.count / maxCount) * 100
    }));

    const xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.year))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0]);

    // Lines
    const lineSpend = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.normalizedSpend));

    const lineAvg = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.normalizedAvg));

    const lineCount = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.normalizedCount));

    // Add grid lines
    svg.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.1)
        .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(''));

    // Add paths
    svg.append('path')
        .datum(normalizedData)
        .attr('class', 'line line-total')
        .attr('d', lineSpend);

    svg.append('path')
        .datum(normalizedData)
        .attr('class', 'line line-avg')
        .attr('d', lineAvg);

    svg.append('path')
        .datum(normalizedData)
        .attr('class', 'line line-count')
        .attr('d', lineCount);

    // Add axes
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format('d')));

    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(yScale));

    // Add labels
    svg.append('text')
        .attr('class', 'axis-label')
        .attr('x', width / 2)
        .attr('y', height + 35)
        .text('Year');

    svg.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - height / 2)
        .attr('dy', '1em')
        .text('Normalized Value (0-100)');
}

// Tooltip functions
function showTooltip(event, content) {
    const tooltip = document.getElementById('tooltip');
    tooltip.innerHTML = content;
    tooltip.classList.add('visible');
    tooltip.style.left = (event.pageX + 10) + 'px';
    tooltip.style.top = (event.pageY + 10) + 'px';
}

function hideTooltip() {
    const tooltip = document.getElementById('tooltip');
    tooltip.classList.remove('visible');
}
// Chart 5: Team Transfers Over Time (Line Chart)
function createTeamTransfersChart(data, selectedYear, selectedTeam) {
    // If no team selected, show message
    if (!selectedTeam || selectedTeam === '') {
        const svg = d3.select('#chart-team-transfers');
        svg.append('text')
            .attr('x', '50%')
            .attr('y', '50%')
            .attr('text-anchor', 'middle')
            .attr('dy', '.3em')
            .style('font-size', '16px')
            .style('fill', '#999')
            .text('Select a team from the dropdown to view transfer trends');
        return;
    }

    // Filter data for selected team
    const teamData = data.filter(d => d.Club_Joined === selectedTeam);

    // Group by year and count transfers
    const teamYearlyStats = d3.rollup(
        teamData,
        group => ({
            count: group.length,
            totalSpend: d3.sum(group, d => +d.Transfer_Fee_In_MillionEuro || 0),
            avgFee: d3.mean(group, d => +d.Transfer_Fee_In_MillionEuro || 0)
        }),
        d => +d.Transfer_Window
    );

    const teamLineData = Array.from(teamYearlyStats, ([year, stats]) => ({
        year,
        ...stats
    })).sort((a, b) => a.year - b.year);

    // Create chart
    const margin = { top: 40, right: 30, bottom: 50, left: 60 };
    const width = 1200 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select('#chart-team-transfers')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear()
        .domain(d3.extent(teamLineData, d => d.year))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(teamLineData, d => d.count)])
        .range([height, 0]);

    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.count));

    // Add grid lines
    svg.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.1)
        .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(''));

    // Add line path
    svg.append('path')
        .datum(teamLineData)
        .attr('class', 'line line-team')
        .attr('d', line)
        .attr('stroke', '#06b6d4')
        .attr('stroke-width', 3)
        .attr('fill', 'none');

    // Add circles for data points
    svg.selectAll('.dot-team')
        .data(teamLineData)
        .enter()
        .append('circle')
        .attr('class', 'dot dot-team')
        .attr('cx', d => xScale(d.year))
        .attr('cy', d => yScale(d.count))
        .attr('r', 5)
        .attr('fill', 'white')
        .attr('stroke', '#06b6d4')
        .attr('stroke-width', 2)
        .on('mouseover', function (event, d) {
            showTooltip(event, `Year: ${d.year}<br>Transfers: ${d.count}<br>Total Spend: €${d.totalSpend.toFixed(0)}M<br>Avg Fee: €${d.avgFee.toFixed(2)}M`);
            d3.select(this).attr('r', 7);
        })
        .on('mouseout', function () {
            hideTooltip();
            d3.select(this).attr('r', 5);
        });

    // Add axes
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format('d')));

    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(yScale));

    // Add labels
    svg.append('text')
        .attr('class', 'axis-label')
        .attr('x', width / 2)
        .attr('y', height + 40)
        .text('Year');

    svg.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - height / 2)
        .attr('dy', '1em')
        .text('Number of Transfers');

    // Add title showing selected team
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -15)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', '#06b6d4')
        .text(`Transfer Trends: ${selectedTeam}`);
}