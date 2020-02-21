/**
 * Constructor for the TileChart
 */
function TileChart(){

    var self = this;
    self.init();
};

/**
 * Initializes the svg elements required to lay the tiles
 * and to populate the legend.
 */
TileChart.prototype.init = function(){
    var self = this;

    //Gets access to the div element created for this chart and legend element from HTML
    var divTileChart = d3.select("#tiles").classed("content", true);
    var legend = d3.select("#legend").classed("content",true);
    self.margin = {top: 30, right: 20, bottom: 30, left: 50};

    var svgBounds = divTileChart.node().getBoundingClientRect();
    self.svgWidth = svgBounds.width - self.margin.left - self.margin.right;
    self.svgHeight = self.svgWidth/2;
    var legendHeight = 150;

    //creates svg elements within the div
    self.legendSvg = legend.append("svg")
        .attr("width",self.svgWidth)
        .attr("height",legendHeight)
        .attr("transform", "translate(" + self.margin.left + ",0)")

    self.svg = divTileChart.append("svg")
                        .attr("width",self.svgWidth)
                        .attr("height",self.svgHeight)
                        .attr("transform", "translate(" + self.margin.left + ",0)")
                        .style("bgcolor","green")
    var states = [
      "AK"," "," "," "," "," "," "," "," "," "," ","ME",
      " "," "," "," "," "," "," "," "," "," ","VT","NH",
      " ","WA","ID","MT","ND","MN","IL","WI","MI","NY","RI","MA",
      " ","OR","NV","WY","SD","IA","IN","OH","PA","NJ","CT"," ",
      " ","CA","UT","CO","NE","MO","KY","WV","VA","MD","DC"," ",
      " "," ","AZ","NM","KS","AR","TN","NC","SC","DE"," "," ",
      " "," "," "," ","OK","LA","MS","AL","GA"," "," "," ",
      " ","HI"," "," ","TX"," "," "," "," ","FL"," "," "
    ]
    var x = d3.scaleBand()
    .domain(d3.range(12))
    .range([0, self.svgWidth])
    .round(true);

    var y = d3.scaleBand()
    .domain(d3.range(8))
    .range([0, self.svgHeight])
    .round(true);

    // console.log("height:"+y(1));
    // console.log("width: "+x(1));
    self.rects = self.svg.append("g").attr("class","tile")
    self.rects .selectAll("rect")
                     .data(states)
                     .enter()
                     .append("rect")
                     .attr("x",function(d,i){
                       return x(i%12);
                     })
                     .attr("y",function(d,i){
                       // console.log(Math.floor(i/12));
                       return y(Math.floor(i/12));
                     })
                     .attr("height",y(1))
                     .attr("width",x(1))
                     .attr("id",function(d){
                       return d;
                     })
                     .style("stroke","white")
                     .style("fill","white")

  self.textGroup = self.svg.append("g").attr("id","stateName")
  self.EVGroup = self.svg.append("g").attr("id","EV")
  self.textGroup.selectAll("text")
                .data(states)
                .enter()
                .append("text")
                // .attr("class","hidden")
                // .attr("class","tilestext")
                .attr("id",function(d){
                  return d+"textAbbr";
                })
                .attr("x",function(d,i){
                  return x(i%12)+x(1)/2;
                })
                .attr("y",function(d,i){
                  // console.log(Math.floor(i/12));
                  return y(Math.floor(i/12))+y(1)/2;
                })
                .text(function(d){
                  return d;
                })
                .attr("fill","white")

 self.EVGroup.selectAll("text")
              .data(states)
              .enter()
              .append("text")
              // .attr("class","hidden")
              // .attr("class","tilestext")
              .attr("id",function(d){
                  return d+"textEV";
               })
              .attr("x",function(d,i){
                  return x(i%12)+x(1)/2;
              })
              .attr("y",function(d,i){
                  // console.log(Math.floor(i/12));
                return y(Math.floor(i/12))+y(1)/2+18;
               })
              .attr("fill","white")

};

/**
 * Returns the class that needs to be assigned to an element.
 *
 * @param party an ID for the party that is being referred to.
 */
TileChart.prototype.chooseClass = function (party) {
    var self = this;
    if (party == "R"){
        return "republican";
    }
    else if (party== "D"){
        return "democrat";
    }
    else if (party == "I"){
        return "independent";
    }
}

/**
 * Renders the HTML content for tool tip.
 *
 * @param tooltip_data information that needs to be populated in the tool tip
 * @return text HTML content for tool tip
 */
TileChart.prototype.tooltip_render = function (tooltip_data) {
    var self = this;
    var text = "<h2 class ="  + self.chooseClass(tooltip_data.winner) + " >" + tooltip_data.state + "</h2>";
    text +=  "Electoral Votes: " + tooltip_data.electoralVotes;
    text += "<ul>"
    tooltip_data.result.forEach(function(row){
        text += "<li class = " + self.chooseClass(row.party)+ ">" + row.nominee+":\t\t"+row.votecount+"("+row.percentage+"%)" + "</li>"
    });
    text += "</ul>";
    return text;
}

/**
 * Creates tiles and tool tip for each state, legend for encoding the color scale information.
 *
 * @param electionResult election data for the year selected
 * @param colorScale global quantile scale based on the winning margin between republicans and democrats
 */
TileChart.prototype.update = function(electionResult, colorScale){
    var self = this;
    // console.log(electionResult);
    // self.svg.select("rect").select("#AK").attr("fill","white")
    self.rects.selectAll("rect").attr("class","hidden").style("fill","white")
    self.textGroup.selectAll("text").attr("class","hidden")
    self.EVGroup.selectAll("text").attr("class","hidden")

    //Calculates the maximum number of columns to be laid out on the svg
    self.maxColumns = d3.max(electionResult,function(d){
                                return parseInt(d["Space"]);
                            });
    // console.log(self.maxColumns);
    //Calculates the maximum number of rows to be laid out on the svg
    self.maxRows = d3.max(electionResult,function(d){
                                return parseInt(d["Row"]);
                        });
    // console.log(self.maxRows);


    //for reference:https://github.com/Caged/d3-tip
    //Use this tool tip element to handle any hover over the chart
    tip = d3.tip().attr('class', 'd3-tip')
        .direction('se')
        .offset(function() {
            return [0,0];
        })
        .html(function(d) {
            /* populate data in the following format
             * tooltip_data = {
             * "state": State,
             * "winner":d.State_Winner
             * "electoralVotes" : Total_EV
             * "result":[
             * {"nominee": D_Nominee_prop,"votecount": D_Votes,"percentage": D_Percentage,"party":"D"} ,
             * {"nominee": R_Nominee_prop,"votecount": R_Votes,"percentage": R_Percentage,"party":"R"} ,
             * {"nominee": I_Nominee_prop,"votecount": I_Votes,"percentage": I_Percentage,"party":"I"}
             * ]
             * }
             * pass this as an argument to the tooltip_render function then,
             * return the HTML content returned from that method.
             * */
            return self.tooltip_render(d.result);
        })
        ;

    this.svg.call(tip);
    //Creates a legend element and assigns a scale that needs to be visualized
    self.legendSvg.append("g")
        .attr("class", "legendQuantile");

    var legendQuantile = d3.legendColor()
        // .domain([0,self.SvgWidth])
        .shapeWidth((self.svgWidth-20)/12)
        .cells(12)
        .orient('horizontal')
        .scale(colorScale);


    // ******* TODO: PART IV *******
    //Tansform the legend element to appear in the center and make a call to this element for it to display.
    d3.select(".legendQuantile").call(legendQuantile).style("font-size","10px");
    //Lay rectangles corresponding to each state according to the 'row' and 'column' information in the data.

    // process data
    var allData = {};
    var toolData = {};
    var result = [
     {"nominee": electionResult[0].D_Nominee,"votecount": 0,"percentage": 0,"party":"D"} ,
     {"nominee": electionResult[0].R_Nominee,"votecount": 0,"percentage": 0,"party":"R"} ,
     {"nominee": electionResult[0].I_Nominee,"votecount": 0,"percentage": 0,"party":"I"}
   ];
    for(var i = 0; i < electionResult.length;++i){
      toolData.state = electionResult[i].State;
      if (electionResult[i].RDmargin > 0){
        toolData.winner = electionResult[i].R_Nominee;
      }else if (electionResult[i].RDmargin < 0){
        toolData.winner = electionResult[i].D_Nominee;
      }
      toolData.electoralVotes = electionResult[i].Total_EV;
      result[0].votecount = parseInt(electionResult[i].D_Votes);
      result[1].votecount = parseInt(electionResult[i].R_Votes);
      result[2].votecount = parseInt(electionResult[i].I_Votes);
      result[0].percentage = parseFloat(electionResult[i].D_Percentage);
      result[1].percentage = parseFloat(electionResult[i].R_Percentage);
      result[2].percentage = parseFloat(electionResult[i].I_Percentage);
      toolData.result = result;
      allData[i] = toolData;
      electionResult[i].result = toolData;
      toolData = {};
    }

    // function mouseover(data){
    //
    // }
    // console.log(allData);
    // show abbreviation

    for(var i = 0; i < electionResult.length; ++i){
      // tile color
      if(electionResult[i].IDmargin > 0 && electionResult[i].IRmargin > 0){
          d3.select("#"+electionResult[i].Abbreviation+"")
          .datum(electionResult[i])
          .attr("class","tile")
          .style("fill","#45AD6A")
          .on("mouseover",tip.show)
          .on("mouseout", tip.hide);
      }else{
          d3.select("#"+electionResult[i].Abbreviation+"")
          .datum(electionResult[i])
          .attr("class","tile")
          .style("fill",function(d){return colorScale(d.RDmargin)})
          .on("mouseover",tip.show)
          .on("mouseout", tip.hide);

      }
      //show Total_EV
      d3.select("#"+electionResult[i].Abbreviation+"textEV").attr("class","tilestext").text(electionResult[i].Total_EV);
      // show states
      d3.select("#"+electionResult[i].Abbreviation+"textAbbr").attr("class","tilestext")
    }



    //Display the state abbreviation and number of electoral votes on each of these rectangles

    //Use global color scale to color code the tiles.

    //HINT: Use .tile class to style your tiles;
    // .tilestext to style the text corresponding to tiles

    //Call the tool tip on hover over the tiles to display stateName, count of electoral votes
    //then, vote percentage and number of votes won by each party.
    //HINT: Use the .republican, .democrat and .independent classes to style your elements.
};//bracket for update
