# The A.I. Dispatch

An interactive narrative visualisation exploring the physical footprint of artificial intelligence — how compute demand outpaces hardware efficiency, how geography determines carbon cost, and how the shift to multimodal AI rewrites the energy baseline.

**[Live Demo →](https://suveerdhawan.github.io/ai-dispatch)**

## About

This project was built as part of FIT5147 Data Visualisation at Monash University. It communicates findings from an empirical analysis of 137 frontier AI models (2015–2025), investigating the tension between exponential AI scaling and the physical limits of global energy infrastructure.

The visualisation is styled as a digital newspaper broadsheet and uses a scrollytelling narrative structure across three chapters:

- **Chapter 1 — The Race:** A dual-axis line chart showing compute demand outgrowing hardware efficiency
- **Chapter 2 — The Map:** An interactive globe mapping AI carbon emissions against national grid intensity, with a "What If?" scenario calculator
- **Chapter 3 — The Shift:** A force-simulated beeswarm revealing the energy regime shift from Language to Multimodal models

## Tech Stack

- **D3.js v7** — all visualisations rendered directly via D3 (no high-level wrappers)
- **TopoJSON** — world geometry parsing for the globe projection
- **Scrollama** — Intersection Observer–based scroll triggers
- **Vanilla HTML/CSS/JS** — no frameworks, no build step

## Data Sources

- [Epoch AI](https://epoch.ai/) — Frontier model parameters, training compute, and hardware benchmarks
- [Ember](https://ember-climate.org/) — Global electricity grid carbon intensity data

## Running Locally

The project loads data via fetch, so it needs to be served over HTTP:

```bash
# Option 1: Python
python3 -m http.server 8000
# then open http://localhost:8000

# Option 2: VS Code Live Server extension
# Right-click index.html → Open with Live Server
```

## License

This project is academic work. The code is shared for portfolio purposes. Data sourced from Epoch AI and Ember under their respective terms.
