var contactIconHtml = function(type) {
  switch(type) {
    case 'twitter':
      return '<i class="fa fa-fw fa-twitter" aria-hidden="true"></i>';
      break;
    case 'email':
      return '<i class="fa fa-fw fa-envelope" aria-hidden="true"></i>';
      break;
    case 'osm':
      return '<i class="fa fa-fw fa-user-circle" aria-hidden="true"></i>';
      break;
    case 'phone':
      return '<i class="fa fa-fw fa-phone" aria-hidden="true"></i>';
      break;
    default:
      return '<i class="fa fa-fw fa-address-card" aria-hidden="true"></i>';
  }
}

// get the contact data from the google spreadhsheet
var publicSpreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1qfg5ECN7IMYk8ftCzYL4tTZChYIDVXbFdhnXtwpRzqI/pub?gid=0&single=true&output=csv';
function init() {
  Tabletop.init( { key: publicSpreadsheetUrl,
                   callback: showInfo,
                   simpleSheet: true } )
}


function showInfo(data, tabletop) {
  validMarkers = [];
  allLanguages = [];
  // add a LatLng object and an ID to each item in the dataset
  data.forEach(function(d, i) {
    var coordinates = d.coordinates.replace(/\s/g,'').split('/');
    // TODO: improve the process for confirming a valid latLng
    if(coordinates.length == 2) {
      coordinates[0] = parseFloat(coordinates[0])
      coordinates[1] = parseFloat(coordinates[1])
      if(!isNaN(coordinates[0]) && !isNaN(coordinates[1])) {
        d.LatLng = new L.LatLng(parseFloat(coordinates[0]), parseFloat(coordinates[1]));
        d.id = i;
        d.languages = d.languages.replace(/\s/g,'').split(';');
        validMarkers.push(d)
        $.each(d.languages, function(i,lang){
          if($.inArray(lang, allLanguages) == -1) { allLanguages.push(lang); }
        });
      }
    }
  });

  allLanguages.sort();
  $.each(allLanguages, function(i, lang) {
    var html = '<option value="' + lang + '">' + languageLookup[lang] + '</option>';
    $('#language-filter').append(html);
  });



  map = L.map('map').setView([0, 0], 2);

  // L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
  //     attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
  // }).addTo(map);

  L.tileLayer('http://api.tiles.mapbox.com/v4/mapbox.light/{z}/{x}/{y}.png?access_token=pk.eyJ1Ijoic3RhdGVvZnNhdGVsbGl0ZSIsImEiOiJlZTM5ODI5NGYwZWM2MjRlZmEyNzEyMWRjZWJlY2FhZiJ9.omsA8QDSKggbxiJjumiA_w.', {
  	attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // initialize the SVG layer for D3 drawn markers
  L.svg().addTo(map);
  // pick up the SVG from the map object
  var svg = d3.select('#map').select('svg');
  markersGroup = svg.append('g').attr('id', 'markers').attr('class', 'leaflet-zoom-hide');

  // add markers to the map for each contact
  mappedContacts = d3.select('svg #markers').selectAll('text').data(validMarkers)
    .enter().append('text')
    .attr('class', 'mapmarker')
    .text('\uf276')
    .attr('font-family', 'FontAwesome')
    .attr('class', function(d) { return 'help_' + d.help_type; });

  // when map view changes adjust the locations of the svg circles
  updatemarker = function() {
    mappedContacts.attr('x',function(d) { return map.latLngToLayerPoint(d.LatLng).x; });
    mappedContacts.attr('y',function(d) { return map.latLngToLayerPoint(d.LatLng).y; });
  }
  // set the starting locations of the markers
  updatemarker();

  filter = function(){

    var filteredData = validMarkers;

    var bounds = map.getBounds();
    filteredData = filteredData.filter(function(d) {
      return bounds.contains(d.LatLng);
    });

    var language = $('#language-filter').find(':selected').val();
    if(language !== 'all') {
      filteredData = filteredData.filter(function(d) {
        return ($.inArray(language, d.languages) !== -1);
      });
    }
    toggleMarkerVis(language);
    drawCards(filteredData);
  }

  drawCards = function(list) {
    var contactCards = d3.select('#contact-cards').selectAll('div.column').data(list, function(d) { return d.id; });
    // no UPDATE
    // ENTER
    contactCards.enter().append('div')
        .attr('class', 'column')
        .html(function(d) {
            var lang = [];
            $.each(d.languages, function(i, item){ lang.push(languageLookup[item]); });
            var html = '<div class="card" data-equalizer-watch>' +
                  '<div class="card-section">' +
                    '<h5>' + d.name + '</h5>' +
                    '<p><small><span class="help_' + d.help_type + '">' + d.help_type + '</span><br>' +
                    contactIconHtml(d.primary_type) + ' ' + d.primary_contact  + '</br>' +
                    lang.join('; ') +
                    '</small></p>' +
                  '</div>' +
                '</div>';
            return html;
          })
    // EXIT
    contactCards.exit().remove();
  }

  toggleMarkerVis = function(language) {
    mappedContacts.each(function(d) {
      if( ($.inArray(language, d.languages) !== -1) || (language == 'all') ){
        d3.select(this).classed('no-language', false);
      } else {
        d3.select(this).classed('no-language', true);
      }
    });
  }


// when map view changes check what markers are visible in the extent
map.on('load moveend zoomend viewreset', filter);
// filter();

// when map view changes adjust the locations of the markers
map.on('zoom move viewreset', updatemarker);

$('#language-filter').change(function(){
  filter();
})

filter();


// d3.select('#contact-cards').property('data-equalizer', true).attr('data-equalize-by-row','true')
// new Foundation.Equalizer($('#contact-cards'));


}

// start things up
window.addEventListener('DOMContentLoaded', init)
