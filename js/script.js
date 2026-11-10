const margin = { top: 16, right: 20, bottom: 52, left: 68 };
const width = 720 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const measures = [
    { key: "life_expectancy", label: "Life expectancy" },
    { key: "income_per_person", label: "Income per person" },
    { key: "population", label: "Population" }
];

const continents = ["Africa", "Americas", "Asia", "Europe", "Oceania"];
const color = d3.scaleOrdinal(continents, d3.schemeSet2);

const sparkColor = d3.scaleOrdinal(
    measures.map(measure => measure.key),
    ["#1b9e77", "#d95f02", "#7570b3"]
);
const sparkWidth = 240;
const sparkHeight = 96;
const sparkMargin = { top: 8, right: 8, bottom: 18, left: 32 };

let xKey = "income_per_person";
let yKey = "life_expectancy";
let zKey = "population";
let year = 2000;
let allData = [];
let byCountry = new Map();
let tooltipCountry = null;

const svg = d3.select("#vis")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

const chart = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const xAxisG = chart.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`);

const yAxisG = chart.append("g")
    .attr("class", "y-axis");

const yearMark = chart.append("text")
    .attr("class", "year-mark")
    .attr("x", width / 2)
    .attr("y", height / 2);

const xLabel = chart.append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle");

const yLabel = chart.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -52)
    .attr("text-anchor", "middle");

const tooltip = d3.select("#tooltip");

const valueFormat = {
    life_expectancy: d3.format(".1f"),
    income_per_person: d3.format("$,.0f"),
    population: d3.format(",.0f")
};

const tickFormat = {
    life_expectancy: ".0f",
    income_per_person: "$.2s",
    population: ".2s"
};

function labelFor(key) {
    return measures.find(measure => measure.key === key).label;
}

// Life expectancy is roughly linear. Income and population span orders of magnitude.
function scaleFor(key, range) {
    const values = allData.map(d => d[key]);
    if (key === "life_expectancy") {
        return d3.scaleLinear()
            .domain(d3.extent(values))
            .nice()
            .range(range);
    }
    return d3.scaleLog()
        .domain(d3.extent(values))
        .nice()
        .range(range);
}

function setupControls() {
    const [minYear, maxYear] = d3.extent(allData, d => d.year);
    year = Math.min(Math.max(year, minYear), maxYear);

    d3.select("#yearSlider")
        .attr("min", minYear)
        .attr("max", maxYear)
        .property("value", year)
        .on("input", (event) => {
            year = +event.target.value;
            d3.select("#yearLabel").text(year);
            updateVis();
        });

    d3.select("#yearLabel").text(year);

    d3.selectAll("select.variable")
        .each(function () {
            d3.select(this)
                .selectAll("option")
                .data(measures)
                .join("option")
                .attr("value", d => d.key)
                .text(d => d.label);
        });

    d3.select("#xVariable").property("value", xKey).on("change", (event) => {
        xKey = event.target.value;
        updateVis();
    });
    d3.select("#yVariable").property("value", yKey).on("change", (event) => {
        yKey = event.target.value;
        updateVis();
    });
    d3.select("#zVariable").property("value", zKey).on("change", (event) => {
        zKey = event.target.value;
        updateVis();
    });

    d3.select("#legend")
        .selectAll(".legend-item")
        .data(continents)
        .join("div")
        .attr("class", "legend-item")
        .html(d => `<span class="legend-swatch" style="background:${color(d)}"></span>${d}`);
}

function updateVis() {
    const xScale = scaleFor(xKey, [0, width]);
    const yScale = scaleFor(yKey, [height, 0]);
    const sizeScale = d3.scaleSqrt()
        .domain([0, d3.max(allData, d => d[zKey])])
        .range([4, 28]);

    const t = d3.transition().duration(500);

    xAxisG.transition(t).call(d3.axisBottom(xScale).ticks(6, tickFormat[xKey]));
    yAxisG.transition(t).call(d3.axisLeft(yScale).ticks(6, tickFormat[yKey]));
    xLabel.text(labelFor(xKey));
    yLabel.text(labelFor(yKey));
    yearMark.text(year);

    const current = allData.filter(d => d.year === year);

    chart.selectAll("circle.country")
        .data(current, d => d.country)
        .join(
            enter => enter.append("circle")
                .attr("class", "country")
                .attr("cx", d => xScale(d[xKey]))
                .attr("cy", d => yScale(d[yKey]))
                .attr("r", 0)
                .attr("fill", d => color(d.continent))
                .attr("fill-opacity", 0.75)
                .on("mouseover", showTooltip)
                .on("mousemove", showTooltip)
                .on("mouseout", hideTooltip)
                .call(enter => enter.transition(t).attr("r", d => sizeScale(d[zKey]))),
            update => update.call(update => update.transition(t)
                .attr("cx", d => xScale(d[xKey]))
                .attr("cy", d => yScale(d[yKey]))
                .attr("r", d => sizeScale(d[zKey]))
                .attr("fill", d => color(d.continent))),
            exit => exit.call(exit => exit.transition(t).attr("r", 0).remove())
        );
}

function showTooltip(event, d) {
    if (tooltipCountry !== d.country) {
        tooltipCountry = d.country;
        tooltip.html(
            `<strong>${d.country}</strong><br>
            <span class="tip-meta"></span>
            <div class="tip-values"></div>
            <svg class="spark" width="${sparkWidth}" height="${sparkHeight}"></svg>
            <div class="spark-legend"></div>
            <div class="spark-note">Each line is indexed to 100 in this country’s first year.</div>`
        );
        drawSparkline(d.country);
    }

    tooltip.select(".tip-meta").text(`${d.continent}, ${d.year}`);
    tooltip.select(".tip-values").html(
        `${labelFor(xKey)}: ${valueFormat[xKey](d[xKey])}<br>
        ${labelFor(yKey)}: ${valueFormat[yKey](d[yKey])}<br>
        ${labelFor(zKey)}: ${valueFormat[zKey](d[zKey])}`
    );
    placeTooltip(event);
    d3.select(this).attr("stroke", "#222").attr("stroke-width", 2);
}

function placeTooltip(event) {
    tooltip.style("display", "block");
    const tip = tooltip.node();
    const width = tip.offsetWidth;
    const height = tip.offsetHeight;
    let left = event.pageX + 16;
    let top = event.pageY + 16;
    if (left + width > window.scrollX + window.innerWidth - 8) {
        left = event.pageX - width - 16;
    }
    if (top + height > window.scrollY + window.innerHeight - 8) {
        top = event.pageY - height - 16;
    }
    tooltip.style("left", `${left}px`).style("top", `${top}px`);
}

function drawSparkline(country) {
    const history = (byCountry.get(country) || [])
        .slice()
        .sort((a, b) => d3.ascending(a.year, b.year));
    const baseline = history[0];
    if (!baseline) return;

    const series = measures.map(measure => ({
        key: measure.key,
        label: measure.label,
        values: history.map(d => ({
            year: d.year,
            index: (d[measure.key] / baseline[measure.key]) * 100
        }))
    }));

    const svg = tooltip.select("svg.spark");
    const x = d3.scaleLinear()
        .domain(d3.extent(history, d => d.year))
        .range([sparkMargin.left, sparkWidth - sparkMargin.right]);
    const y = d3.scaleLinear()
        .domain([
            0,
            d3.max(series, line => d3.max(line.values, d => d.index))
        ])
        .nice()
        .range([sparkHeight - sparkMargin.bottom, sparkMargin.top]);

    const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.index));

    svg.append("g")
        .attr("class", "spark-axis")
        .attr("transform", `translate(0,${sparkHeight - sparkMargin.bottom})`)
        .call(d3.axisBottom(x).ticks(4).tickFormat(d3.format("d")).tickSizeOuter(0));

    svg.append("g")
        .attr("class", "spark-axis")
        .attr("transform", `translate(${sparkMargin.left},0)`)
        .call(d3.axisLeft(y).ticks(3).tickSizeOuter(0));

    svg.append("line")
        .attr("class", "spark-baseline")
        .attr("x1", x.range()[0])
        .attr("x2", x.range()[1])
        .attr("y1", y(100))
        .attr("y2", y(100));

    svg.selectAll("path.spark-line")
        .data(series)
        .join("path")
        .attr("class", "spark-line")
        .attr("fill", "none")
        .attr("stroke", d => sparkColor(d.key))
        .attr("stroke-width", 1.6)
        .attr("d", d => line(d.values));

    const current = history.find(row => row.year === year);
    if (current) {
        svg.append("line")
            .attr("class", "spark-year")
            .attr("x1", x(year))
            .attr("x2", x(year))
            .attr("y1", sparkMargin.top)
            .attr("y2", sparkHeight - sparkMargin.bottom);
    }

    tooltip.select(".spark-legend")
        .selectAll(".spark-key")
        .data(series)
        .join("span")
        .attr("class", "spark-key")
        .html(d => `<span class="legend-swatch" style="background:${sparkColor(d.key)}"></span>${d.label}`);
}

function hideTooltip() {
    tooltipCountry = null;
    tooltip.style("display", "none").html("");
    d3.select(this).attr("stroke", "#fff").attr("stroke-width", 1);
}

d3.csv("data/gapminder_subset.csv", d => ({
    country: d.country,
    continent: d.continent,
    year: +d.year,
    life_expectancy: +d.life_expectancy,
    income_per_person: +d.income_per_person,
    population: +d.population
})).then(data => {
    allData = data;
    byCountry = d3.group(allData, d => d.country);
    setupControls();
    updateVis();
}).catch(error => console.error("Error loading data:", error));
