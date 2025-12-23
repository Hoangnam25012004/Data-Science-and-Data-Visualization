// Function to draw the chart
function drawChart(data) {

    // Clear existing chart
    d3.select("#chart").html("");
    d3.selectAll(".tooltip").remove();

    // Parse data
    data.forEach(d => {
        d.year = +d.Transfer_Window;
        d.transfer_fee = +d.Transfer_Fee_In_MillionEuro;
        d.league = d.League_Joined;
        d.player = d.Player;
        d.club_joined = d.Club_Joined;
        d.club_left = d.Club_Left;
    });

    // Filter invalid rows
    data = data.filter(d =>
        !isNaN(d.year) &&
        !isNaN(d.transfer_fee) &&
        d.league
    );

    const margin = { top: 40, right: 30, bottom: 60, left: 70 },
          width = 900 - margin.left - margin.right,
          height = 500 - margin.top - margin.bottom;

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Tooltip
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "#fff")
        .style("padding", "8px")
        .style("border", "1px solid #ccc")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("opacity", 0);

    // X scale
    const x = d3.scaleLinear()
        .domain(d3.extent(data, d => d.year))
        .range([0, width]);

    // Y scale
    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.transfer_fee)])
        .nice()
        .range([height, 0]);

    // Color by league
    const color = d3.scaleOrdinal(d3.schemeTableau10);

    // X axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 45)
        .attr("text-anchor", "middle")
        .text("Year");

    // Y axis
    svg.append("g")
        .call(d3.axisLeft(y));

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .text("Transfer Fee (Million €)");

    // ---- JITTER SETTINGS ----
    const jitterWidth = 12; // controls spacing between dots

    // Draw dots
    svg.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.year) + (Math.random() - 0.5) * jitterWidth)
        .attr("cy", d => y(d.transfer_fee))
        .attr("r", 5) // slightly bigger
        .attr("fill", d => color(d.league))
        .attr("opacity", 0.65)
        .on("mouseover", (event, d) => {
            tooltip
                .style("opacity", 1)
                .html(`
                    <strong>${d.player}</strong><br/>
                    €${d.transfer_fee}M (${d.year})<br/>
                    <strong>From:</strong> ${d.club_left || "N/A"}<br/>
                    <strong>To:</strong> ${d.club_joined || "N/A"}<br/>
                    <strong>League:</strong> ${d.league}
                `)
                .style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0));

    // Legend
    const leagues = [...new Set(data.map(d => d.league))];

    const legend = svg.selectAll(".legend")
        .data(leagues)
        .enter()
        .append("g")
        .attr("transform", (d, i) => `translate(0,${i * 20})`);

    legend.append("rect")
        .attr("x", width - 18)
        .attr("width", 14)
        .attr("height", 14)
        .attr("fill", d => color(d));

    legend.append("text")
        .attr("x", width - 24)
        .attr("y", 7)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(d => d);
}

// Default load
const csvFilePath = 'All_Trans_2000_2024_Top5Leagues.csv.csv';

d3.csv(csvFilePath)
    .then(data => drawChart(data))
    .catch(() => console.log("Default CSV not found"));

// Handle file upload
document.getElementById('csvUpload').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => {
            const data = d3.csvParse(e.target.result);
            drawChart(data);
        };
        reader.readAsText(file);
    }
});
