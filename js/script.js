const margin = { top: 16, right: 20, bottom: 52, left: 68 };
const width = 720 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const csvPath = "data/OECD.ENV.EPI,DSD_AIR_GHG@DF_AIR_GHG,,filtered,2026-11-10 21-34-59.csv";

d3.csv(csvPath, d3.autoType).then((rows) => {
    const oecd = rows
        .filter((d) => d.REF_AREA === "OECD" && d.OBS_VALUE !== undefined)
        .map((d) => ({ year: d.TIME_PERIOD, value: d.OBS_VALUE }));
    const baseline = oecd.find((d) => d.year === 2015).value;
    const selected = oecd.map((d) => ({
        year: d.year,
        value: (d.value / baseline) * 100
    }));

    const container = d3.select("#misleading-chart");
    const bounds = container.node().getBoundingClientRect();
    const chartWidth = Math.max(bounds.width, 320);
    const chartHeight = 300;
    const chartMargin = { top: 24, right: 24, bottom: 48, left: 52 };
    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${chartWidth} ${chartHeight}`)
        .attr("role", "presentation");
    const x = d3.scalePoint()
        .domain(selected.map((d) => d.year))
        .range([chartMargin.left, chartWidth - chartMargin.right])
        .padding(0.2);
    const y = d3.scaleLinear()
        .domain([84, 104])
        .range([chartHeight - chartMargin.bottom, chartMargin.top]);

    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${chartHeight - chartMargin.bottom})`)
        .call(d3.axisBottom(x).tickValues([2015, 2017, 2019, 2021, 2023, 2024]).tickSize(0).tickPadding(10))
        .call((g) => g.select(".domain").remove());

    svg.append("text")
        .attr("class", "axis-title")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight - 8)
        .attr("text-anchor", "middle")
        .text("Year");

    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(${chartMargin.left},0)`)
        .call(d3.axisLeft(y).ticks(5).tickSize(-(chartWidth - chartMargin.left - chartMargin.right)).tickFormat((d) => `${d}`))
        .call((g) => g.select(".domain").remove());

    svg.append("text")
        .attr("class", "axis-title")
        .attr("transform", "rotate(-90)")
        .attr("x", -(chartHeight / 2))
        .attr("y", 16)
        .attr("text-anchor", "middle")
        .text("Emissions Index");

    const line = d3.line()
        .x((d) => x(d.year))
        .y((d) => y(d.value));

    svg.append("path")
        .datum(selected)
        .attr("class", "area")
        .attr("d", `${line(selected)} L ${x(selected[selected.length - 1].year)} ${y(84)} L ${x(selected[0].year)} ${y(84)} Z`);

    svg.append("path")
        .datum(selected)
        .attr("class", "line")
        .attr("d", line);

    svg.append("text")
        .attr("class", "change-label")
        .attr("x", chartWidth - chartMargin.right)
        .attr("y", chartMargin.top)
        .attr("text-anchor", "end")
        .text("2015 = 100");
});
