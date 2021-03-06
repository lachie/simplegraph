/*
 * SimpleGraph
 *
 * Copyright (c) 2008 Ben Askins
 * 
 * Based on the raphael analytics example (http://raphaeljs.com/analytics.html) by Dmitry Baranovskiy 
 *
 * Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.
 */


function SimpleGraph(target, labels, data, units) {
  this.target = target;
  this.labels = labels;
  this.data = data;

  this.settings = $.extend({
    units: units,
    // Dimensions
    width: 600,
    height: 250,
    leftGutter: 30,
    bottomGutter: 20,
    topGutter: 20,
    // Label Style
    labelColor: "#000",
    labelFont: "Arial",
    labelFontSize: "9px",
    // Grid Style
    gridBorderColor: "#ccc",
    // Graph Style
    // -- Points
    drawPoints: true,
    pointColor: "#000",
    pointRadius: 4,    
    activePointRadius: 7,    
    // -- Line
    drawLine: true,
    lineColor: "#000",
    lineWidth: 2,
    lineJoin: "round",
    // -- Fill
    fillUnderLine: false,
    fillColor: "#000",
    fillOpacity: 0.2,
    // -- Hover
    addHover: true,
  }, (arguments[4] || {}) );


  var r = Raphael(target, this.settings.width, this.settings.height);
  
  // Draw a grid to paint points over
  this.drawGrid = function(maxOveride) {
    this.changeYAxis(maxOveride);

    // It's assumed that the X Axis remains static over multiple values of Y, so this code stays where it is
    this.X            = (this.settings.width - this.settings.leftGutter) / this.labels.length;
    this.leftGridEdge = this.settings.leftGutter + this.X * .5;
    this.topGridEdge  = this.settings.topGutter;
    this.gridWidth    = this.settings.width - this.settings.leftGutter - this.X;
    this.columns      = this.labels.length - 1; 
            
    r.drawGrid(
      this.leftGridEdge, 
      this.topGridEdge, 
      this.gridWidth, 
      this.gridHeight, 
      this.columns, 
      this.rows, 
      this.settings.gridBorderColor
    );
    
    // Label the X axis
    this.addXAxisLabels(this.labels);
  }

  this.newDataSet = function(labels, data, maxOveride) {
    this.labels = labels;
    this.data   = data;
    this.changeYAxis(maxOveride);
  }
  
  // Change the Y axis scale based on either the maximum value in the data array, or the maxOveride, whichever is higher. 
  this.changeYAxis = function(maxOveride) {
    this.gridHeight = this.settings.height - this.settings.topGutter - this.settings.bottomGutter;
    maxValueYAxis   = this.calculateMaxYAxis(maxOveride);
    this.Y          = this.gridHeight / maxValueYAxis;
    this.rows       = maxValueYAxis / 2; //TODO PARAM - steps per row
  }

  // Determine the maximum value of the Y Axis
   this.calculateMaxYAxis = function(maxOveride) {
    var max = Math.max.apply(Math, this.data);
    if (maxOveride && maxOveride > max) {
      max = maxOveride;
    }
    return max;
  }

  // Add labels to the Y Axis
  this.addYAxisLabels = function(offset, label) {
    // Legend
    r.rect(
      this.leftGridEdge - (30 + offset), //TODO PARAM - Label Colum Width
      this.topGridEdge, 
      30, //TODO PARAM - Label Column Width
      this.gridHeight
    ).attr({stroke: this.settings.lineColor, fill: this.settings.lineColor, opacity: 0.3}); //TODO PARAMS - legend border and fill style
    
    for (var i = 0, ii = this.rows + 1; i < ii; i++) {
      var y = Math.round(this.settings.height - this.settings.bottomGutter - (i * (this.gridHeight / this.rows)) + 3),
          x = this.leftGridEdge - (10 + offset),
          t = r.text(x, y, i*2).attr(this.yAxisLabelStyle);
    }
    var caption = r.text(
      this.leftGridEdge - (20 + offset), 
      (this.gridHeight/2) + (label.length / 2), 
      label + " (" + this.settings.units + ")").attr(this.yAxisCaptionStyle); 
    // You spin me right round, baby right round
    caption.rotate(270);
  }
  
  this.addXAxisLabels = function() {
    for (var i = 0, ii = this.labels.length; i < ii; i++) {
        var x = Math.round(this.settings.leftGutter + this.X * (i + .5)),
            t = r.text(x, this.settings.height - 6, this.labels[i]).attr(this.xAxisLabelStyle).toBack();
    }
  }
  
  // Plot points on the graph
  this.plot = function() {
    var label            = [],
        is_label_visible = false,
        leave_timer;
    
    // Line path
    var path = r.path({stroke: this.settings.lineColor, "stroke-width": this.settings.lineWidth, "stroke-linejoin": this.settings.lineJoin}); 
    
    // Fill path
    var bgp = r.path({stroke: "none", fill: this.settings.fillColor, opacity: this.settings.fillOpacity})
                .moveTo(this.settings.leftGutter + this.X * .5, this.settings.height - this.settings.bottomGutter);

    var dots  = r.group(),
        cover = r.group();
    
    // Hover frame
    var frame = dots.rect(10, 10, 100, 40, 5).attr({fill: "#fff", stroke: "#474747", "stroke-width": 2}).hide(); //TODO PARAM - fill colour, border colour, border width
    label[0] = r.text(60, 25, "").attr(this.hoverValueStyle).hide(); 
    label[1] = r.text(60, 40, "").attr(this.hoverLabelStyle).hide(); 

    // Plot the points
    for (var i = 0, ii = this.labels.length; i < ii; i++) {
        var y = Math.round(this.settings.height - this.settings.bottomGutter - this.Y * this.data[i]),
            x = Math.round(this.settings.leftGutter + this.X * (i + .5));
        if (this.settings.drawPoints) {
          var dot  = dots.circle(x, y, this.settings.pointRadius).attr({fill: this.settings.pointColor, stroke: "#fff"});
        }
        if (this.settings.drawLine) {
          path[i == 0 ? "moveTo" : "cplineTo"](x, y, 10);
        }
        if (this.settings.fillUnderLine) {
          bgp[i == 0 ? "lineTo" : "cplineTo"](x, y, 10);
        }
        if (this.settings.addHover) {
          var rect = r.rect(x - 50, y - 50, 100, 100).attr({stroke: "none", fill: "#fff", opacity: 0}); //TODO PARAM - hover target width / height
          // Dimitry's animation magic
          (function addHoverAnimation(x, y, data, lbl, dot, settings) {
            var timer, i = 0;
            $(rect[0]).hover(function () {
                clearTimeout(leave_timer);
                var newcoord = {x: x * 1 + 7.5, y: y - 19};
                if (newcoord.x + 100 > settings.width) {
                    newcoord.x -= 114;
                }
                frame.show().animateTo(newcoord.x, newcoord.y, (is_label_visible ? 100 : 0));
                label[0].attr({text: (data + settings.units)}).show().animateTo(newcoord.x * 1 + 50, newcoord.y * 1 + 15, (is_label_visible ? 100 : 0));
                label[1].attr({text: lbl}).show().animateTo(newcoord.x * 1 + 50, newcoord.y * 1 + 30, (is_label_visible ? 100 : 0));
                if (settings.drawPoints) {
                  dot.attr("r", settings.activePointRadius);
                }
                is_label_visible = true;
                r.safari();
            }, function () {
                if (settings.drawPoints) {
                  dot.attr("r", settings.pointRadius);
                }
                r.safari();
                leave_timer = setTimeout(function () {
                    frame.hide();
                    label[0].hide();
                    label[1].hide();
                    is_label_visible = false;
                    r.safari();
                }, 1);
            });    
          })(x, y, this.data[i], this.labels[i], dot, this.settings);          
        }
    }
    if (this.settings.fillUnderLine) {
      bgp.lineTo(x, this.settings.height - this.settings.bottomGutter).andClose();      
    }
    frame.toFront();
  }

  this.setStyleDefaults = function() {
    // X and Y axis labels and captions default to global style if not provided
    // - X Axis Labels
    if (!this.settings.xAxisLabelColor) {
      this.settings.xAxisLabelColor = this.settings.labelColor;
    }
    if (!this.settings.xAxisLabelFont) {
      this.settings.xAxisLabelFont = this.settings.labelFont;
    }
    if (!this.settings.xAxisLabelFontSize) {
      this.settings.xAxisLabelFontSize = this.settings.labelFontSize;
    }
    // - Y Axis Labels
    if (!this.settings.yAxisLabelColor) {
      this.settings.yAxisLabelColor = this.settings.labelColor;
    }
    if (!this.settings.yAxisLabelFont) {
      this.settings.yAxisLabelFont = this.settings.labelFont;
    }
    if (!this.settings.yAxisLabelFontSize) {
      this.settings.yAxisLabelFontSize = this.settings.labelFontSize;
    }
    // - Y Axis Caption
    if (!this.settings.yAxisCaptionColor) {
      this.settings.yAxisCaptionColor = this.settings.labelColor;
    }
    if (!this.settings.yAxisCaptionFont) {
      this.settings.yAxisCaptionFont = this.settings.labelFont;
    }
    if (!this.settings.yAxisCaptionFontSize) {
      this.settings.yAxisCaptionFontSize = this.settings.labelFontSize;
    }
    // - Hover Labels - Labels from the X Axis that appear when hovering over points in the graph
    if (!this.settings.hoverLabelColor) {
      this.settings.hoverLabelColor = this.settings.labelColor;
    }
    if (!this.settings.hoverLabelFont) {
      this.settings.hoverLabelFont = this.settings.labelFont;
    }
    if (!this.settings.hoverLabelFontSize) {
      this.settings.hoverLabelFontSize = this.settings.labelFontSize;
    }
    // - Hover Values - Values from the Y Axis that appear when hovering over points in the graph
    if (!this.settings.hoverValueColor) {
      this.settings.hoverValueColor = this.settings.labelColor;
    }
    if (!this.settings.hoverValueFont) {
      this.settings.hoverValueFont = this.settings.labelFont;
    }
    if (!this.settings.hoverValueFontSize) {
      this.settings.hoverValueFontSize = this.settings.labelFontSize;
    }
    // Label Styles
    // - General
    this.labelStyle = {
      font: this.settings.labelFontSize + '"' + this.settings.labelFont + '"', 
      fill: this.settings.labelColor
    }
    // - X Axis Labels
    this.xAxisLabelStyle = {
      font: this.settings.xAxisLabelFontSize + '"' + this.settings.xAxisLabelFont + '"', 
      fill: this.settings.xAxisLabelColor
    }
    // - Y Axis Labels
    this.yAxisLabelStyle = {
      font: this.settings.yAxisLabelFontSize + '"' + this.settings.yAxisLabelFont + '"', 
      fill: this.settings.yAxisLabelColor
    }
    // - Y Axis Caption
    this.yAxisCaptionStyle = {
      font: this.settings.yAxisCaptionFontSize + '"' + this.settings.yAxisCaptionFont + '"', 
      fill: this.settings.yAxisCaptionColor
    }
    // - Hover Labels
    this.hoverLabelStyle = {
      font: this.settings.hoverLabelFontSize + '"' + this.settings.hoverLabelFont + '"', 
      fill: this.settings.hoverLabelColor
    }
    // - Hover Values
    this.hoverValueStyle = {
      font: this.settings.hoverValueFontSize + '"' + this.settings.hoverValueFont + '"', 
      fill: this.settings.hoverValueColor
    }    
  }
  this.setStyleDefaults();
}
