
/*
 *  StationMap - Object constructor function
 *  @param _parentElement   -- HTML element in which to draw the visualization
 *  @param _data            -- Array with all stations of the bike-sharing network
 */

StationMap = function (_parentElement, _data, _mapPosition) {

	this.parentElement = _parentElement;
	this.data = _data;
	this.mapPosition = _mapPosition;

	this.initVis();
}


/*
 *  Initialize station map
 */

StationMap.prototype.initVis = function () {
	var vis = this;
	// MOCK DATA: Hardcoded to bypass local CORS issues (mocking empty lines for now)
	var mockMBTALines = {
		"type": "FeatureCollection",
		"features": []
	};

	// Simulate async loading
	setTimeout(function () {
		vis.wrangleData(mockMBTALines);
	}, 100);

	// $.getJSON('data/mbta-lines.json', function(data) {
	//    // Work with data
	// 	 // console.log(data);
	// 	 vis.wrangleData(data);
	// });

}


/*
 *  Data wrangling
 */

StationMap.prototype.wrangleData = function (data) {
	var vis = this;
	// console.log(vis.data);
	// Currently no data wrangling/filtering needed
	// vis.displayData = vis.data;
	this.subwayData = data;
	// Update the visualization
	vis.updateVis();

}


/*
 *  The drawing function
 */

StationMap.prototype.updateVis = function () {
	// // If the images are in the directory "/img":
	// L.Icon.Default.imagePath = 'img';
	var mymap = L.map(this.parentElement).setView(this.mapPosition, 13);
	// 	L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
	//     attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
	//     maxZoom: 18,
	//     id: 'mapbox.streets',
	//     accessToken: 'your.mapbox.access.token'
	// }).addTo(mymap);

	// L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
	//  attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
	// }).addTo(mymap);

	//bonus 2
	L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>'
	}).addTo(mymap);

	// var marker = L.marker([40.713008, -74.013169]).addTo(mymap);

	// var popupContent = "<strong>One World Trade Center</strong><br/>";
	// popupContent += "New York City";
	//
	// // Create a marker and bind a popup with a particular HTML content
	// var marker = L.marker([40.713008, -74.013169])
	//    .bindPopup(popupContent)
	//    .addTo(mymap);

	// Add empty layer groups for the markers / map objects
	nySights = L.layerGroup().addTo(mymap);
	stations = L.layerGroup().addTo(mymap);

	// Create marker
	// var centralPark = L.marker([40.771133,-73.974187]).bindPopup("Central Park");
	var harvard = L.marker([42.378774, -71.117303]).bindPopup("Harvard University");// Add marker to layer group
	// nySights.addLayer(centralPark);
	nySights.addLayer(harvard);

	//add opacity circle with radius of 500 meter

	// var circle = L.circle([40.762188, -73.971606], 500, {
	//    color: 'red',
	//    fillColor: '#ddd',
	//    fillOpacity: 0.5
	// }).addTo(mymap);

	//add subway lines
	L.geoJson(this.subwayData, {
		style: function (feature) {
			return { color: feature.properties.LINE, weight: 10, opacity: 0.7 }
		}
	}).addTo(mymap);
	// console.log(this.subwayData);

	var data = this.subwayData;
	var subwayLines = L.geoJson(
		// data, {
		// color: styleBorough,
		// // weight:,
		// // opacity:
		// }
		// // onEachFeature: onEachBorough
	).addTo(mymap);
	subwayLines.addData(data);

	// does not work
	function styleBorough(feature) {
		// console.log(feature);
		return feature.LINE;
	}

	//bonus
	// Defining an icon class with general options
	var LeafIcon = L.Icon.extend({
		options: {
			shadowUrl: 'css/images/marker-shadow.png',
			iconSize: [25, 41],
			iconAnchor: [12, 41],
			popupAnchor: [0, -28]
		}
	});

	var redMarker = new LeafIcon({ iconUrl: 'css/images/marker-red.png' });
	var blueMarker = new LeafIcon({ iconUrl: 'css/images/marker-blue.png' });

	// add every station marker
	console.log(this.data);
	this.data.forEach(function (d) {
		var lat = parseFloat(d.lat);
		var long = parseFloat(d.long);
		var nbBikes = parseInt(d.nbBikes);
		var nbEmptyDocks = parseInt(d.nbEmptyDocks);
		var pop = "<strong>" + d.name + "</strong><br/> Number of Bikes: " + d.nbBikes + "<br/> Number of Empty: " + d.nbEmptyDocks;

		if (nbBikes == 0 || nbEmptyDocks == 0) {
			var station = L.marker([lat, long], { icon: redMarker }).bindPopup(pop);
		} else {
			var station = L.marker([lat, long], { icon: blueMarker }).bindPopup(pop);
		}
		stations.addLayer(station);
	});


	// var marker = L.marker([40.762188, -73.971606], { icon: redMarker }).addTo(map);

}
