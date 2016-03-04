var width = document.getElementById("graph").offsetWidth;
var height = document.getElementById("graph").offsetHeight;

var force = d3.layout.force()
  .size([width, height])
  .linkStrength(0.5)
  .friction(0.1)
  .charge(-200)
  .linkDistance(120)
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

var links = svg.selectAll(".link");
var node = svg.selectAll(".node");

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
svg.call(nodetip);
svg.call(linktip);

d3.csv("data/nodes.csv", function (error, data) {
  all_nodes = data.slice();
  all_nodes.forEach(function (n) {
    node_to_links[n.name] = [];
    node_by_name[n.name] = n;
  });
  num_nodes = all_nodes.length;
  loadLinks();
});

function loadLinks() {
  d3.csv("data/links.csv", function (error, data) {
    makeDateSlider();
    makeThresholdSlider();
    max_links = data[0].count;
    all_links = data.slice();
    all_links.forEach(function(l) {
      var sourceString = l.source;
      var targetString = l.target;
      l.source = node_by_name[sourceString];
      l.target = node_by_name[targetString];
      node_to_links[sourceString].push(l);
      if (sourceString != targetString) {
        var l2 = JSON.parse(JSON.stringify(l));
        l2.source = node_by_name[targetString];
        l2.target = node_by_name[sourceString];
        l2.date = l.date;
        node_to_links[targetString].push(l2);
      }
    });
    start();
  });
}

function start() {
  var links = [];
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
      links.push(l);
    }
  };
  for (i = 0; i < threshold && i < all_nodes.length; ++i) {
    var n = all_nodes[i];
    n.px = n.py = i;
    node_to_links[n.name].forEach(addLinks);
  }

  force.nodes(d3.values(nodes))
    .links(links)
    .start();

  update();

  for (i = 25; i > 0; --i) force.tick();
  force.stop();
  loading.attr("visibility", "hidden");
}

function update() {
  links = links.data(force.links());

  links.enter().append("line")
    .attr("stroke-opacity", function (d) {
      return Math.log(d.count) / Math.log(max_links);
    })
    .attr("class", function (d) {
      return "link date" + d.date;
    })
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
      dates.forEach(function (year) {
        s += "date" + year + " ";
      });
      return s;
    })
    .on("mouseover", nodetip.show)
    .on("mouseout", nodetip.hide)
    .on("dblclick", dblclick)
    .call(drag);

  node_enter.append("circle")
    .attr("r", function(d) { return Math.log(d.count) * 0.5; });

  node.exit().remove();

  links.exit().remove();

  updateDate();
}

d3.selection.prototype.moveToFront = function () {
  return this.each(function () {
    this.parentNode.appendChild(this);
  });
};

function updateThreshold() {
  rt = Math.log(threshold);
  start();
}

function updateDate() {
  d3.selectAll(".link")
    .attr("visibility", "hidden");
  d3.selectAll(".node")
    .attr("visibility", "hidden");
  d3.selectAll(".date" + this_year)
    .attr("visibility", "visible");
}

function tick() {
  links.attr("x1", function (d) {
      return d.source.x;
    })
    .attr("y1", function (d) {
      return d.source.y;
    })
    .attr("x2", function (d) {
      return d.target.x;
    })
    .attr("y2", function (d) {
      return d.target.y;
    });

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
    loading.moveToFront();
    loading.attr("visibility", "visible");
    threshold = Math.floor(thresholdSlider.noUiSlider.get());
    updateThreshold();
  });
}
