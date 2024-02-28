/* eslint-disable space-before-function-paren */
/* global L topojson ZoomShowHide */
'use strict';

const states50mSource = 'data/50m.topojson';
const states10mSource = 'data/10m.topojson';

const studentsCountAttr = 'all';

function getColor(d) {
  /* eslint multiline-ternary: off */
  /* eslint operator-linebreak: off */
  /* eslint indent: off */
  /* eslint no-multi-spaces: off */
  return d > 100 ? '#19582F' :
         d >  30 ? '#19773A' :
         d >  10 ? '#199746' :
         d >   0 ? '#19B651' :
                   '#D9D9D9';
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
  const n = 0;
  const color = getColor(n);
  div.innerHTML +=
    `<i style="background: ${color}"></i> ${n}<br>`;
  for (let i = 0; i < grades.length; i++) {
    const color = getColor(grades[i] + 1);
    const legendItem = (grades[i] + 1) + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
    div.innerHTML +=
      `<i style="background: ${color}"></i> ${legendItem}`;
  }
  return div;
};
legend.addTo(map);

function stateStyle(feature) {
  // Set the style based on the number of students
  return {
    // choropleth map style
    fillColor: getColor(feature.properties[studentsCountAttr]),
    color: '#FAFAFA',
    /* //old variant - no choropleth map
      fillColor: feature.properties[studentsCountAttr] > 0 ? '#00AF3F' : '#C6C6C6',
      color: feature.properties[studentsCountAttr] > 0 ? '#007D2C' : '#9E9E9E', */
    weight: 0,
    fillOpacity: 1
  };
}

const boundaryStyle = {
  color: '#FAFAFA',
  weight: 1.5
};

function loadTopoJSON(topology, layer, boundaryLayer) {
  const geojson = topojson.feature(topology, topology.objects.countries);
  layer.addData(geojson);
  addLayerInteraction(layer);
  const boundaries = topojson.mesh(topology, topology.objects.countries, (a, b) => a !== b);
  boundaryLayer.addData(boundaries);
}

const statesLayer = new ZoomShowHide().addTo(map);

const ZOOM_THRESHOLD = 5;

const states50m = L.geoJSON(null, {
  style: stateStyle
});
statesLayer.addLayer(states50m);
const stateBoundaries50m = L.geoJSON(null, {
  style: boundaryStyle
});
statesLayer.addLayer(stateBoundaries50m);

const states10m = L.geoJSON(null, {
  style: stateStyle
});
states10m.min_zoom = ZOOM_THRESHOLD + 1;
statesLayer.addLayer(states10m);
const stateBoundaries10m = L.geoJSON(null, {
  style: boundaryStyle
});
stateBoundaries10m.min_zoom = ZOOM_THRESHOLD + 1;
statesLayer.addLayer(stateBoundaries10m);


fetch(states50mSource)
  .then(response => response.json())
  .then(topology => loadTopoJSON(topology, states50m, stateBoundaries50m));

function zoomHandler() {
  const currentZoom = map.getZoom();
  if (currentZoom < ZOOM_THRESHOLD) return;
  map.off('zoomend', zoomHandler);
  fetch(states10mSource)
    .then(response => response.json())
    .then(topology => {
      loadTopoJSON(topology, states10m, stateBoundaries10m);
      states50m.max_zoom = ZOOM_THRESHOLD;
      stateBoundaries50m.max_zoom = ZOOM_THRESHOLD;
      statesLayer.filter();
    });
}

map.on('zoomend', zoomHandler);

// Add mouseover effect to display state name and student count
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
      stateBoundaries50m.bringToFront();
      stateBoundaries10m.bringToFront();
    });

    sublayer.on('click', function(e) {
      map.fitBounds(e.target.getBounds());
    });
  });
}
