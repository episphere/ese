import { cosineSimilarity, createDropdownButton, embedGemini, euclideanDistance, hookDropdownButton } from "./helper.js";
import { State } from "./State.js";
import { Tabulator, SelectRowModule } from 'https://cdn.jsdelivr.net/npm/tabulator-tables@6.2.1/+esm';
import jszip from "https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";


Tabulator.registerModule([SelectRowModule])

const EXAMPLE_DATA = [
  { id: "tcga_reports", path: "/ese/data/tcga_reports.json.zip", colorBy: "cancer_type"},
  // { id: "tcga_reports_verbose", path: "/ese/data/tcga_reports_verbose.json.zip", colorBy: "cancer_type" },
  { id: "tcga_reports_verbose", path: "/ese/data/tcga_reports_verbose_tsne.json.zip", colorBy: "cancer_type" },
  { id: "soc_codes", path: "/ese/data/soc_code_jobs.json.zip" }
]

const CONSTANTS = {
  DEFAULT_STATE: {
    dataConfig: EXAMPLE_DATA[1]
  }
}

class Application {
  constructor() {
    this.init();
  }

  async init() {
    this.url = new URL(window.location.href);

    this.elems = this.elementRetrieval({
      content: "#content",
      loading: "#loading",
      explorerContainer: "#gr-container-explorer",
      closestContainer: "#gr-container-closest",
      closestTableContainer: "#closest-table-container",
      referenceDocumentContainer: "#reference-document-container",
      comparedDocumentContainer: "#compared-document-container",
      searchForm: "#search-form",
      searchInput: "#search-input",

      buttonFill: "#button-fill"
    })

    this.initState();
    this.hookInputs();

    let resizeTimeout;
    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }

      this.elems.explorerContainer.innerHTML = '';
      resizeTimeout = setTimeout(() => {
        this.drawExplorer();
      }, 100);

      // Kind of hack-y
      this.elems.closestTableContainer.innerHTML = '';
      resizeTimeout = setTimeout(() => {
        const containerWidth = this.elems.closestContainer.getBoundingClientRect().width;
        if (containerWidth > 0) {
          this.elems.closestTableContainer.style.width = (containerWidth-35) + "px";
        }
        this.drawTable();
      }, 100);
      
    });
    resizeObserver.observe(this.elems.content);

    this.state.trigger("dataConfig");
  }

  initState() {
    const initialState = CONSTANTS.DEFAULT_STATE;

    if (this.url.searchParams.has("example_data")) {
      initialState.dataConfig = EXAMPLE_DATA.find(d => d.id == this.url.searchParams.get("example_data"));
    }
    
    this.state = new State();
    this.state.defineProperty("dataConfig", initialState.dataConfig);   
    this.state.subscribe("dataConfig", () => this.dataConfigUpdated());

    this.state.defineProperty("focusDocument", null); 
    this.state.subscribe("focusDocument", () => this.focusDocumentUpdated());
    this.state.defineProperty("compareDocument", null);
    this.state.subscribe("compareDocument", () => this.compareDocumentUpdated());

    // this.state.defineProperty("measure", { f: euclideanDistance, type: "distance" });
    this.state.defineProperty("measure", { f: cosineSimilarity, type: "similarity" });

    this.state.defineProperty("colorBy", initialState.dataConfig.colorBy);
    this.state.defineProperty("colorByOptions", []);

    this.state.subscribe("colorBy",  () => this.compareDocumentUpdated());
  }

  hookInputs() {
    this.elems.searchForm.addEventListener("submit", (e) => {
      e.preventDefault();

      if (!localStorage.GEMINI_API_KEY) {
        localStorage.GEMINI_API_KEY = prompt("A Gemini API key is required to use semantic search. Enter your's here:");
      }

      embedGemini(this.elems.searchInput.value, localStorage.GEMINI_API_KEY).then((result) => {
        this.state.focusDocument = { 
          text: this.elems.searchInput.value, 
          embedding: result.embedding.values,
        };
      });
    })

    hookDropdownButton(this.elems.buttonFill, this.state, "colorBy", "colorByOptions");

    // createDropdownButton(this.elems.buttonFill, [
    //   { text: "patient_id", callback: d => d}
    // ], { header: "Fill Points By"})
  }

  async dataConfigUpdated() {
    if (this.state.dataConfig.path) {
      if (this.state.dataConfig.path.endsWith(".zip")) {
        let data = await (await fetch(this.state.dataConfig.path)).blob();
        const zip = new jszip();
        await zip.loadAsync(data);
        const filename = this.state.dataConfig.path.split("/").at(-1).replace(".zip", "");
        data = await (await zip.file(filename)).async("string");
        data = JSON.parse(data);
        this.data = data;
        this.data.forEach((doc, i) => doc._index = i);
        this.state.focusDocument = this.data[0];
        this.state.colorByOptions = [...Object.keys(this.data[0].properties)];
        
        this.elems.loading.style.display = "none";
        this.elems.content.style.display = "block";
      }
    
    }
    this.drawExplorer();
  }

  async focusDocumentUpdated() {
    this.drawUpdateExplorer();

    const measures = this.data.map(d => this.state.measure.f(d.embedding, this.state.focusDocument.embedding));
    this.data.forEach((doc,i) => doc._measure = measures[i]);
    this.drawTable();

    this.elems.referenceDocumentContainer.innerText = this.state.focusDocument.text;
  }

  async compareDocumentUpdated() {
    const compareDocument = this.state.compareDocument[0];
    this.elems.comparedDocumentContainer.innerText = compareDocument.text;
    this.drawUpdateExplorer();
  }

  drawUpdateExplorer() {

    let colors = this.data.map(() => "grey");
    const sizes = this.data.map(() => 5);

    if (this.state.compareDocument) {
      this.state.compareDocument.forEach(doc => colors[doc._index] = "blue");
      this.state.compareDocument.forEach(doc => sizes[doc._index] = 10);
    }
    if (this.state.focusDocument) {
      colors[this.state.focusDocument._index] = "green";
      sizes[this.state.focusDocument._index] = 15;
    }

    const colorMap = new Map();
    const colorRange = d3.schemeCategory10;
    const values = [...new Set(this.data.map(d => d.properties[this.state.colorBy]))];
    values.forEach((value, i) => colorMap.set(value, colorRange[i % colorRange.length]));
    // colors = this.data.map(d => d._measure);
    colors = this.data.map(d => colorMap.get(d.properties[this.state.colorBy]));

    const update = {
      marker: { 
        color: colors,
        size: sizes,
        // colorscale: "Blues",
      }
    };
    // setTimeout is a workaround for a Plotly bug (https://github.com/plotly/plotly.js/issues/1025)
    setTimeout(() => Plotly.restyle(this.elems.explorerContainer, update, [0]), 50);
  }

  drawExplorer() {
    if (!this.data) return;

    const pointTrace = {
      x: this.data.map(d => d.embedding3d[0]),
      y: this.data.map(d => d.embedding3d[1]),
      z: this.data.map(d => d.embedding3d[2]),
      mode: "markers",
      marker: {
        size: this.data.map(() => 5),
        color: this.data.map(() => "grey"),
      },
      type: 'scatter3d'
    };

    const layout = {
      margin: {
        l: 0,
        r: 0,
        b: 0,
        t: 0
      }
    };

    Plotly.newPlot(this.elems.explorerContainer, [pointTrace], layout);

    this.elems.explorerContainer.on("plotly_click", (data) => {
      const point = data.points[0];
      this.state.focusDocument = this.data[point.pointNumber];
    });

    this.drawUpdateExplorer();
  }

  drawTable() {

    if (!this.data) return;

    const measureType = this.state.measure.type;

    const tableData = this.data
      .map(doc => ({
        ...doc.properties,
        [measureType]: parseFloat(doc._measure.toFixed(3)),
        _doc: doc,
        _id: doc.id,
      }));

    if (measureType == "distance") {
      tableData.sort((a,b) => a.distance - b.distance);
    } else {
      tableData.sort((a,b) => b.similarity - a.similarity);
    }

    const columns = [...Object.keys(tableData[0])].filter(d => !d.startsWith("_")).map(d => ({field: d, title: d}));

    const table = new Tabulator(this.elems.closestTableContainer, {
      data: tableData, 
      // height: bbox.height,
      layout:"fitDataFill",
      selectableRows: true,
      selectableRowsRangeMode:"click",
      columns,
      index: "_id",
    });

    table.on("tableBuilt", () => table.selectRow([tableData[0]._id]));

    table.on("rowSelectionChanged", (data, rows, selected) => {
      const compareDocuments = [];
      for (const row of selected) {
        compareDocuments.push( row._row.data._doc);
      }
      this.state.compareDocument = compareDocuments;
    })
  }

  elementRetrieval(elements) {
    for (const [k,v] of Object.entries(elements)){
      elements[k] = document.querySelector(v);
    }
    return elements;
  }
}

new Application() 