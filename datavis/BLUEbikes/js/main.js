
var allData = [];

// Variable for the visualization instance
var stationMap;

// Start application by loading the data
loadData();


function loadData() {

	// Proxy url
	var proxy = 'http://michaeloppermann.com/proxy.php?format=xml&url=';

  // Hubway XML station feed
  var url = 'https://member.bluebikes.com/data/stations/bikeStations.xml';

  // TO-DO: LOAD DATA
	$.getJSON(proxy+url, function(jsonData){
	   // Work with data
		 // console.log(jsonData.station);
		 var stations = jsonData.station;
		 $('#station-count').html(stations.length);
		 createVis(stations);
	});


}

function createVis(data) {

  // TO-DO: INSTANTIATE VISUALIZATION
		var parentEle = $();
	  var stationMap = new StationMap('station-map',data,[42.3601, -71.0589]);

}
