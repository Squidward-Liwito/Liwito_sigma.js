 /**
 * This is an example of sigma showing how to snapshot the rendered graph as a
 * PNG file.
 */

import Sigma from "sigma";
import Graph from "graphology";
import ForceSupervisor from "graphology-layout-force/worker";
import saveAsPNG from "./saveAsPNG";

const container = document.getElementById("sigma-container") as HTMLElement;

// Instantiate graph:
const graph = new Graph();

const RED = "#FA4F40";
const BLUE = "#727EE0";
const GREEN = "#5DB346";

graph.addNode("x", { size: 15, label: "x", color: RED });
graph.addNode("x_=x-mean", { size: 15, label: "x_", color: RED });
graph.addNode("u=(1/n)*sum(x,axis=0)", { size: 15, label: "u", color: RED });
graph.addNode("x_^2", { size: 15, label: "x_^2", color: BLUE });
graph.addNode("var", { size: 15, label: "var", color: BLUE });
graph.addNode("VSq=power(var+ß,0.5)", { size: 7, label: "VSq", color: GREEN });
graph.addNode("iVSq = ", { size: 7, label: "iVSq", color: GREEN });
graph.addNode("x_Bn", { size: 7, label: "x_Bn", color: GREEN });

graph.addEdge("x", "x_=x-mean", { type: "arrow", label: "works with", size: 5 ,color: RED});


graph.nodes().forEach((node, i) => {
  const angle = (i * 2 * Math.PI) / graph.order;
  graph.setNodeAttribute(node, "x", 100 * Math.cos(angle));
  graph.setNodeAttribute(node, "y", 100 * Math.sin(angle));
});

const renderer = new Sigma(graph, container, {
  renderEdgeLabels: true,
});

// Create the spring layout and start it:
const layout = new ForceSupervisor(graph);
layout.start();

// Bind save button:
const saveBtn = document.getElementById("save-as-png") as HTMLButtonElement;
saveBtn.addEventListener("click", () => {
  const layers = ["edges", "nodes", "edgeLabels", "labels"].filter(
    (id) => !!(document.getElementById(`layer-${id}`) as HTMLInputElement).checked,
  );

  saveAsPNG(renderer, layers);
});