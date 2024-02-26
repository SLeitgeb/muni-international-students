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

const statesLayer = new ZoomShowHide().addTo(map);

const ZOOM_THRESHOLD = 5;

let states50m;

let states10m;

/*
function loadTopoToLayer(topology, layer) {
  const geojson = topojson.feature(topology, topology.objects.countries);
  layer.options.dataSource = geojson;
  addLayerInteraction(layer);
}
*/

fetch(states50mSource)
  .then(response => response.json())
  .then(function(topojson) {
    states50m = L.vectorGrid.slicer(topojson, {
      rendererFactory: L.svg.tile,
      vectorTileLayerStyles: {
        countries: stateStyle
      },
      interactive: true,
      getFeatureId: f => f.properties.ID
    })
      .on('mouseover', e => showTooltip(e, states50m))
      .on('mouseout', () => {
        states50m.closeTooltip();
        clearHighlight(states50m);
      });
    statesLayer.addLayer(states50m);
  });

function zoomHandler() {
  const currentZoom = map.getZoom();
  if (currentZoom < ZOOM_THRESHOLD) return;
  map.off('zoomend', zoomHandler);
  fetch(states10mSource)
    .then(response => response.json())
    .then(function(topojson) {
      states10m = L.vectorGrid.slicer(topojson, {
        rendererFactory: L.svg.tile,
        vectorTileLayerStyles: {
          countries: stateStyle
        },
        interactive: true,
        getFeatureId: f => f.properties.ID
      })
        .on('mouseover', e => showTooltip(e, states10m))
        .on('mouseout', () => {
          states10m.closeTooltip();
          clearHighlight(states10m);
        });
      states10m.min_zoom = ZOOM_THRESHOLD + 1;
      statesLayer.addLayer(states10m);
      states50m.max_zoom = ZOOM_THRESHOLD;
      statesLayer.filter();
    });
}

map.on('zoomend', zoomHandler);

function stateStyle(properties) {
  // Set the style based on the number of students
  const d = properties[studentsCountAttr];
  return {
    // choropleth map style
    // fillColor: getColor(properties[studentsCountAttr]),
    fill: true,
    fillColor: getColor(d),
    fillOpacity: 0.9,
    color: 'white',
    /* //old variant - no choropleth map
      fillColor: properties[studentsCountAttr] > 0 ? '#00AF3F' : '#C6C6C6',
      color: properties[studentsCountAttr] > 0 ? '#007D2C' : '#9E9E9E', */
    weight: 2
  };
}

function highlightStateStyle(properties) {
  // Set the style based on the number of students
  const d = properties[studentsCountAttr];
  return {
    // choropleth map style
    // fillColor: getColor(properties[studentsCountAttr]),
    fill: true,
    fillColor: getColor(d),
    fillOpacity: 0.9,
    stroke: true,
    opacity: 1,
    color: '#004619',
    /* //old variant - no choropleth map
      fillColor: properties[studentsCountAttr] > 0 ? '#00AF3F' : '#C6C6C6',
      color: properties[studentsCountAttr] > 0 ? '#007D2C' : '#9E9E9E', */
    weight: 3
  };
}

function showTooltip(e, statesXm) {
  const stateName = e.layer.properties.NAME;
  const studentCount = e.layer.properties[studentsCountAttr];
  const tooltipOptions = {
    direction: 'top',
    sticky: true
  };
  const tooltipContent = studentCount > 0
    ? stateName + '<br>' + '(' + studentCount + ')'
    : stateName;
  statesXm.bindTooltip(tooltipContent, tooltipOptions).openTooltip(e.latlng);
  clearHighlight(statesXm);
  highlightedFeature = e.layer.properties.ID;
  // Highlight feature
  statesXm.setFeatureStyle(e.layer.properties.ID, highlightStateStyle(e.layer.properties));

  for (const tileKey in statesXm._vectorTiles) {
    const tile = statesXm._vectorTiles[tileKey];
    const features = tile._features[e.layer.properties.ID];
    if (features) features.feature.bringToFront();
  }
}

let highlightedFeature;
function clearHighlight(statesXm) {
  if (highlightedFeature) {
    statesXm.resetFeatureStyle(highlightedFeature);
  }
  highlightedFeature = null;
}
