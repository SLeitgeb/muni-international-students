var proxyurl = "";
var dataurl = "";

// Data files for different zoom levels
var lowZoomStates = '50m_units_students.geojson';
var highZoomStates = '10m_units_students.geojson';

var studentsCountAttr = "all";

function getColor(d) {
  return d > 100 ? '#004619':
          d > 30 ? '#006925':
          d > 10 ? '#008c32':
          d > 0  ? '#00af3f':
                   '#C6C6C6';
}

// Map init
var map = L.map('Map', {
  maxZoom: 8,
  minZoom: 2
}).setView([40, 0], 2);

map.attributionControl._attributions = {};
map.attributionControl.setPrefix();
map.zoomControl.setPosition('topleft');
L.control.scale({ imperial: false, maxwidth: 200 }).addTo(map);

//Legend
var legend = L.control({position: 'bottomright'});
legend.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info legend'),
        grades = [0, 10, 30, 100];
    div.innerHTML += '<h4>Number of students</h4>';
    // loop through our density intervals and generate a label with a colored square for each interval
    for (var i = 0; i < grades.length; i++) {
        div.innerHTML +=
            '<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
            (grades[i] + 1) + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
    }
    return div;
};

legend.addTo(map);

function fetchJSON(url) {
    return fetch(proxyurl + dataurl + url)
      .then(function (response) {
        return response.json();
      });
  };

var statesLayer = L.geoJSON(null, {
  style: function (feature) {
    // Set the style based on the number of students
    return {
      // choropleth map style
      fillColor: getColor(feature.properties[studentsCountAttr]),
      color: 'white',
      /*//old variant - no choropleth map
      fillColor: feature.properties[studentsCountAttr] > 0 ? '#00AF3F' : '#C6C6C6',
      color: feature.properties[studentsCountAttr] > 0 ? '#007D2C' : '#9E9E9E',*/
      weight: 0.8,
      fillOpacity: 0.9
    };
  }
}).addTo(map);

function loadStates() {
  var currentZoom = map.getZoom();
  // console.log(currentZoom);
  // Choose the appropriate GeoJSON file based on the current zoom level
  var statesFile = currentZoom < 6 ? lowZoomStates : highZoomStates;

  fetchJSON(statesFile)
    .then(data => {
      statesLayer.clearLayers();
      statesLayer.addData(data);
      // Add mouseover effect to display state name and student count
      statesLayer.eachLayer(layer => {
        layer.on('mouseover', function (e) {
          var stateName = e.target.feature.properties.NAME; 
          var studentCount = e.target.feature.properties[studentsCountAttr];
          var toolipOptions = {
            direction: 'center', 
            sticky: true,
            offset: L.point(-15,-15)
          }
          studentCount > 0 ?
            layer.bindTooltip(stateName + '<br>' + '(' + studentCount + ')', toolipOptions).openTooltip() :
            layer.bindTooltip(stateName, toolipOptions).openTooltip();
          // Highlight feature
          e.target.setStyle ({
            weight: 3, 
            color:'#004619'
          })
          e.target.bringToFront();
        });

        layer.on('mouseout', function (e) {
          layer.closeTooltip();
          // Reset feature style
          statesLayer.resetStyle(e.target)
        });

        layer.on('click', function (e) {
          map.fitBounds(e.target.getBounds());
        })
      });      
    });
}

map.on('zoomend', loadStates);

// Initial load of states based on default zoom level
loadStates();