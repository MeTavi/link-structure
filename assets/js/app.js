
var width = document.getElementById("graph").offsetWidth;
var height = document.getElementById("graph").offsetHeight;

var force = d3.layout.force()
  .size([width, height])
    .linkStrength(0.5)
    .friction(0.1)
    .charge(-200)
    .linkDistance(60)
    .gravity(0.8)
    .theta(0.8)
  .on("tick", tick);

var drag = force.drag()
  .on("dragstart", dragstart);

var graph = d3.select("#graph");
var svg = graph.append("svg")
  .attr("width", width)
  .attr("height", height);

var loading = svg.append("text")
  .attr('x', width / 2)
  .attr('y', height / 2)
  .attr('class', 'loading')
  .text("Simulating...");

var link = svg.selectAll(".link");
var node = svg.selectAll(".node");

var allLinks = [];
var allNodes= [];

var nodesToLinks = {};
var nodesByName = {};

var threshold = 100;
var rT = Math.log(threshold);

var maxLinks = 1;
var numNodes = 1;

var minYear = 2005;
var maxYear = 2009;

var thisYear = 2005;

var nodetip = d3.tip()
   .attr('class', 'd3-tip')
   .offset([-10, 0])
   .html(function(d) { return "<div class='popup-tip'>" + d.name + "</div>"; });

var linktip = d3.tip()
  .attr('class', 'd3-tip')
  .offset([-10, 0])
  .html(function(l) {
    return "<div class='popup-tip'>" +
      "Link" + "<br>" + "source: " + l.source.name + "<br>" +
      "target: " + l.target.name + "<br>" + "year: " + l.date +
      "<br>" + "count: " + l.count + "<br>" + "</div>";
  });
svg.call(nodetip);
svg.call(linktip);

d3.csv("data/nodes.csv", function(error, data){
  allNodes = data.slice();
  allNodes.forEach(function(n) {
    nodesToLinks[n.name] = [];
    nodesByName[n.name] = n;
  });
  numNodes = allNodes.length;
  loadLinks();
});

function loadLinks(){
  d3.csv("data/links.csv", function(error, data){
    makeDateSlider();
    makeThresholdSlider();
    maxLinks = data[0].count;
    allLinks = data.slice();
    allLinks.forEach(function(l) {
      var sourceString = l.source;
      var targetString = l.target;
      l.source = nodesByName[sourceString];
      l.target = nodesByName[targetString];
      nodesToLinks[sourceString].push(l);
      if (sourceString != targetString) {
        var l2 = JSON.parse(JSON.stringify(l));
        l2.source = nodesByName[targetString];
        l2.target = nodesByName[sourceString];
        l2.date = l.date;
        nodesToLinks[targetString].push(l2);
      }
    });
    start();
  });
}

function start(){
  setTimeout(function() {
  var links = [];
  var nodes = {};

  var nodeNames = new Set();
  var i;
  for (i=0; i < threshold && i < allNodes.length; ++i) {
    nodeNames.add(allNodes[i].name);
  }
  for (i=0; i < threshold && i < allNodes.length; ++i) {
    var n = allNodes[i];
    n.px = n.py = i;
    nodesToLinks[n.name].forEach(function(l) {
      if (nodeNames.has(l.target.name)){
        if (!nodes[l.source.name]) nodes[l.source.name] = l.source;
        if (!nodes[l.target.name]) nodes[l.target.name] = l.target;
        links.push(l);
      }
    });
  }

  force.nodes(d3.values(nodes))
    .links(links)
    .start();

  update();

  for(i = 25; i > 0; --i) force.tick();
   force.stop();
   loading.attr("visibility", "hidden");
  });
}

function update() {
  link = link.data(force.links());

  link.enter().append("line")
    .attr("stroke-opacity", function(d) {
      return Math.log(d.count)/Math.log(maxLinks);
    })
    .attr("class", function(d) { return "link date" + d.date; })
    .on("mouseover", linktip.show)
    .on("mouseout", linktip.hide);
  node = node.data(force.nodes());
  var nodeEnter = node.enter().append("g")
    .attr("class", function(d) {
      var dates = new Set();
      var s = "node ";
      nodesToLinks[d.name].forEach(function(l) { dates.add(l.date); });
      dates.forEach(function(year) { s += "date" + year + " "; });
      return s;
    })
    .on("mouseover", nodetip.show)
    .on("mouseout", nodetip.hide)
    .on("dblclick", dblclick)
    .call(drag);

  nodeEnter.append("circle")
    .attr("r", 15/parseFloat(rT));

  node.exit().remove();

  link.exit().remove();
  updateDate();
}

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

function updateThreshold() {
  rT = Math.log(threshold);
  start();
}

function updateDate() {
  d3.selectAll(".link")
    .attr("visibility", "hidden");
  d3.selectAll(".node")
    .attr("visibility", "hidden");
  d3.selectAll(".date" + thisYear)
    .attr("visibility", "visible");
}

function tick() {
  link.attr("x1", function(d) { return d.source.x; })
    .attr("y1", function(d) { return d.source.y; })
    .attr("x2", function(d) { return d.target.x; })
    .attr("y2", function(d) { return d.target.y; });

  node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
}

function dragstart(d) {
  d3.select(this).classed("fixed", d.fixed = true);
}

function dblclick(d) {
    d3.select(this).classed("fixed", d.fixed = false);
}

function makeDateSlider(){
  var slider = document.getElementById('date-slider');
  noUiSlider.create(slider, {
    start: 0,
    step: 1,
    range: {
      'min': [minYear],
      'max': [maxYear]
    },
    pips: {
      mode: 'steps',
      density: '2',
    }
  });
  slider.noUiSlider.on('change', function(){
    thisYear = Math.floor(slider.noUiSlider.get());
    updateDate();
  });
}

function makeThresholdSlider(){
  var thresholdSlider = document.getElementById('threshold-slider');
  noUiSlider.create(thresholdSlider, {
    start: 100,
    step: 10,
    range: {
      'min': [0],
      'max': [numNodes]
    },
    pips: {
      mode: 'count',
      values: 10,
      density: 2,
    }
  });
  thresholdSlider.noUiSlider.on('change', function(){
    loading.moveToFront();
    loading.attr("visibility", "visible");
    threshold = Math.floor(thresholdSlider.noUiSlider.get());
    updateThreshold();
  });
}
