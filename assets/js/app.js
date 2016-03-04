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
var this_year = 2005;

// setup D3 graph
var graph = d3.select("#graph")
  .attr("style", "width:"+width+"px;height:"+height+"px")
  .append("svg")
    .attr("width", width)
    .attr("height", height);

var links = graph.selectAll(".link");
var node = graph.selectAll(".node");

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

  var node_names = new Set();
  var i;
  for (i = 0; i < threshold && i < all_nodes.length; ++i) {
    node_names.add(all_nodes[i].name);
  }

  var addLinks = function (l) {
    if (node_names.has(l.target.name)) {
      if (!nodes[l.source.name]) nodes[l.source.name] = l.source;
      if (!nodes[l.target.name]) nodes[l.target.name] = l.target;
      node_links.push(l);
    }
  };
  for (i = 0; i < threshold && i < all_nodes.length; ++i) {
    var n = all_nodes[i];
    n.px = n.py = i;
    node_to_links[n.name].forEach(addLinks);
  }

  // force-directed layout settings
  var force = d3.layout.force()
    .size([width, height])
    .linkStrength(1)
    .friction(0.01)
    .charge(-100)
    .linkDistance(width / 2)
    .gravity(0.8)
    .theta(0.8)
    .on("tick", tick);

  var drag = force.drag()
    .on("dragstart", dragstart);

  force.nodes(d3.values(nodes))
    .links(node_links)
    .start();

  links = links.data(force.links());
  links_data = links.data(force.links());

  links.enter().append("line")
    .attr("stroke-opacity", function (d) {
      return Math.log(d.count) / Math.log(max_links);
    })
    .attr("class", function (d) { return "link date" + d.date; })
    .on("mouseover", linktip.show)
    .on("mouseout", linktip.hide);

  node = node.data(force.nodes());

  var node_enter = node.enter().append("g")
    .attr("class", function (d) {
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
      .attr("r", function(d) { return Math.log(d.count) * 0.5; });

  // add node name
  node.append("text")
      .attr("x", 12)
      .attr("dy", ".35em")
      .attr("style", function(d) {
        var font_size = Math.floor(Math.log(d.count));
        return "font-size:" + font_size + "px";
      })
      .text(function(d) { return d.name; });

  node.exit().remove();

  links_data.exit().remove();

  updateDate();

  for (i = 0; i < threshold; i++) { force.tick(); }
  force.stop();
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

function updateDate() {
  d3.selectAll(".link")
    .attr("visibility", "hidden");
  d3.selectAll(".node")
    .attr("visibility", "hidden");
  d3.selectAll(".date" + this_year)
    .attr("visibility", "visible");
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
    start: 0,
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
  slider.noUiSlider.on('change', function () {
    this_year = Math.floor(slider.noUiSlider.get());
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

  makeDateSlider();
  makeThresholdSlider();

  // process nodes
  all_nodes = data.nodes;
  num_nodes = data.nodes.length;
  all_nodes.forEach(function (n) {
    node_to_links[n.name] = [];
    node_by_name[n.name] = n;
  });

  // process link data
  all_links = data.links;
  all_links.forEach(function(l) {
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

  $.isLoading("hide");
});
