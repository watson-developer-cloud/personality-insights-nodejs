/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

d3.svg.singleArc = function() {
  var radius = d3_svg_singleArcRadius,
    startAngle = d3_svg_singleArcStartAngle,
    endAngle = d3_svg_singleArcEndAngle,
    d3_svg_arcOffset = -Math.PI / 2;

  function arc() {
    var r0 = radius.apply(this, arguments),
      a0 = startAngle.apply(this, arguments) + d3_svg_arcOffset,
      a1 = endAngle.apply(this, arguments) + d3_svg_arcOffset,
      da = (a1 < a0 && (da = a0, a0 = a1, a1 = da), a1 - a0),
      df = da < Math.PI ? '0' : '1',
      c0 = Math.cos(a0),
      s0 = Math.sin(a0),
      c1 = Math.cos(a1),
      s1 = Math.sin(a1);
    return 'M' + r0 * c0 + ',' + r0 * s0 + 'A' + r0 + ',' +
      r0 + ' 0 ' + df + ',1 ' + r0 * c1 + ',' + r0 * s1;
  }

  arc.radius = function(v) {
    if (!arguments.length) return radius;
    radius = d3.functor(v);
    return arc;
  };

  arc.startAngle = function(v) {
    if (!arguments.length) return startAngle;
    startAngle = d3.functor(v);
    return arc;
  };

  arc.endAngle = function(v) {
    if (!arguments.length) return endAngle;
    endAngle = d3.functor(v);
    return arc;
  };

  arc.centroid = function() {
    var r = radius.apply(this, arguments),
      a = (startAngle.apply(this, arguments) +
        endAngle.apply(this, arguments)) / 2 + d3_svg_arcOffset;
    return [Math.cos(a) * r, Math.sin(a) * r];
  };

  return arc;
};

function d3_svg_singleArcRadius(d) {
  return d.radius;
}

function d3_svg_singleArcStartAngle(d) {
  return d.startAngle;
}

function d3_svg_singleArcEndAngle(d) {
  return d.endAngle;
}

var visutil = {
  isLocatedBottom: function(d) {
    // Before fixing #128: return (d.x>Math.PI/2&&(d.x+d.dx)<Math.PI*5/3);
    var bottom = (d.x > Math.PI / 2 && (d.x + d.dx) < 5.0);
    return bottom;
  },

  arc: function(start, end, r0) {
    var c0 = Math.cos(start),
      s0 = Math.sin(start),
      c1 = Math.cos(end),
      s1 = Math.sin(end);
    return 'M' + r0 * c0 + ',' + r0 * s0 + 'A' + r0 + ',' + r0 + ' 0' + ' 0 , 0 ' + r0 * c1 + ',' + r0 * s1;
  }
};

var renderChart = function() {
  if (!this.data) {
    this.showError();
    return;
  }
  if (this.vis) {
    console.error('Cannot render: Already rendered (this.vis)');
    return;
  }

  var _this = this;
  var dummyData = false;
  var tree = this.data ? (this.data.tree ? this.data.tree : this.data) : null;
  if (!tree || !tree.children || !tree.children.length) {
    return;
  }

  var _widget = this;
  if (!this.loadingDiv) {
    alert('Widget is not fully initialized, cannot render BarsWidget');
    return;
  }

  this.switchState(1);
  this._layout();

  function stash(d) {
    d.x0 = d.x;
    d.dx0 = d.dx;
    if (!d.hasOwnProperty('size') && !d.hasOwnProperty('children')) d.size0 = 1;
    else d.size0 = d.size;
    if (d.depth === 0 || d.depth === 1) {
      d.expand = 1;
    } else {
      d.expand = 0;
    }
  }

  function expandOrFoldSector(d) {
    if (d.expand !== null && d.depth > 1) {
      //ignore root node and first level sectors
      if (d.expand === 0) {
        if (d.children) d3.select(this).attr('opacity', 1);
        g.filter(function(a) {
            if (a.parent)
              return a.parent.id === d.id;
          })
          .attr('visibility', 'visible');
        d.expand = 1;
      } else {
        //if the sector is expanded
        if (d.children)
          d3.select(this).attr('opacity', 1);
        hideSector(d);

      }
    }
  }

  function hideSector(d) {
    g.filter(function(a) {
        if (a.parent)
          return a.parent.id === d.id;
      })
      .attr('visibility', 'hidden')
      .attr('opacity', 1)
      .each(function(a) {
        if (a.children)
          hideSector(a);
      });
    d.expand = 0;
  }


  var sector_right_pad = dummyData ? 0.0001 : 0.04 * 2 * Math.PI,
    sector_bottom_pad = 5.0;
  //Render a sector with two adjcent arcs in a style of odometor
  function twoArcsRender(radius) {
    // For each small multiple
    function twoArcs(g) {
      g.each(function(d) {
        g = d3.select(this);
        g.selectAll('path').remove();
        g.selectAll('text').remove();

        var right_pad = d.depth > 0 ? sector_right_pad / (3 * d.depth) : sector_right_pad;

        var percentage = d.percentage,
          percentage2 = 1; //for percentage sentiment data. it is the percentage of positive+netural

        //if percentage is null, then give 1
        if (percentage === null) percentage = 1;
        if (d.percentage_lbl === null) d.percentage_lbl = '';
        var label, label_name = d.name,
          label_percentage = (d.percentage === null ? '' : ' (' + (d.percentage * 100).toFixed(0) + '%)');

        if (d.depth === 1) label = d.name;
        if (d.depth > 1) {
          if (d.id === 'sbh_dom' || d.id === 'sbh_parent'){
            label = d.name;
          } else if (d.category === 'values') {
            label = d.name + ' (' + (percentage * 100).toFixed(0) + '%)';
          } else {
            if (percentage >= 1) {
              percentage = 0.99;
              console.log('Percentage is over 1!' + d.name);
            } else if (percentage <= -1) {
              percentage = -0.99;
              console.log('Percentage is below -1!' + d.name);
            }
            label = d.name + ' (' + (percentage * 100).toFixed(0) + '%)';

            if ((Math.round(parseFloat(percentage) * 100) / 100) === 0) {
              label = d.name;
            }
          }
        }

        //for request without any result
        if (d.name === '') {
          percentage = 0;
          label = '';
        }

        //special render perception sector
        if (d.perc_neu !== null && ((d.percentage + d.perc_neu) * d.dx < d.dx - sector_right_pad / (3 * d.depth))) {
          percentage2 = d.percentage + d.perc_neu;

          d3.svg.arc()
            .startAngle(function(d) {
              return d.x + Math.abs(percentage2) * d.dx;
            }) //x:startangle,
            .endAngle(function(d) {
              return d.x + d.dx - sector_right_pad / (3 * d.depth);
            }) //dx: endangle,
            .innerRadius(function(d) {
              return sector_bottom_pad + d.y;
            })
            .outerRadius(function(d) {
              return d.y + d.dy;
            });

          right_pad = 0;
        }


        var arc1_extend = (Math.abs(percentage) * d.dx - right_pad) > 0 ? (Math.abs(percentage) * d.dx - right_pad) : 0;
        //Regular renders
        var arc1 = d3.svg.arc()
          .startAngle(function(d) {
            return d.x;
          }) //x:startangle,
          .endAngle(function(d) {
            return d.x + arc1_extend;
          }) //dx: endangle,
          .innerRadius(function(d) {
            return sector_bottom_pad + d.y;
          })
          .outerRadius(function(d) {
            return d.y + d.dy;
          });

        var arc2 = d3.svg.arc()
          .startAngle(function(d) {
            return d.x + arc1_extend;
          }) //x:startangle,
          .endAngle(function(d) {
            return d.x + Math.abs(percentage2) * d.dx - right_pad;
          }) //dx: endangle,
          .innerRadius(function(d) {
            return sector_bottom_pad + d.y;
          })
          .outerRadius(function(d) {
            return d.y + d.dy;
          });

        //used for label path
        var arc_for_label, arc_for_label_number;
        var arc_label_radius, arc_label_number_radius;
        if (d.depth === 1 && visutil.isLocatedBottom(d)) {
          arc_label_radius = d.y + d.dy - (d.y + d.dy - sector_bottom_pad - d.y) / 6;
          arc_label_number_radius = d.y + d.dy - (d.y + d.dy - sector_bottom_pad - d.y) / 8;
        } else {
          arc_label_radius = sector_bottom_pad + d.y + (d.y + d.dy - sector_bottom_pad - d.y) * 5 / 12;
          arc_label_number_radius = d.y + d.dy - (d.y + d.dy - sector_bottom_pad - d.y) / 7;
        }


        var bottom = visutil.isLocatedBottom(d);
        if (bottom) {
          //special reversed label for bottom data
          arc_for_label = visutil.arc(d.x + d.dx - right_pad - Math.PI / 2, d.x - Math.PI / 2, arc_label_radius);
          arc_for_label_number = visutil.arc(d.x + d.dx - right_pad - Math.PI / 2, d.x - Math.PI / 2, arc_label_number_radius);
        } else {

          arc_for_label = d3.svg.singleArc()
            .startAngle(function(d) {
              return d.x;
            })
            .endAngle(function(d) {
              return d.x + d.dx - right_pad;
            })
            .radius(function(d) {
              return d.depth === 1 ? d.y + d.dy - (d.y + d.dy - sector_bottom_pad - d.y) / 3 : sector_bottom_pad + d.y + (d.y + d.dy - sector_bottom_pad - d.y) * 3 / 5;
            });

          arc_for_label_number = d3.svg.singleArc()
            .startAngle(function(d) {
              return d.x;
            })
            .endAngle(function(d) {
              return d.x + d.dx - right_pad;
            })
            .radius(function(d) {
              return d.depth === 1 ? d.y + d.dy - (d.y + d.dy - sector_bottom_pad - d.y) / 3 : sector_bottom_pad + d.y + (d.y + d.dy - sector_bottom_pad - d.y) / 5;
            });

        }

        d.coloridx = 0;

        if (d.depth === 1 || d.depth === 0) {
          d.coloridx = d.id;
        } else {
          d.coloridx = d.parent.coloridx;
        }

        var arc1color;
        if (d.coloridx === 'personality') arc1color = _widget.COLOR_PALLETTE[0];
        if (d.coloridx === 'needs') arc1color = _widget.COLOR_PALLETTE[1];
        if (d.coloridx === 'values') arc1color = _widget.COLOR_PALLETTE[2];
        if (d.coloridx === 'sr') arc1color = _widget.COLOR_PALLETTE[3];
        if (d.coloridx === 'sbh') arc1color = _widget.COLOR_PALLETTE[4];
        if (d.coloridx === 'blank') arc1color = _widget.COLOR_PALLETTE[6];

        arc1color = d.depth < 2 ? arc1color : d3.rgb(arc1color).brighter(Math.pow(1.1, d.depth * 1.5));

        var strokecolor = d3.rgb(arc1color).darker(0.8);


        if (!d.children && d.id !== 'srasrt' && d.id !== 'srclo' && d.id !== 'srdom') {
          label = d.name;
          percentage = d.percentage;
          var bar_length_factor = 10 / (d.depth - 2);

          //different bar_length factors
          if (d.parent)
            if (d.parent.parent) {

              if (d.parent.parent.id === 'needs' || d.parent.parent.id === 'values') {
                bar_length_factor = 1;
              }

              if (d.parent.parent.id === 'sbh') {
                //alert(d.name);
                bar_length_factor = 0;
                if (percentage > 1) {
                  percentage = Math.random();
                  d.percentage = percentage;
                }
              }
              if (d.parent.parent.parent)
                if (d.parent.parent.parent.id === 'personality') bar_length_factor = 1;

            } else {
              console.log(d.name + ': Parent is null!');
            }



          var inner_r = sector_bottom_pad + d.y,
            out_r;


          out_r = sector_bottom_pad + d.y + bar_length_factor * Math.abs(percentage) * d.dy;

          if (d.percentage_lbl === 'Low') out_r = sector_bottom_pad + d.y + bar_length_factor * 0.2 * d.dy;


          var _bar = d3.svg.arc()
            .startAngle(d.x)
            .endAngle(d.x + d.dx)
            .innerRadius(inner_r)
            .outerRadius(out_r); // Draw leaf arcs


          g.append('path')
            .attr('class', '_bar')
            .attr('d', _bar)
            .style('stroke', '#EEE')
            .style('fill', function(d) {
              return d3.rgb(arc1color).darker(0.5);
            });



          //add label;

          var rotate = 0,
            lbl_anchor = 'start',
            dy_init = 0;

          label = d.name;

          if (d.x > Math.PI) {
            rotate = d.x * 180 / Math.PI + 90;
            lbl_anchor = 'end';
            dy_init = -d.dx * 20 * Math.PI;
          } else {
            rotate = d.x * 180 / Math.PI - 90;
            lbl_anchor = 'start';
            dy_init = 5 + d.dx * 20 * Math.PI;
          }

          var max_label_size = 13,
            lable_size = 10;

          if ((7.5 + 15 * Math.PI * d.dx) > max_label_size) {
            lable_size = max_label_size;
          }

          label = label + ' (' + (percentage * 100).toFixed(0) + '%)';


          g.append('text')
            .attr('dy', dy_init)
            .attr('class', 'sector_leaf_text')
            .attr('font-size', lable_size)
            .attr('text-anchor', lbl_anchor)
            .attr('transform', 'translate(' + (out_r + 5) * Math.sin(d.x) + ',' + (-(out_r + 5) * Math.cos(d.x)) + ') ' + 'rotate(' + rotate + ')')
            .text(label);

        } else {
          //non-bar/non-leaf sector
          g.append('path')
            .attr('class', 'arc1')
            .attr('d', arc1)
            .style('stroke', strokecolor) // was: arc1color
            .style('fill', arc1color);


          g.append('path')
            .attr('class', 'arc2')
            .attr('d', arc2)
            .style('stroke', strokecolor) // was: arc1color
            .style('fill', arc1color)
            .style('fill-opacity', 0.15);

          //draw label:
          //path used for label
          g.append('path')
            .attr('class', 'arc_for_label')
            // NOTE HB: adding widget.id so we to avoid name clashing
            .attr('id', function(d) {
              return _this.id + '_' + d.id + '.arc_for_label';
            })
            .attr('d', arc_for_label)
            .style('stroke-opacity', 0)
            .style('fill-opacity', 0);


          //add label
          g.append('text')
            .attr('class', 'sector_label')
            .attr('visibility', function(d) {
              return d.depth === 1 ? 'visible' : null;
            })
            .attr('class', 'sector_nonleaf_text')
            .append('textPath')
            .attr('class', 'sector_label_path')
            .attr('position-in-sector', d.depth <= 1 ? 'center' : (bottom ? 'inner' : 'outer')) // Since both text lines share the same 'd', this class annotation tells where is the text, helping to determine the real arc length
            .attr('font-size', function(d) {
              return 30 / Math.sqrt(d.depth + 1);
            })
            // NOTE HB: Why do we need this xlink:href? In any case, adding widget.id so we to avoid name clashing
            .attr('xlink:href', function(d) {
              return '#' + _this.id + '_' + d.id + '.arc_for_label';
            })
            .text(label_name);

          //draw label number
          //path used for label number
          if (d.depth > 1) {
            g.append('path')
              .attr('class', 'arc_for_label_number')
              // NOTE HB: adding widget.id so we to avoid name clashing
              .attr('id', function(d) {
                return _this.id + '_' + d.id + '.arc_for_label_number';
              })
              .attr('d', arc_for_label_number)
              .style('stroke-opacity', 0)
              .style('fill-opacity', 0);


            //add label
            g.append('text')
              .attr('class', 'sector_label_number ')
              .attr('visibility', function(d) {
                return d.depth === 1 ? 'visible' : null;
              })
              //.attr('font-family','sans-serif')
              .attr('class', 'sector_nonleaf_text')
              //.attr('fill', d3.rgb(arc1color).darker(2))
              .append('textPath')
              .attr('class', 'sector_label_number_path')
              .attr('position-in-sector', bottom ? 'outer' : 'inner') // Since both text lines share the same 'd', this class annotation tells where is the text, helping to determine the real arc length
              .attr('font-size', function(d) {
                return 10;
              })
              // NOTE HB: Why do we need this xlink:href? In any case, adding widget.id so we to avoid name clashing
              .attr('xlink:href', function(d) {
                return '#' + _this.id + '_' + d.id + '.arc_for_label_number';
              })
              .text(label_percentage);
          }


        }
      });

    }

    return twoArcs;
  }

  function updateLabelLayout() {
    updateLabelLayoutWithClass('.sector_label_path');
    updateLabelLayoutWithClass('.sector_label_number_path');
  }

  function updateLabelLayoutWithClass(_class) {
    var max_font_size_base = 16;

    _this.d3vis.selectAll(_class).each(function(d) {
      var d3this = d3.select(this);
      var curNd = d3this.node();
      var text = d3this.text();
      if (text && text.length > 0) {
        var position = d3.select(this).attr('position-in-sector'); // 'inner' or 'outer'
        var frac = position === 'center' ? 0.5 : position === 'outer' ? 2 / 3 : 1 / 3;
        var sector_length = (d.y + d.dy * frac) * d.dx;
        var text_length = curNd.getComputedTextLength(); //+margin;
        var cur_font_size = d3.select(this).attr('font-size');
        var new_font_size = cur_font_size * sector_length / text_length;

        if (new_font_size > max_font_size_base / (0.4 * d.depth + 0.6)) {
          new_font_size = max_font_size_base / (0.4 * d.depth + 0.6);
        }

        d3.select(this).attr('font-size', new_font_size);
        //set new offset:
        d3.select(this).attr('startOffset', (sector_length - curNd.getComputedTextLength()) / 2);
      }
    });
  }

  var width = this.dimW,
    height = this.dimH;
  // The flower had a radius of 640 / 1.9 = 336.84 in the original.
  var radius = Math.min(width, height) / 3.2;
  var sector = twoArcsRender(radius);

  // Center the graph of 'g'
  var vis = this.d3vis.append('g')
    .attr('transform', 'translate(' + (width / 2) + ',' + height / 2 + ')')
    .append('g');
  this.vis = vis;

  var partition = d3.layout.partition()
    .sort(null)
    .size([2 * Math.PI, radius])
    .value(function(d) {
      if (!d.hasOwnProperty('size') && !d.hasOwnProperty('children')) return 1;
      return d.size;
    });

  var profile = tree;

  var g = vis.data([profile]).selectAll('g')
    .data(partition.nodes)
    .enter().append('g')
    .attr('class', 'sector')
    .attr('visibility', function(d) {
      return d.depth === 2 || d.forceVisible ? 'visible' : 'hidden';
    }) // hide non-first level rings
    .call(sector)
    .each(stash)
    .on('click', expandOrFoldSector)
    .on('mouseover', function(d) {
      _this.showTooltip(d, this);
    })
    .on('mouseout', function() {
      _this.showTooltip();
    });

  // Shift the text pieces clockwise (to somewhat center them).
  updateLabelLayout();
};