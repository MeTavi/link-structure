// Global variables
// ---------------------------------

// TODO: this better
var width = document.getElementById("graph").offsetWidth;
var height = document.getElementById("graph").offsetHeight;

var all_links = [];
var all_nodes = [];

var node_to_links = {};
var node_by_name = {};

var threshold = 100;
var rt = Math.log(threshold);

var max_links = 1;
var num_nodes = 1;

var min_year = 2005;
var max_year = 2009;

// setup D3 graph
var graph = d3.select("#graph")
  .attr("style", "width:"+width+"px;height:"+height+"px")
  .append("svg")
    .attr("width", width)
    .attr("height", height);

var links = graph.selectAll(".link");
var node = graph.selectAll(".node");

// force-directed layout settings
var force = d3.layout.force()
    .size([width, height])
    .chargeDistance(height / 10)
    .friction(0.02);

var drag = force.drag()
  .on("dragstart", dragstart);

// graph controls
var min_zoom = 0.1;
var max_zoom = 7;
var zoom = d3.behavior.zoom().scaleExtent([min_zoom,max_zoom]);

// D3 tooltips
var nodetip = d3.tip()
  .attr('class', 'd3-tip')
  .offset([-10, 0])
  .html(function (d) {
    return "<div class='popup-tip'>" + d.name + "</div>";
  });

var linktip = d3.tip()
  .attr('class', 'd3-tip')
  .offset([-10, 0])
  .html(function (l) {
    return "<div class='popup-tip'>" +
      "Link" + "<br>" + "source: " + l.source.name + "<br>" +
      "target: " + l.target.name + "<br>" + "year: " + l.date +
      "<br>" + "count: " + l.count + "<br>" + "</div>";
  });
graph.call(nodetip);
graph.call(linktip);


// Functions
// ---------------------------------

function updateGraph() {
  var node_links = [];
  var nodes = {};
  var i;

  // configure links and nodes to display
  var node_names = new Set();
  for (i = 0; i < threshold && i < all_nodes.length; ++i) {
    node_names.add(all_nodes[i].name);
  }

  var addLinks = function (l) {
    if (node_names.has(l.target.name)) {
      if (!nodes[l.source.name]) {
        nodes[l.source.name] = l.source;
      }
      if (!nodes[l.target.name]) {
        nodes[l.target.name] = l.target;
      }
      node_links.push(l);
    }
  };
  for (i = 0; i < threshold && i < all_nodes.length; ++i) {
    var n = all_nodes[i];
    n.px = n.py = i;
    node_to_links[n.name].forEach(addLinks);
  }

  // links settings
  force.nodes(d3.values(nodes))
    .links(node_links)
    .linkStrength(function(l) { return Math.log(l.count) * 0.2; })
    .linkDistance(function(l) { return Math.log(l.count) * 10; })
    .gravity(function(l) { return Math.log(l.count) * 0.3; })
    .charge(function(l) { return Math.log(l.count) * -5; })
    .on("tick", tick)
    .start();

  links = links.data(force.links());

  links.enter().append("line")
    .attr("stroke-opacity", function (d) {
      return Math.log(d.count) / Math.log(max_links);
    })
    .attr("class", function (d) { return "link year" + d.date; })
    .on("mouseover", linktip.show)
    .on("mouseout", linktip.hide);

  // node settings
  node = node.data(force.nodes());
  var node_enter = node.enter().append("g")
    .attr("class", function(d) {
      var dates = new Set();
      var s = "node ";
      node_to_links[d.name].forEach(function (l) {
        dates.add(l.date);
      });
      dates.forEach(function (year) { s += "date" + year + " "; });
      return s;
    })
    .on("mouseover", nodetip.show)
    .on("mouseout", nodetip.hide)
    .on("dblclick", dblclick)
    .call(drag);

  // set node size
  node_enter.append("circle")
      .attr("r", function(d) { return Math.log(d.count) * 5; });

  // add node name
  node.append("text")
      .attr("x", 12)
      .attr("dy", ".35em")
      .attr("style", function(d) {
        var styles = [];
        var font_size = Math.log(d.count) * 5;
        styles.push("font-size:" + font_size + "px");
        styles.push("opacity:" + Math.log(d.count) * 0.1);
        return styles.join(";");
      })
      .text(function(d) { return d.name; });

  node.exit().remove();
  links.exit().remove();

  updateDate();

  for (i = 0; i < threshold; i++) { force.tick(); }
  force.stop();

  $.isLoading("hide");
}

function updateThreshold() {
  rT = Math.log(threshold);
  updateGraph();
}

d3.selection.prototype.moveToFront = function () {
  return this.each(function () {
    this.parentNode.appendChild(this);
  });
};

function updateDate(years) {
  // hide all links and nodes
  d3.selectAll(".link")
    .attr("visibility", "hidden");
  d3.selectAll(".node")
    .attr("visibility", "hidden");

  // re-show links and nodes from selected years
  var year_range = _.range(min_year, max_year + 1);
  year_range.forEach(function(year) {
    d3.selectAll(".date" + year)
      .attr("visibility", "visible");
  });
}

function tick() {
  links
    .attr("x1", function (d) { return d.source.x; })
    .attr("y1", function (d) { return d.source.y; })
    .attr("x2", function (d) { return d.target.x; })
    .attr("y2", function (d) { return d.target.y; });

  node.attr("transform", function (d) {
    return "translate(" + d.x + "," + d.y + ")";
  });
}

function dragstart(d) {
  d3.select(this).classed("fixed", d.fixed = true);
}

function dblclick(d) {
  d3.select(this).classed("fixed", d.fixed = false);
}

function displayLoader() {
  $.isLoading({text: "Loading", position: "overlay"});
}


// noUI sliders
// ---------------------------------

function makeDateSlider() {
  var slider = document.getElementById('date-slider');
  noUiSlider.create(slider, {
    start: [min_year, max_year],
    connect: true,
    step: 1,
    range: {
      'min': [min_year],
      'max': [max_year]
    },
    pips: {
      mode: 'steps',
      density: '2',
    }
  });
  slider.noUiSlider.on('change', function (values, handle) {
    min_year = parseInt(values[0]);
    max_year = parseInt(values[1]);
    updateDate();
  });
}

function makeThresholdSlider() {
  var thresholdSlider = document.getElementById('threshold-slider');
  noUiSlider.create(thresholdSlider, {
    start: 100,
    step: 10,
    range: {
      'min': [0],
      'max': [num_nodes]
    },
    pips: {
      mode: 'count',
      values: 10,
      density: 2,
    }
  });
  thresholdSlider.noUiSlider.on('change', function () {
    displayLoader();
    threshold = Math.floor(thresholdSlider.noUiSlider.get());
    updateThreshold();
  });
}



// Load data
// ---------------------------------

// display loader
displayLoader();

// import and process node data, then get link data
d3.json("/data/graph.json", function (error, data) {
  if (error) throw error;

  // process nodes
  var nodes = data.nodes;
  num_nodes = nodes.length;
  nodes.forEach(function (n) {
    n.name = n.domain;
    n.count = n.inDegree + n.outDegree;
    node_to_links[n.name] = [];
    node_by_name[n.name] = n;
  });
  // sort descending for threshold selecting
  all_nodes = _.sortBy(nodes, 'count').reverse();

  // process link data
  all_links = data.links;
  all_links.forEach(function(l) {
    l.source = l.src;
    l.target = l.dst;
    var source_str = l.source;
    var target_str = l.target;
    l.source = node_by_name[source_str];
    l.target = node_by_name[target_str];
    node_to_links[source_str].push(l);

    if (source_str != target_str) {
      var l2 = l;
      l2.source = node_by_name[target_str];
      l2.target = node_by_name[source_str];
      node_to_links[target_str].push(l2);
    }
  });

  updateGraph();

  makeDateSlider();
  makeThresholdSlider();
});
