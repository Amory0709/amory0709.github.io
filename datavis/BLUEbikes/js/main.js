
var allData = [];

// Variable for the visualization instance
var stationMap;

// Start application by loading the data
loadData();


function loadData() {

	// Proxy url
	var proxy = 'https://michaeloppermann.com/proxy.php?format=xml&url=';

	// Hubway XML station feed
	var url = 'https://member.bluebikes.com/data/stations/bikeStations.xml';

	// TO-DO: LOAD DATA

	// MOCK DATA: Hardcoded because the external proxy is down
	var mockStations = [
		{ id: "1", name: "Harvard University / SEAS / Cruft-Pierce Halls", lat: "42.377945", long: "-71.116865", nbBikes: "10", nbEmptyDocks: "5" },
		{ id: "2", name: "MIT at Mass Ave / Amherst St", lat: "42.3581", long: "-71.093198", nbBikes: "15", nbEmptyDocks: "8" },
		{ id: "3", name: "South Station - 700 Atlantic Ave", lat: "42.352175", long: "-71.055547", nbBikes: "20", nbEmptyDocks: "25" },
		{ id: "4", name: "Boston Public Library - 700 Boylston St", lat: "42.349673", long: "-71.077303", nbBikes: "5", nbEmptyDocks: "12" },
		{ id: "5", name: "Kenmore Square", lat: "42.348706", long: "-71.097009", nbBikes: "8", nbEmptyDocks: "10" },
		{ id: "6", name: "Christian Science Plaza", lat: "42.343864", long: "-71.085918", nbBikes: "12", nbEmptyDocks: "7" },
		{ id: "7", name: "TD Garden - West End Park", lat: "42.365003", long: "-71.063348", nbBikes: "25", nbEmptyDocks: "5" }
	];

	// Simulate async data load
	setTimeout(function () {
		$('#station-count').html(mockStations.length);
		createVis(mockStations);
	}, 500);

	// $.getJSON(proxy+url, function(jsonData){
	//    // Work with data
	// 	 // console.log(jsonData.station);
	// 	 var stations = jsonData.station;
	// 	 $('#station-count').html(stations.length);
	// 	 createVis(stations);
	// });


}

function createVis(data) {

	// TO-DO: INSTANTIATE VISUALIZATION
	var parentEle = $();
	var stationMap = new StationMap('station-map', data, [42.3601, -71.0589]);

}
