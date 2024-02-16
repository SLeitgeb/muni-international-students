/* eslint-disable space-before-function-paren */
/* global L ZoomShowHide */
'use strict';

const states50mSource = 'data/50m.topojson';
const states10mSource = 'data/10m.topojson';

const studentsCountAttr = 'all';

function getColor(d) {
  /* eslint multiline-ternary: off */
  /* eslint operator-linebreak: off */
  /* eslint indent: off */
  /* eslint no-multi-spaces: off */
  return d > 100 ? '#004619' :
         d > 30  ? '#006925' :
         d > 10  ? '#008c32' :
         d > 0   ? '#00af3f' :
                   '#C6C6C6';
}

// Map init
const map = L.map('Map', {
  maxZoom: 8,
  minZoom: 2
}).setView([40, 0], 2);

map.attributionControl._attributions = {};
map.attributionControl.setPrefix();
map.zoomControl.setPosition('topleft');
L.control.scale({ imperial: false, maxwidth: 200 }).addTo(map);

// Legend
const legend = L.control({ position: 'bottomright' });
legend.onAdd = function() {
  const div = L.DomUtil.create('div', 'info legend');
  const grades = [0, 10, 30, 100];
  div.innerHTML += '<h4>Number of students</h4>';
  // loop through our density intervals and generate a label with a colored square for each interval
  for (let i = 0; i < grades.length; i++) {
    div.innerHTML +=
      '<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
      (grades[i] + 1) + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
  }
  return div;
};
legend.addTo(map);

/*
fetch (states10mSource)
  .then(response => response.json())
  .then(function(json) {
      L.vectorGrid.slicer(json, {
        rendererFactory: L.canvas.tile,
        vectorTileLayerStyles: {
          sliced: function (properties, zoom) {
            return stateStyle(properties);
          }
        }
      }).addTo(map);
  });
*/
const statesLayer = new ZoomShowHide().addTo(map);

const ZOOM_THRESHOLD = 5;

let states50m;

//  statesLayer.addLayer(states50m);

let states10m;

//  states10m.min_zoom = ZOOM_THRESHOLD + 1;
//  tatesLayer.addLayer(states10m);

/*
function loadTopoToLayer(topology, layer) {
  const geojson = topojson.feature(topology, topology.objects.countries);
  layer.options.dataSource = geojson;
  addLayerInteraction(layer);
}
*/

fetch(states50mSource)
  .then(response => response.json())
  .then(function(json) {
      states50m = L.vectorGrid.slicer(json, {
        rendererFactory: L.canvas.tile,
        vectorTileLayerStyles: {
          countries: properties => stateStyle(properties[studentsCountAttr])
        }
      });
  })
  .then(() => {
    statesLayer.addLayer(states50m);
  });

function zoomHandler() {
  const currentZoom = map.getZoom();
  if (currentZoom < ZOOM_THRESHOLD) return;
  map.off('zoomend', zoomHandler);
  fetch(states10mSource)
    .then(response => response.json())
    .then(function(json) {
        states10m = L.vectorGrid.slicer(json, {
          rendererFactory: L.canvas.tile,
          vectorTileLayerStyles: {
            countries: properties => stateStyle(properties[studentsCountAttr])
          }
        });
    })
    .then(() => {
      states10m.min_zoom =  ZOOM_THRESHOLD + 1;
      statesLayer.addLayer(states10m);
      states50m.max_zoom = ZOOM_THRESHOLD;
      statesLayer.filter();
    });
}

map.on('zoomend', zoomHandler);

function stateStyle(d) {
  // Set the style based on the number of students
  return {
    // choropleth map style
    // fillColor: getColor(properties[studentsCountAttr]),
    fillColor: d > 100 ? '#004619' :
               d > 30  ? '#006925' :
               d > 10  ? '#008c32' :
               d > 0   ? '#00af3f' :
                         '#C6C6C6',
    color: 'white',
    /* //old variant - no choropleth map
      fillColor: feature.properties[studentsCountAttr] > 0 ? '#00AF3F' : '#C6C6C6',
      color: feature.properties[studentsCountAttr] > 0 ? '#007D2C' : '#9E9E9E', */
    weight: 0.8,
    fillOpacity: 0.9
  };
}

/* Add mouseover effect to display state name and student count
function addLayerInteraction(layer) {
  layer.eachLayer(sublayer => {
    sublayer.on('mouseover', function(e) {
      const stateName = e.target.feature.properties.NAME;
      const studentCount = e.target.feature.properties[studentsCountAttr];
      const toolipOptions = {
        direction: 'top',
        sticky: true
      };
      studentCount > 0
        ? sublayer.bindTooltip(stateName + '<br>' + '(' + studentCount + ')', toolipOptions).openTooltip()
        : sublayer.bindTooltip(stateName, toolipOptions).openTooltip();
      // Highlight feature
      e.target.setStyle({
        weight: 3,
        color: '#004619'
      });
      e.target.bringToFront();
    });

    sublayer.on('mouseout', function(e) {
      sublayer.closeTooltip();
      layer.resetStyle(e.target);
    });

    sublayer.on('click', function(e) {
      map.fitBounds(e.target.getBounds());
    });
  });
}
*/
