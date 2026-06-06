/* ============================================
   THE A.I. DISPATCH — main.js
   Entry point: load data, init chapters, wire scroll
   ============================================ */

// Single state object instead of scattered window globals
const dispatch = {
  data: null,
  ch1: null,
  ch2: null,
  ch3: null
};

// ---- Shared tooltip (one for the whole page) ----
const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip");

// ---- Data loading & parsing ----
d3.csv("data/models.csv", d => {
  return {
    model:        d["Model"],
    org:          d["Organization"],
    year:         +d["Publication Year"],
    domain:       d["Domain"],
    params:       d["Parameters"]          === "" ? NaN : +d["Parameters"],
    flop:         d["Training compute (FLOP)"] === "" ? NaN : +d["Training compute (FLOP)"],
    efficiency:   d["Avg_FLOP_per_Joule"]  === "" ? NaN : +d["Avg_FLOP_per_Joule"],
    country:      d["Primary_Country"],
    countryCode:  d["Country_Code"],
    gridIntensity:d["Grid Carbon Intensity"]=== "" ? NaN : +d["Grid Carbon Intensity"],
    energyMWh:    d["Estimated_Energy_MWh"] === "" ? NaN : +d["Estimated_Energy_MWh"],
    carbonTCO2:   d["Estimated_Carbon_Footprint_tCO2"] === "" ? NaN : +d["Estimated_Carbon_Footprint_tCO2"]
  };
}).then(data => {

  console.log(`✅ Loaded ${data.length} models`);
  console.log(`   Years: ${d3.min(data, d => d.year)}–${d3.max(data, d => d.year)}`);
  console.log(`   Domains: ${[...new Set(data.map(d => d.domain))].join(", ")}`);
  console.log(`   With energy data: ${data.filter(d => !isNaN(d.energyMWh)).length}`);

  dispatch.data = data;

  // Energy counter in the opening hook
  initHook();
  initChapter1(data);
  initChapter2(data);
  initChapter3(data);
  initScrollama();

}).catch(err => {
  console.error("❌ Failed to load data:", err);
});


/* ============================================
   HOOK — animated energy counter
   ============================================ */
function initHook() {
  const counterEl = document.getElementById("energy-counter");
  if (!counterEl) return;

  // Simulates cumulative global AI training energy ticking upward.
  // Starting value loosely based on dataset total (~80,000 MWh).
  let value = 79842;
  const fmt = d3.format(",.0f");
  counterEl.textContent = fmt(value) + " MWh";

  setInterval(() => {
    // Increment by a small random amount each tick to suggest ongoing compute
    value += Math.floor(Math.random() * 5) + 1;
    counterEl.textContent = fmt(value) + " MWh";
  }, 120);
}


/* ============================================
   MASTHEAD — chapter progress indicator
   ============================================ */
function updateMastheadProgress(stepId) {
  const el = document.getElementById("chapter-progress");
  if (!el) return;
  if (stepId.startsWith("race"))  el.textContent = "Ch 1 / 3 · The Race";
  else if (stepId.startsWith("map"))   el.textContent = "Ch 2 / 3 · The Map";
  else if (stepId.startsWith("shift")) el.textContent = "Ch 3 / 3 · The Shift";
}


/* ============================================
   CHAPTER 1 — The Race
   Dual-line chart: compute demand vs hardware efficiency
   Animated line-draw triggered by scroll steps.
   ============================================ */
function initChapter1(data) {

  // --- 1. Aggregate: average compute & efficiency per year, 2015–2025 ---
  const filtered = data.filter(d => d.year >= 2015 && d.year <= 2025);
  const byYear = d3.rollups(
    filtered,
    v => ({
      avgFlop:       d3.mean(v.filter(d => !isNaN(d.flop)), d => d.flop),
      avgEfficiency: d3.mean(v.filter(d => !isNaN(d.efficiency)), d => d.efficiency)
    }),
    d => d.year
  )
    .map(([year, vals]) => ({ year, ...vals }))
    .filter(d => d.avgFlop && d.avgEfficiency)
    .sort((a, b) => a.year - b.year);

  console.log("Ch1 race data:", byYear);

  // --- 2. Dimensions ---
  const container = d3.select("#race-chart");
  const margin = { top: 40, right: 70, bottom: 50, left: 75 };
  const width  = 760 - margin.left - margin.right;
  const height = 420 - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // --- 3. Scales ---
  const x = d3.scaleLinear()
    .domain(d3.extent(byYear, d => d.year))
    .range([0, width]);

  const yFlop = d3.scaleLog()
    .domain(d3.extent(byYear, d => d.avgFlop))
    .range([height, 0])
    .nice();

  const yEff = d3.scaleLog()
    .domain(d3.extent(byYear, d => d.avgEfficiency))
    .range([height, 0])
    .nice();

  // --- 4. Axes ---
  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d")));

  svg.append("g")
    .attr("class", "axis axis-left")
    .call(d3.axisLeft(yFlop).ticks(5, ".0e"));

  svg.append("g")
    .attr("class", "axis axis-right")
    .attr("transform", `translate(${width},0)`)
    .call(d3.axisRight(yEff).ticks(5, ".0e"));

  svg.append("text").attr("class", "chart-title")
    .attr("x", width / 2).attr("y", -16)
    .attr("text-anchor", "middle")
    .text("The Efficiency vs. Scale Race (2015–2025)");

  // Left axis label
  svg.append("text").attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2).attr("y", -55)
    .attr("text-anchor", "middle")
    .text("Avg Training Compute (FLOPs)");


  svg.append("text").attr("class", "axis-label")
    .attr("transform", "rotate(90)")
    .attr("x", height / 2).attr("y", -(width + 55))
    .attr("text-anchor", "middle")
    .text("Hardware Efficiency (FLOP/Joule)");

  // Bottom axis label
  svg.append("text").attr("class", "axis-label")
    .attr("x", width / 2).attr("y", height + 42)
    .attr("text-anchor", "middle")
    .text("Publication Year");

  // --- 5. Line generators ---
  const lineFlop = d3.line()
    .x(d => x(d.year))
    .y(d => yFlop(d.avgFlop));

  const lineEff = d3.line()
    .x(d => x(d.year))
    .y(d => yEff(d.avgEfficiency));

  // --- 6. Draw lines (hidden via stroke-dashoffset, revealed on scroll) ---
  const pathFlop = svg.append("path")
    .datum(byYear)
    .attr("fill", "none")
    .attr("stroke", "var(--accent-compute)")
    .attr("stroke-width", 2.5)
    .attr("d", lineFlop);

  const pathEff = svg.append("path")
    .datum(byYear)
    .attr("fill", "none")
    .attr("stroke", "var(--accent-efficiency)")
    .attr("stroke-width", 2.5)
    .attr("stroke-dasharray", "6 3")
    .attr("d", lineEff);

  const flopLen = pathFlop.node().getTotalLength();
  const effLen  = pathEff.node().getTotalLength();

  pathFlop
    .attr("stroke-dasharray", flopLen)
    .attr("stroke-dashoffset", flopLen);

  pathEff
    .attr("stroke-dasharray", effLen)
    .attr("stroke-dashoffset", effLen);

  // Endpoint dots (hidden initially)
  const dotFlop = svg.append("circle")
    .attr("cx", x(byYear[byYear.length - 1].year))
    .attr("cy", yFlop(byYear[byYear.length - 1].avgFlop))
    .attr("r", 4).attr("fill", "var(--accent-compute)")
    .attr("opacity", 0);

  const dotEff = svg.append("circle")
    .attr("cx", x(byYear[byYear.length - 1].year))
    .attr("cy", yEff(byYear[byYear.length - 1].avgEfficiency))
    .attr("r", 4).attr("fill", "var(--accent-efficiency)")
    .attr("opacity", 0);

  // --- 7. Legend ---
  const legend = svg.append("g").attr("transform", `translate(${width - 185}, ${height - 40})`);
  legend.append("line").attr("x1", 0).attr("x2", 22).attr("y1", 0).attr("y2", 0)
    .attr("stroke", "var(--accent-compute)").attr("stroke-width", 2.5);
  legend.append("text").attr("x", 28).attr("y", 4)
    .attr("class", "axis-label").text("Compute Demand");
  legend.append("line").attr("x1", 0).attr("x2", 22).attr("y1", 18).attr("y2", 18)
    .attr("stroke", "var(--accent-efficiency)").attr("stroke-width", 2.5)
    .attr("stroke-dasharray", "6 3");
  legend.append("text").attr("x", 28).attr("y", 22)
    .attr("class", "axis-label").text("Hardware Efficiency");

  // --- 8. Annotation: growth rate gap post-2020 (shown on step race-2) ---
  const annotation = svg.append("g")
    .attr("class", "annotation")
    .attr("opacity", 0);

  annotation.append("rect")
    .attr("x", x(2020)).attr("y", 0)
    .attr("width", x(2025) - x(2020))
    .attr("height", height)
    .attr("fill", "var(--accent-red)")
    .attr("opacity", 0.06);

  annotation.append("line")
    .attr("x1", x(2020)).attr("x2", x(2020))
    .attr("y1", 0).attr("y2", height)
    .attr("stroke", "var(--accent-red)")
    .attr("stroke-width", 0.8)
    .attr("stroke-dasharray", "3 3");

  const rateLabel = annotation.append("g")
    .attr("transform", `translate(${x(2021)}, 12)`);

  rateLabel.append("text")
    .attr("font-family", "var(--font-ui)")
    .attr("font-size", "9px")
    .attr("font-weight", "600")
    .attr("fill", "var(--accent-red)")
    .text("Post-2020 growth rates:");

  rateLabel.append("text")
    .attr("y", 14)
    .attr("font-family", "var(--font-ui)")
    .attr("font-size", "9px")
    .attr("fill", "var(--accent-compute)")
    .text("Compute: ~5–9× per year");

  rateLabel.append("text")
    .attr("y", 26)
    .attr("font-family", "var(--font-ui)")
    .attr("font-size", "9px")
    .attr("fill", "var(--accent-efficiency)")
    .text("Efficiency: ~1–2× per year");

  // --- 9. Interactive hover — year data points + tooltip ---
  const hoverGroup = svg.append("g").attr("class", "hover-targets");

  const yearDotsFlop = hoverGroup.selectAll(".dot-flop")
    .data(byYear).enter()
    .append("circle")
    .attr("class", "dot-flop")
    .attr("cx", d => x(d.year))
    .attr("cy", d => yFlop(d.avgFlop))
    .attr("r", 3)
    .attr("fill", "var(--accent-compute)")
    .attr("opacity", 0);

  const yearDotsEff = hoverGroup.selectAll(".dot-eff")
    .data(byYear).enter()
    .append("circle")
    .attr("class", "dot-eff")
    .attr("cx", d => x(d.year))
    .attr("cy", d => yEff(d.avgEfficiency))
    .attr("r", 3)
    .attr("fill", "var(--accent-efficiency)")
    .attr("opacity", 0);

  const hoverLine = svg.append("line")
    .attr("y1", 0).attr("y2", height)
    .attr("stroke", "var(--ink-muted)")
    .attr("stroke-width", 0.5)
    .attr("stroke-dasharray", "3 2")
    .attr("opacity", 0);

  hoverGroup.selectAll(".hover-bar")
    .data(byYear).enter()
    .append("rect")
    .attr("x", d => x(d.year) - 15)
    .attr("y", 0)
    .attr("width", 30)
    .attr("height", height)
    .attr("fill", "transparent")
    .attr("cursor", "crosshair")
    .on("mouseenter", (event, d) => {
      hoverLine.attr("x1", x(d.year)).attr("x2", x(d.year))
        .attr("opacity", 0.3);
      const fmt = d3.format(".2e");
      tooltip
        .html(`
          <div class="tt-model">${d.year}</div>
          <div style="color:var(--accent-compute)">Compute: ${fmt(d.avgFlop)} FLOPs</div>
          <div style="color:var(--accent-efficiency)">Efficiency: ${fmt(d.avgEfficiency)} FLOP/J</div>
        `)
        .classed("visible", true)
        .style("left", (event.pageX + 14) + "px")
        .style("top", (event.pageY - 30) + "px");
    })
    .on("mouseleave", () => {
      hoverLine.attr("opacity", 0);
      tooltip.classed("visible", false);
    });

  // --- 10. Store refs for scroll handler ---
  dispatch.ch1 = {
    pathFlop, pathEff, dotFlop, dotEff, annotation,
    yearDotsFlop, yearDotsEff,
    flopLen, effLen
  };
  console.log("Ch1 race chart built ✅");
}


/* ============================================
   CHAPTER 2 — The Map
   Orthographic globe with carbon bubbles
   + "What If?" calculator
   ============================================ */
function initChapter2(data) {

  // --- 1a. Grid intensity per country from CSV ---
  const countryIntensity = {};
  d3.rollups(
    data.filter(d => !isNaN(d.gridIntensity)),
    v => Math.round(d3.mean(v, d => d.gridIntensity)),
    d => d.country
  ).forEach(([c, avg]) => { countryIntensity[c] = avg; });

  console.log("Ch2 grid intensities (data-driven):", countryIntensity);

  // --- 1b. Country-level carbon totals ---
  const countryRollup = d3.rollups(
    data.filter(d => !isNaN(d.carbonTCO2)),
    v => ({
      totalCarbon: d3.sum(v, d => d.carbonTCO2),
      avgIntensity: countryIntensity[v[0].country],
      count: v.length
    }),
    d => d.country
  ).map(([country, vals]) => ({ country, ...vals }));

  // Country centroids for bubble placement (CSV countries)
  const centroids = {
    "United States of America": [-98, 38],
    "United Kingdom": [-2, 54],
    "China": [104, 35],
    "South Korea": [128, 36],
    "United Arab Emirates": [54, 24],
    "Hong Kong": [114, 22]
  };

  const countryData = countryRollup
    .filter(d => centroids[d.country])
    .map(d => ({ ...d, coords: centroids[d.country] }));

  console.log("Ch2 country data:", countryData);

  // --- 2. Globe setup ---
  const container = d3.select("#globe-chart");
  const size = 460;

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${size} ${size}`)
    .style("max-height", "460px");

  const projection = d3.geoOrthographic()
    .scale(size / 2.3)
    .translate([size / 2, size / 2])
    .clipAngle(90)
    .rotate([90, -20, 0]);

  const path = d3.geoPath().projection(projection);

  // Ocean
  svg.append("circle")
    .attr("cx", size / 2).attr("cy", size / 2)
    .attr("r", size / 2.3)
    .attr("fill", "var(--paper-dark)")
    .attr("stroke", "var(--rule-light)")
    .attr("stroke-width", 0.5);

  svg.append("text").attr("class", "chart-title")
    .attr("x", size / 2).attr("y", 18)
    .attr("text-anchor", "middle")
    .text("Global AI Carbon Footprint vs. Grid Intensity");

  // Drag hint
  container.append("div")
    .style("text-align", "center")
    .style("font-family", "var(--font-ui)")
    .style("font-size", "10px")
    .style("color", "var(--ink-light)")
    .style("font-weight", "500")
    .style("margin-top", "4px")
    .style("letter-spacing", "0.5px")
    .html("⟵ drag the globe to explore ⟶");

  // Country paths and bubble groups
  const landGroup = svg.append("g").attr("class", "land");
  const bubbleGroup = svg.append("g").attr("class", "bubbles");

  // --- 3. Scales for bubbles ---
  const bubbleScale = d3.scaleSqrt()
    .domain([0, d3.max(countryData, d => d.totalCarbon)])
    .range([5, 38]);

  const colorScale = d3.scaleLinear()
    .domain([280, 450, 700])
    .range(["#27855a", "#b87020", "#a63324"])
    .clamp(true);

  // --- 4. Load world TopoJSON ---
  // Use local bundled file instead of CDN (marker may be offline)
  // Download https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json
  const worldUrl = "data/countries-110m.json";
  d3.json(worldUrl).then(world => {

    const countries = topojson.feature(world, world.objects.countries);

    landGroup.selectAll("path")
      .data(countries.features)
      .join("path")
      .attr("d", path)
      .attr("fill", "var(--paper-darker)")
      .attr("stroke", "var(--rule-light)")
      .attr("stroke-width", 0.3);

    // --- 5. Draw bubbles ---
    function updateBubbles() {
      const rot = projection.rotate();
      const center = [-rot[0], -rot[1]];

      bubbleGroup.selectAll("circle").remove();
      bubbleGroup.selectAll("circle")
        .data(countryData.filter(d => {
          return d3.geoDistance(d.coords, center) < Math.PI / 2;
        }))
        .join("circle")
        .attr("cx", d => projection(d.coords)[0])
        .attr("cy", d => projection(d.coords)[1])
        .attr("r", d => bubbleScale(d.totalCarbon))
        .attr("fill", d => colorScale(d.avgIntensity))
        .attr("fill-opacity", 0.7)
        .attr("stroke", d => colorScale(d.avgIntensity))
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.9)
        .style("cursor", "pointer")
        .on("mouseenter", (event, d) => {
          tooltip
            .html(`
              <div class="tt-model">${d.country}</div>
              <div>Total CO₂: ${d3.format(",.0f")(d.totalCarbon)} tonnes</div>
              <div>Grid intensity: ${d3.format(".0f")(d.avgIntensity)} gCO₂/kWh</div>
              <div style="color:var(--ink-muted)">${d.count} models in dataset</div>
            `)
            .classed("visible", true)
            .style("left", (event.pageX + 14) + "px")
            .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseleave", () => tooltip.classed("visible", false));
    }

    // Ghost ring layer for what-if highlighting
    const ghostGroup = svg.append("g").attr("class", "ghost-ring");


    const legendG = svg.append("g")
      .attr("transform", `translate(${size - 120}, ${size - 90})`);

    // Size legend: two reference circles
    const legendSizes = [1000, 20000];
    legendSizes.forEach((val, i) => {
      const r = bubbleScale(val);
      legendG.append("circle")
        .attr("cx", 15).attr("cy", 40 - i * 22)
        .attr("r", r)
        .attr("fill", "none")
        .attr("stroke", "var(--ink-muted)")
        .attr("stroke-width", 0.7);
      legendG.append("text")
        .attr("x", 40).attr("y", 44 - i * 22)
        .attr("font-family", "var(--font-ui)")
        .attr("font-size", "8px")
        .attr("fill", "var(--ink-muted)")
        .text(`${d3.format(",")(val)} tCO₂`);
    });

    // Color legend: small gradient bar
    const gradW = 80, gradH = 6;
    const defs = svg.append("defs");
    const grad = defs.append("linearGradient").attr("id", "globe-color-grad");
    grad.append("stop").attr("offset", "0%").attr("stop-color", "#27855a");
    grad.append("stop").attr("offset", "50%").attr("stop-color", "#b87020");
    grad.append("stop").attr("offset", "100%").attr("stop-color", "#a63324");

    legendG.append("rect")
      .attr("x", 0).attr("y", 55)
      .attr("width", gradW).attr("height", gradH)
      .attr("fill", "url(#globe-color-grad)")
      .attr("rx", 1);

    legendG.append("text")
      .attr("x", 0).attr("y", 70)
      .attr("font-family", "var(--font-ui)")
      .attr("font-size", "7px")
      .attr("fill", "var(--ink-muted)")
      .text("280");

    legendG.append("text")
      .attr("x", gradW).attr("y", 70)
      .attr("text-anchor", "end")
      .attr("font-family", "var(--font-ui)")
      .attr("font-size", "7px")
      .attr("fill", "var(--ink-muted)")
      .text("700 gCO₂/kWh");

    // Redraw helper
    function redraw() {
      landGroup.selectAll("path").attr("d", path);
      updateBubbles();
      ghostGroup.selectAll("circle").each(function(d) {
        const rot2 = projection.rotate();
        const center2 = [-rot2[0], -rot2[1]];
        if (d3.geoDistance(d, center2) < Math.PI / 2) {
          const p = projection(d);
          d3.select(this).attr("cx", p[0]).attr("cy", p[1]).attr("opacity", 0.7);
        } else {
          d3.select(this).attr("opacity", 0);
        }
      });
    }

    // --- 6. Drag-to-rotate ---
    // animateRotateTo which is non-blocking and can be overridden by drag
    let rotate0, coords0;
    svg.call(d3.drag()
      .on("start", (event) => {
        rotate0 = projection.rotate();
        coords0 = [event.x, event.y];
        svg.style("cursor", "grabbing");
      })
      .on("drag", (event) => {
        const sensitivity = 0.4;
        const newRotation = [
          rotate0[0] + (event.x - coords0[0]) * sensitivity,
          Math.max(-60, Math.min(60, rotate0[1] - (event.y - coords0[1]) * sensitivity)),
          rotate0[2]
        ];
        projection.rotate(newRotation);
        redraw();
      })
      .on("end", () => svg.style("cursor", "grab"))
    ).style("cursor", "grab");

    // Smooth animated rotation — can be interrupted by drag at any time
    function animateRotateTo(targetCoords) {
      const targetRotation = [-targetCoords[0], -targetCoords[1], 0];
      const currentRotation = projection.rotate();
      const interp = d3.interpolate(currentRotation, targetRotation);
      d3.select({}).transition().duration(1000).ease(d3.easeCubicInOut)
        .tween("rotate", () => t => {
          projection.rotate(interp(t));
          redraw();
        });
    }

    // Initial draw
    updateBubbles();

    // Store refs
    dispatch.ch2 = { animateRotateTo, ghostGroup, projection, redraw };
    console.log("Ch2 globe built ✅ (drag to rotate)");

  }).catch(err => {
    console.error("Failed to load world topology:", err);
    container.append("p")
      .style("color", "var(--accent-red)")
      .text("Could not load map data. Ensure data/countries-110m.json exists.");
  });

  // --- 7. What-If Calculator ---
  //   India:     632 gCO2/kWh — Ember GER 2025 (2024 data, down from 708 in 2023)
  //   Australia: 510 gCO2/kWh — Ember GER 2025 (2024 data, rapid solar growth)
  //   France:     56 gCO2/kWh — Ember GER 2025 (nuclear-dominant grid)
  //   Sweden:      7 gCO2/kWh — Ember GER 2025 (hydro + nuclear + wind)
  const gridIntensities = {
    ...countryIntensity,
    "India": 632,
    "Australia": 510,
    "France": 56,
    "Sweden": 7
  };

  // Centroids for all what-if countries (for globe rotation + ghost ring)
  const allCentroids = {
    ...centroids,
    "India": [78, 22],
    "France": [2, 47],
    "Australia": [134, -25],
    "Sweden": [15, 62]
  };

  // Only include models that have BOTH energy and carbon data,
  // so the ratio calculation in update WhatIf can never produce NaN
  const modelsWithEnergy = data
    .filter(d => !isNaN(d.energyMWh) && d.energyMWh > 0 && !isNaN(d.carbonTCO2) && d.carbonTCO2 > 0)
    .sort((a, b) => b.energyMWh - a.energyMWh);

  const modelSelect = d3.select("#model-select");
  modelSelect.selectAll("option")
    .data(modelsWithEnergy)
    .join("option")
    .attr("value", (d, i) => i)
    .text(d => `${d.model} (${d3.format(".2e")(d.energyMWh)} MWh)`);

  const countrySelect = d3.select("#country-select");
  countrySelect.selectAll("option")
    .data(Object.entries(gridIntensities).sort((a, b) => a[1] - b[1]))
    .join("option")
    .attr("value", d => d[0])
    .text(d => `${d[0]} (${d[1]} gCO₂/kWh)`);

  function updateWhatIf() {
    const modelIdx = +modelSelect.property("value");
    const selectedCountry = countrySelect.property("value");
    const newIntensity = gridIntensities[selectedCountry];
    const model = modelsWithEnergy[modelIdx];
    if (!model || newIntensity == null) return;

    const originalCarbon = model.carbonTCO2;
    const newCarbon = model.energyMWh * newIntensity / 1000;
    const ratio = newCarbon / originalCarbon;
    const changeLabel = ratio > 1
      ? `${d3.format(".1f")(ratio)}× more carbon`
      : `${d3.format(".0%")(1 - ratio)} less carbon`;

    d3.select("#what-if-result").html(`
      <div style="margin-bottom:4px"><strong>${model.model}</strong></div>
      <div>Original: <strong>${d3.format(",.0f")(originalCarbon)}</strong> tCO₂ (${model.country})</div>
      <div>Hypothetical: <strong>${d3.format(",.0f")(newCarbon)}</strong> tCO₂ (${selectedCountry})</div>
      <div style="margin-top:6px; font-weight:600; color:${ratio > 1 ? '#a63324' : '#27855a'}">
        → ${changeLabel}
      </div>
    `);

    // Rotate globe to the selected country and show ghost ring
    const ch2 = dispatch.ch2;
    const coords = allCentroids[selectedCountry];
    if (ch2 && coords) {
      ch2.animateRotateTo(coords);

      ch2.ghostGroup.selectAll("circle").remove();
      ch2.ghostGroup.append("circle")
        .datum(coords)
        .attr("cx", ch2.projection(coords)?.[0] || 0)
        .attr("cy", ch2.projection(coords)?.[1] || 0)
        .attr("r", 5)
        .attr("fill", "none")
        .attr("stroke", ratio > 1 ? "#a63324" : "#27855a")
        .attr("stroke-width", 2.5)
        .attr("stroke-dasharray", "4 2")
        .attr("opacity", 0)
        .transition().delay(800).duration(400).attr("opacity", 1).attr("r", 22)
        .transition().duration(600).attr("r", 18).attr("opacity", 0.7);
    }
  }

  modelSelect.on("change", updateWhatIf);
  countrySelect.on("change", updateWhatIf);
  updateWhatIf();
}


/* ============================================
   CHAPTER 3 — The Shift
   Beeswarm by domain: energy consumption
   Force-simulated dots + tooltip + "By The Numbers" inset
   ============================================ */
function initChapter3(data) {

  // --- 1. Map compound domain labels to 4 categories (matching DEP) ---
  function mapDomain(raw) {
    if (!raw) return null;
    const d = raw.toLowerCase();
    if (d.includes("multimodal")) return "Multimodal";
    if (d.includes("language") && d.includes("vision")) return "Multimodal";
    if (d.includes("language") && d.includes("image")) return "Multimodal";
    if (d.includes("game")) return "Games & Speech";
    if (d.includes("speech")) return "Games & Speech";
    if (d.includes("language")) return "Language";
    if (d.includes("vision") || d.includes("image")) return "Vision";
    return null;
  }

  const domainOrder = ["Vision", "Language", "Games & Speech", "Multimodal"];
  const domainColors = {
    "Vision": "#1d9e75",
    "Language": "#2a5ea8",
    "Games & Speech": "#d85a30",
    "Multimodal": "#ba7517"
  };

  const beeData = data
    .filter(d => !isNaN(d.energyMWh) && d.energyMWh > 0)
    .map(d => ({ ...d, domainGroup: mapDomain(d.domain) }))
    .filter(d => d.domainGroup !== null);

  console.log("Ch3 beeswarm data:", beeData.length, "models across",
    [...new Set(beeData.map(d => d.domainGroup))]);

  // --- 2. Dimensions ---

  const container = d3.select("#beeswarm-chart");
  const margin = { top: 40, right: 60, bottom: 50, left: 75 };
  const width = 760 - margin.left - margin.right;
  const height = 450 - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // --- 3. Scales ---
  const x = d3.scaleBand()
    .domain(domainOrder)
    .range([0, width])
    .padding(0.3);

  const y = d3.scaleLog()
    .domain([d3.min(beeData, d => d.energyMWh) * 0.5, d3.max(beeData, d => d.energyMWh) * 1.5])
    .range([height, 0])
    .nice();

  // --- 4. Axes ---
  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("font-size", "11px");

  svg.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(6, ".0e"));


  svg.append("text").attr("class", "chart-title")
    .attr("x", width / 2).attr("y", -16)
    .attr("text-anchor", "middle")
    .text("Energy Consumption by AI Domain");

  svg.append("text").attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2).attr("y", -55)
    .attr("text-anchor", "middle")
    .text("Estimated Training Energy (MWh)");

  // --- 5. Domain column shading ---
  domainOrder.forEach(dom => {
    svg.append("rect")
      .attr("x", x(dom))
      .attr("y", 0)
      .attr("width", x.bandwidth())
      .attr("height", height)
      .attr("fill", domainColors[dom])
      .attr("opacity", 0.04);
  });
  // --- 5b. Legend ---
  const legend = svg.append("g")
    .attr("transform", `translate(${width - 20}, 0)`);

  domainOrder.forEach((dom, i) => {
    legend.append("circle")
      .attr("cx", 0).attr("cy", i * 18)
      .attr("r", 5)
      .attr("fill", domainColors[dom])
      .attr("fill-opacity", 0.75);
    legend.append("text")
      .attr("x", 12).attr("y", i * 18 + 4)
      .attr("font-family", "var(--font-ui)")
      .attr("font-size", "10px")
      .attr("fill", "var(--ink-light)")
      .text(dom === "Games & Speech" ? "Games/Speech" : dom);
  });

  // --- 6. Force simulation for beeswarm layout ---
  beeData.forEach(d => {
    d.targetX = x(d.domainGroup) + x.bandwidth() / 2;
    d.targetY = y(d.energyMWh);
    d.x = d.targetX;
    d.y = d.targetY;
  });

  const simulation = d3.forceSimulation(beeData)
    .force("x", d3.forceX(d => d.targetX).strength(0.8))
    .force("y", d3.forceY(d => d.targetY).strength(1))
    .force("collide", d3.forceCollide(5.5))
    .stop();

  for (let i = 0; i < 120; i++) simulation.tick();

  // --- 7. Draw dots (hidden initially, revealed on scroll) ---
  const dots = svg.selectAll(".bee-dot")
    .data(beeData)
    .join("circle")
    .attr("class", "bee-dot")
    .attr("cx", d => d.x)
    .attr("cy", height)   // Start at bottom, animate up
    .attr("r", 5)
    .attr("fill", d => domainColors[d.domainGroup])
    .attr("fill-opacity", 0.75)
    .attr("stroke", d => domainColors[d.domainGroup])
    .attr("stroke-width", 0.8)
    .attr("stroke-opacity", 0.9)
    .style("cursor", "pointer")
    .on("mouseenter", (event, d) => {
      d3.select(event.target)
        .attr("r", 8)
        .attr("fill-opacity", 1);
      tooltip
        .html(`
          <div class="tt-model">${d.model}</div>
          <div class="tt-org">${d.org} · ${d.year}</div>
          <div style="margin-top:4px">Domain: ${d.domainGroup}</div>
          <div>Parameters: ${isNaN(d.params) ? "undisclosed" : d3.format(".2e")(d.params)}</div>
          <div>Energy: <strong>${d3.format(",.1f")(d.energyMWh)}</strong> MWh</div>
          <div>Carbon: <strong>${isNaN(d.carbonTCO2) ? "—" : d3.format(",.0f")(d.carbonTCO2) + " tCO₂"}</strong></div>
        `)
        .classed("visible", true)
        .style("left", (event.pageX + 14) + "px")
        .style("top", (event.pageY - 30) + "px");
    })
    .on("mouseleave", (event) => {
      d3.select(event.target)
        .attr("r", 5)
        .attr("fill-opacity", 0.75);
      tooltip.classed("visible", false);
    });

  // --- 8. Median lines per domain (shown on step shift-2) ---
  const medians = domainOrder.map(dom => {
    const vals = beeData.filter(d => d.domainGroup === dom).map(d => d.energyMWh);
    return { domain: dom, median: d3.median(vals) };
  });

  const medianLines = svg.selectAll(".median-line")
    .data(medians)
    .join("line")
    .attr("class", "median-line")
    .attr("x1", d => x(d.domain) + 4)
    .attr("x2", d => x(d.domain) + x.bandwidth() - 4)
    .attr("y1", d => y(d.median))
    .attr("y2", d => y(d.median))
    .attr("stroke", "var(--ink)")
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", "4 2")
    .attr("opacity", 0);

  // --- 9. "By The Numbers" inset ---
  const multiMedian = medians.find(d => d.domain === "Multimodal")?.median || 0;
  const langMedian = medians.find(d => d.domain === "Language")?.median || 1;
  const ratio35x = Math.round(multiMedian / langMedian);
  // Average Australian household uses ~7.6 MWh/year
  const housesEquiv = Math.round(multiMedian * 1000 / 7600);

  d3.select("#house-equiv").html(`
    <div style="margin-bottom:8px">
      <div style="font-size:1.6rem; font-weight:600; color:var(--accent-efficiency)">${ratio35x}×</div>
      <div>more energy: Multimodal vs Language median</div>
    </div>
    <div>
      <div style="font-size:1.6rem; font-weight:600; color:var(--accent-red)">${d3.format(",")(housesEquiv)}</div>
      <div>average homes' annual electricity to train one median Multimodal model</div>
    </div>
  `);


  d3.select("#by-the-numbers").style("opacity", 0);

  // --- 10. Store refs ---
  dispatch.ch3 = { dots, medianLines, chartHeight: height };
  console.log("Ch3 beeswarm built ✅");
}


/* ============================================
   SCROLLAMA — wires up scroll triggers
   ============================================ */
function initScrollama() {
  const scroller = scrollama();

  scroller
    .setup({
      step: ".step",
      offset: 0.5,
      debug: false
    })
    .onStepEnter(response => {
      const stepId = response.element.dataset.step;
      console.log(`→ entered step: ${stepId}`);

      d3.selectAll(".step").classed("is-active", false);
      d3.select(response.element).classed("is-active", true);

      
      updateMastheadProgress(stepId);

      handleStepEnter(stepId, response.direction);
    })
    .onStepExit(response => {
      const stepId = response.element.dataset.step;
      // Only reset when scrolling UP (direction === "up" means user is going back)
      if (response.direction === "up") {
        handleStepExit(stepId);
      }
    });
}


function handleStepEnter(stepId, direction) {
  const ch1 = dispatch.ch1;
  const ch2 = dispatch.ch2;
  const ch3 = dispatch.ch3;

  // === CHAPTER 1: The Race ===

  if (stepId === "race-1" && ch1) {
    const dur = 1500;
    ch1.pathFlop.transition().duration(dur).ease(d3.easeLinear)
      .attr("stroke-dashoffset", 0)
      // After the draw animation completes, restore the solid line
      //           (pathFlop is solid, so just set dasharray to none equivalent)
      .on("end", function() {
        d3.select(this).attr("stroke-dasharray", null);
      });

    ch1.pathEff.transition().duration(dur).ease(d3.easeLinear)
      .attr("stroke-dashoffset", 0)
      .on("end", function() {
        d3.select(this).attr("stroke-dasharray", "6 3");
      });

    ch1.dotFlop.transition().delay(dur).duration(300).attr("opacity", 1);
    ch1.dotEff.transition().delay(dur).duration(300).attr("opacity", 1);
    ch1.yearDotsFlop.transition().delay(dur).duration(300).attr("opacity", 0.7);
    ch1.yearDotsEff.transition().delay(dur).duration(300).attr("opacity", 0.7);
  }

  if (stepId === "race-2" && ch1) {
    ch1.annotation.transition().duration(400).attr("opacity", 1);
  }

  if (stepId === "race-3" && ch1) {
    // Pulse the endpoint dot to draw attention to the 2025 extreme
    ch1.dotFlop
      .transition().duration(300).attr("r", 8)
      .transition().duration(300).attr("r", 4)
      .transition().duration(300).attr("r", 7)
      .transition().duration(300).attr("r", 4);
  }

  // === CHAPTER 2: The Map ===
  // Scroll triggers gentle rotations; drag always takes priority
  //           because animateRotateTo uses d3.transition which is
  //           immediately overridden when a drag event fires.

  if (stepId === "map-1" && ch2) {
    // Rotate to Americas (US dominance story)
    ch2.animateRotateTo([-98, 38]);
  }

  if (stepId === "map-2" && ch2) {
    // Swing to Middle East / Asia (UAE + China carbon multiplier story)
    ch2.animateRotateTo([70, 25]);
  }

  if (stepId === "map-3" && ch2) {
    // Highlight the what-if box with a subtle pulse
    d3.select("#what-if-box")
      .style("border-color", "var(--accent-compute)")
      .transition().duration(600)
      .style("border-color", "var(--ink)")
      .transition().duration(600)
      .style("border-color", "var(--accent-compute)")
      .transition().duration(600)
      .style("border-color", "var(--ink)");
  }

  // === CHAPTER 3: The Shift ===

  if (stepId === "shift-1" && ch3) {
    // Animate dots from bottom to their simulated positions
    ch3.dots.transition()
      .duration(800)
      .delay((d, i) => i * 8)
      .ease(d3.easeCubicOut)
      .attr("cy", d => d.y);
  }

  if (stepId === "shift-2" && ch3) {
    // Reveal median lines
    ch3.medianLines.transition()
      .duration(500)
      .delay((d, i) => i * 150)
      .attr("opacity", 0.8);


    d3.select("#by-the-numbers").transition()
      .duration(500).delay(600)
      .style("opacity", 1);
  }

  if (stepId === "shift-3" && ch3) {
    // Highlight Multimodal dots by dimming others
    ch3.dots.transition().duration(400)
      .attr("fill-opacity", d => d.domainGroup === "Multimodal" ? 0.9 : 0.2)
      .attr("stroke-opacity", d => d.domainGroup === "Multimodal" ? 1 : 0.15);
  }
}


/*Reset animations when scrolling back up past a trigger */
function handleStepExit(stepId) {
  const ch1 = dispatch.ch1;
  const ch3 = dispatch.ch3;

  // Scrolling back up past race-1: re-hide the lines so they can animate in again
  if (stepId === "race-1" && ch1) {
    ch1.pathFlop
      .attr("stroke-dasharray", ch1.flopLen)
      .attr("stroke-dashoffset", ch1.flopLen);
    ch1.pathEff
      .attr("stroke-dasharray", ch1.effLen)
      .attr("stroke-dashoffset", ch1.effLen);
    ch1.dotFlop.attr("opacity", 0);
    ch1.dotEff.attr("opacity", 0);
    ch1.yearDotsFlop.attr("opacity", 0);
    ch1.yearDotsEff.attr("opacity", 0);
  }

  // Scrolling back up past race-2: hide the annotation
  if (stepId === "race-2" && ch1) {
    ch1.annotation.attr("opacity", 0);
  }

  // Scrolling back up past shift-1: drop dots back to bottom
  if (stepId === "shift-1" && ch3) {
    ch3.dots.attr("cy", ch3.chartHeight);
  }

  // Scrolling back up past shift-2: hide medians and By The Numbers
  if (stepId === "shift-2" && ch3) {
    ch3.medianLines.attr("opacity", 0);
    d3.select("#by-the-numbers").style("opacity", 0);
  }

  // Scrolling back up past shift-3: restore all dots to full opacity
  if (stepId === "shift-3" && ch3) {
    ch3.dots.transition().duration(300)
      .attr("fill-opacity", 0.75)
      .attr("stroke-opacity", 0.9);
  }
}
