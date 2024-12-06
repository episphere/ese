import { euclideanDistance } from "./helper.js";
import { State } from "./State.js";
import { Tabulator, SelectRowModule } from 'https://cdn.jsdelivr.net/npm/tabulator-tables@6.2.1/+esm';
import jszip from "https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm";

Tabulator.registerModule([SelectRowModule])

const CONSTANTS = {
  DEFAULT_STATE: {
    dataConfig: { path: "/ese/data/tcga_reports.json.zip"},
  }
}

class Application {
  constructor() {
    this.init();
  }

  async init() {
    this.elems = this.elementRetrieval({
      content: "#content",
      loading: "#loading",
      explorerContainer: "#gr-container-explorer",
      closestTableContainer: "#closest-table-container",
      referenceDocumentContainer: "#reference-document-container",
      comparedDocumentContainer: "#compared-document-container",
    })

    this.initState();

    this.state.trigger("dataConfig");
  }

  initState() {
    const initialState = CONSTANTS.DEFAULT_STATE;
    
    this.state = new State();
    this.state.defineProperty("dataConfig", initialState.dataConfig);   
    this.state.subscribe("dataConfig", () => this.dataConfigUpdated());

    this.state.defineProperty("focusDocument", null); 
    this.state.subscribe("focusDocument", () => this.focusDocumentUpdated());
    this.state.defineProperty("compareDocument", null);
    this.state.subscribe("compareDocument", () => this.compareDocumentUpdated());
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
        
        this.elems.loading.style.display = "none";
        this.elems.content.style.display = "block";
      }
    
    }
    this.drawExplorer();
  }

  async focusDocumentUpdated() {
    this.drawUpdateExplorer();

    const distances = this.data.map(d => euclideanDistance(d.embedding, this.state.focusDocument.embedding));
    this.data.forEach((doc,i) => doc._distance = distances[i]);
    this.drawTable();

    this.elems.referenceDocumentContainer.innerText = this.state.focusDocument.text;
  }

  async compareDocumentUpdated() {
    const compareDocument = this.state.compareDocument[0];
    this.elems.comparedDocumentContainer.innerText = compareDocument.text;
    this.drawUpdateExplorer();
  }

  drawUpdateExplorer() {
    const colors = this.data.map(() => "grey");
    const sizes = this.data.map(() => 5);


    if (this.state.compareDocument) {
      this.state.compareDocument.forEach(doc =>  colors[doc._index] = "blue");
     
      sizes[this.state.compareDocument._index] = 10;
    }
    if (this.state.focusDocument) {
      colors[this.state.focusDocument._index] = "green";
      sizes[this.state.focusDocument._index] = 15;
    }

    const update = {
      marker: { 
        color: colors,
        size: sizes,
      }
    };
    // setTimeout is a workaround for a Plotly bug (https://github.com/plotly/plotly.js/issues/1025)
    setTimeout(() => Plotly.restyle(this.elems.explorerContainer, update, [0]), 50);
  }

  drawExplorer() {
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
    })
  }

  drawTable() {
    const bbox = this.elems.closestTableContainer.getBoundingClientRect();

    const tableData = this.data
      // .filter(doc => doc.id != this.state.focusDocument.id)
      .map(doc => ({
        ...doc.properties,
        distance: parseFloat(doc._distance.toFixed(3)),
        _doc: doc,
      }));
    tableData.sort((a,b) => a.distance - b.distance);

    const columns = [...Object.keys(tableData[0])].filter(d => !d.startsWith("_")).map(d => ({field: d, title: d}));

    const table = new Tabulator(this.elems.closestTableContainer, {
      data: tableData, 
      height: bbox.height,
      layout:"fitDataFill",
      selectableRows: true,
      selectableRowsRangeMode:"click",
      columns
    });

    // table.on("rowSelected", (row) => {
    //   console.log(row)
    //   this.state.compareDocument = row._row.data._doc;
    // })

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