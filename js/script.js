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

    const yAxis = d3.axisLeft(y).ticks(5).tickSize(-(chartWidth - chartMargin.left - chartMargin.right)).tickFormat((d) => `${d}`);
    const yAxisG = svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(${chartMargin.left},0)`)
        .call(yAxis)
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

    const areaD = () => `${line(selected)} L ${x(selected[selected.length - 1].year)} ${y(y.domain()[0])} L ${x(selected[0].year)} ${y(y.domain()[0])} Z`;
    const areaPath = svg.append("path")
        .datum(selected)
        .attr("class", "area")
        .attr("d", areaD);

    const linePath = svg.append("path")
        .datum(selected)
        .attr("class", "line")
        .attr("d", line);

    // Extra credit: toggle between the truncated black-hat y-axis and an honest zero-based one
    d3.select("#axis-toggle").on("click", function () {
        const truncated = y.domain()[0] !== 0;
        y.domain(truncated ? [0, 104] : [84, 104]);
        d3.select(this).text(truncated ? "Restore the black-hat y-axis (84 to 104)" : "Show the chart with a zero-based y-axis");
        const t = svg.transition().duration(1000);
        yAxisG.transition(t).call(yAxis);
        linePath.transition(t).attr("d", line);
        areaPath.transition(t).attr("d", areaD);
        container.node().scrollIntoView({ behavior: "smooth", block: "center" });
    });

    svg.append("text")
        .attr("class", "change-label")
        .attr("x", chartWidth - chartMargin.right)
        .attr("y", chartMargin.top)
        .attr("text-anchor", "end")
        .text("2015 = 100");
});
