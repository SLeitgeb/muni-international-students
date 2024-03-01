/* eslint-disable space-before-function-paren */
/* global L topojson ZoomShowHide */
'use strict';

const states50mSource = 'data/50m.topojson';
const states10mSource = 'data/10m.topojson';

const studentsCountAttr = 'all';

const ZOOM_THRESHOLD = -12;
const MIN_SIZE = 5;
const TOOLTIP_OPTIONS = {
  direction: 'top',
  sticky: true
};
const STROKE_COLOR = '#FAFAFA';
const COUNTRIES_STROKE_WEIGHT = 0;

function getFeatureTooltip(feature) {
  const studentCount = feature.properties[studentsCountAttr];
  const stateName = feature.properties.NAME;
  return studentCount > 0
    ? `${stateName}<br>(${studentCount})`
    : stateName;
}

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
  maxZoom: -8,
  minZoom: -15,
  zoomSnap: 0.1,
  maxBounds: [
    [-10018754.17, -16395917.01],
    [10018754.17, 16395917.01]
  ],
  crs: L.CRS.Simple
}).setView([4443009, 0], -14);

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
    color: STROKE_COLOR,
    /* //old variant - no choropleth map
      fillColor: feature.properties[studentsCountAttr] > 0 ? '#00AF3F' : '#C6C6C6',
      color: feature.properties[studentsCountAttr] > 0 ? '#007D2C' : '#9E9E9E', */
    weight: COUNTRIES_STROKE_WEIGHT,
    fillOpacity: 1
  };
}

const boundaryStyle = {
  color: STROKE_COLOR,
  weight: 1.5
};

function loadTopoJSON(topology, layer, boundaryLayer) {
  const geojson = topojson.feature(topology, topology.objects.countries);
  layer.addData(geojson);
  addLayerInteraction(layer);
  const boundaries = topojson.mesh(topology, topology.objects.countries, (a, b) => a !== b);
  boundaryLayer.addData(boundaries);
  bringDeflatedLayersToFront();
}

function prepareZoomLayers(feature, layer) {
  if (!feature.properties.all) return;
  const bounds = layer.getBounds();
  const { collapseZoom, collapse } = getCollapseZoom(bounds);
  if (collapse) addDeflatedFeature(feature, bounds, collapseZoom);
}

function getCollapseZoom(bounds) {
  // inspired by L.Deflate plugin
  // https://github.com/oliverroick/Leaflet.Deflate/blob/master/src/L.Deflate.js
  for (let zoom = map.getMinZoom(); zoom <= map.getMaxZoom(); zoom++) {
    const northEastPixels = map.project(bounds.getNorthEast(), zoom);
    const southWestPixels = map.project(bounds.getSouthWest(), zoom);
    const width = Math.abs(northEastPixels.x - southWestPixels.x);
    const height = Math.abs(southWestPixels.y - northEastPixels.y);
    const collapse = height < MIN_SIZE && width < MIN_SIZE;
    if (!collapse) {
      return {
        collapseZoom: Math.max(zoom, map.getMinZoom()),
        collapse: zoom !== map.getMinZoom()
      };
    }
  }
}

function addDeflatedFeature(feature, bounds, zoom) {
  if (!(zoom in deflatedLayers)) {
    deflatedLayers[zoom] = L.featureGroup();
    deflatedLayers[zoom].max_zoom = zoom;
    statesLayer.addLayer(deflatedLayers[zoom]);
  }
  const northEast = bounds.getNorthEast();
  const southWest = bounds.getSouthWest();
  const lat = (northEast.lat + southWest.lat) / 2;
  const lng = (northEast.lng + southWest.lng) / 2;
  const strokeColor = '#666';
  const strokeWeight = 3;
  const featureMarker = L.circleMarker([lat, lng], {
    color: strokeColor,
    fill: true,
    fillColor: getColor(feature.properties[studentsCountAttr]),
    fillOpacity: 1,
    weight: strokeWeight
  }).bindTooltip(getFeatureTooltip(feature), TOOLTIP_OPTIONS);
  L.setOptions(featureMarker, {
    strokeColor,
    strokeWeight
  });
  deflatedLayers[zoom].addLayer(featureMarker);
}

function bringDeflatedLayersToFront() {
  for (const zoom in deflatedLayers) {
    deflatedLayers[zoom].bringToFront();
  }
}

const statesLayer = new ZoomShowHide().addTo(map);
const deflatedLayers = {};

const states50m = L.geoJSON(null, {
  style: stateStyle,
  onEachFeature: (feature, layer) => {
    prepareZoomLayers(feature, layer);
    L.setOptions(layer, {
      strokeColor: STROKE_COLOR,
      strokeWeight: COUNTRIES_STROKE_WEIGHT
    });
  }
}).bindTooltip(layer => getFeatureTooltip(layer.feature), TOOLTIP_OPTIONS);
statesLayer.addLayer(states50m);
const stateBoundaries50m = L.geoJSON(null, {
  style: boundaryStyle
});
statesLayer.addLayer(stateBoundaries50m);

const states10m = L.geoJSON(null, {
  style: stateStyle,
  onEachFeature: (_feature, layer) => {
    L.setOptions(layer, {
      strokeColor: STROKE_COLOR,
      strokeWeight: COUNTRIES_STROKE_WEIGHT
    });
  }
}).bindTooltip(layer => getFeatureTooltip(layer.feature), TOOLTIP_OPTIONS);
states10m.min_zoom = ZOOM_THRESHOLD;
statesLayer.addLayer(states10m);
const stateBoundaries10m = L.geoJSON(null, {
  style: boundaryStyle
});
stateBoundaries10m.min_zoom = ZOOM_THRESHOLD;
statesLayer.addLayer(stateBoundaries10m);

fetch(states50mSource)
  .then(response => response.json())
  .then(topology => {
    loadTopoJSON(topology, states50m, stateBoundaries50m);
    for (const zoom in deflatedLayers) {
      addLayerInteraction(deflatedLayers[zoom]);
    }
  });

function zoomHandler() {
  const currentZoom = map.getZoom();
  if (currentZoom < ZOOM_THRESHOLD - 1) return;
  map.off('zoomend', zoomHandler);
  fetch(states10mSource)
    .then(response => response.json())
    .then(topology => {
      loadTopoJSON(topology, states10m, stateBoundaries10m);
      states50m.max_zoom = ZOOM_THRESHOLD - 0.1;
      stateBoundaries50m.max_zoom = ZOOM_THRESHOLD - 0.1;
      statesLayer.filter();
    });
}

map.on('zoomend', zoomHandler);

// Add mouseover effect to display state name and student count
function addLayerInteraction(layer) {
  layer.eachLayer(sublayer => addSublayerInteraction(sublayer));
}

function addSublayerInteraction(sublayer) {
  sublayer.on('mouseover', function(e) {
    sublayer.openTooltip();
    // Highlight feature
    e.target.setStyle({
      weight: 3,
      color: '#004619'
    });
    e.target.bringToFront();
    bringDeflatedLayersToFront();
  });

  sublayer.on('mouseout', function(e) {
    sublayer.closeTooltip();
    e.target.setStyle({
      weight: e.target.options.strokeWeight,
      color: e.target.options.strokeColor
    });
    stateBoundaries50m.bringToFront();
    stateBoundaries10m.bringToFront();
    bringDeflatedLayersToFront();
  });

  sublayer.on('click', function(e) {
    map.fitBounds(e.target.getBounds());
  });
}
