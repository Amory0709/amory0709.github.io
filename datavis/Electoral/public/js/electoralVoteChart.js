
/**
 * Constructor for the ElectoralVoteChart
 *
 * @param brushSelection an instance of the BrushSelection class
 */
function ElectoralVoteChart(brushSelection){

    var self = this;
    self.brushSelection = brushSelection;
    self.stateStack = [];
    self.accumEV = 0;
    self.init();

};

/**
 * Initializes the svg elements required for this chart
 */
ElectoralVoteChart.prototype.init = function(){
    var self = this;
    self.margin = {top: 30, right: 20, bottom: 30, left: 50};

    //Gets access to the div element created for this chart from HTML
    var divelectoralVotes = d3.select("#electoral-vote").classed("content", true);
    self.svgBounds = divelectoralVotes.node().getBoundingClientRect();
    self.svgWidth = self.svgBounds.width - self.margin.left - self.margin.right;
    self.svgHeight = 150;

    //creates svg element within the div
    self.svg = divelectoralVotes.append("svg")
        .attr("width",self.svgWidth)
        .attr("height",self.svgHeight)
    // create group for independent
    self.iGroup = self.svg.append("g").attr("id","iBar")

    // create group for D
    self.dRGroup = self.svg.append("g").attr("id","dBar")
    // .attr("class","electoralVotes");
    // create group for R
    // self.rGroup = self.svg.append("g").attr("id","rBar").attr("class","electoralVotes");
    self.xScale = d3.scaleLinear()
                    .range([0,this.svgWidth]);
    self.iText = self.iGroup.append("text") .attr("class","independent electoralVoteText");
    self.dText =  self.dRGroup.append("text").attr("class","democrat electoralVoteText");
    self.rText = self.dRGroup.append("text").attr("class","republican electoralVoteText");
    self.Middle = self.svg.append("g").attr("class","middlePoint");
    self.MiddleLine = self.Middle.append("rect");
    self.MiddleText = self.Middle.append("text");
    // self.brushArea = self.svg.append("g").attr("class","brush");
    // self.brush = d3.brushX().extent([[0, self.svgHeight/2 - 15],[self.svgWidth, self.svgHeight/2+45]]);


};

/**
 * Returns the class that needs to be assigned to an element.
 *
 * @param party an ID for the party that is being referred to.
 */
ElectoralVoteChart.prototype.chooseClass = function (party) {
    var self = this;
    if (party == "R"){
        return "republican";
    }
    else if (party == "D"){
        return "democrat";
    }
    else if (party == "I"){
        return "independent";
    }
}

/**
 * Creates the stacked bar chart, text content and tool tips for electoral vote chart
 *
 * @param electionResult election data for the year selected
 * @param colorScale global quantile scale based on the winning margin between republicans and democrats
 */

ElectoralVoteChart.prototype.update = function(electionResult, colorScale){
    var self = this;
    // console.log(electionResult);

    // ******* TODO: PART II *******
    //Group the states based on the winning party for the state;
    //then sort them based on the margin of victory

    //calculate margin
    for (var i = 0; i < electionResult.length; ++i){
      electionResult[i].RDmargin = electionResult[i].R_Percentage - electionResult[i].D_Percentage;
      electionResult[i].IDmargin = electionResult[i].I_Percentage - electionResult[i].D_Percentage;
      electionResult[i].IRmargin = electionResult[i].I_Percentage - electionResult[i].R_Percentage;
    }
    // filter out when indep Win!
    var indepWin = electionResult.filter(function(data){
      return (data.IDmargin > 0 && data.IRmargin > 0);
    });
    // console.log(indepWin);

    // filter when D or R win
    var dOrRWin = electionResult.filter(function(data){
      return (data.IDmargin < 0 || data.IRmargin < 0);
    });
    // console.log(dOrRWin);

    // sort from smallest to large
    var dOrRWinsorted = dOrRWin.sort(function(a,b){
      return a.RDmargin - b.RDmargin;
    });
    // console.log(dOrRWinsorted);

    //calculate accumulate
    var accumEV = 0;
    var accumEVI = 0;
    var accumEVD = 0;
    var accumEVR = 0;

    for (var i = 0; i < indepWin.length;++i){
      self.stateStack.push([indepWin[i].State,accumEV,accumEV+parseInt(indepWin[i].Total_EV)]);
      indepWin[i].AccumEV = accumEV;
      accumEV += parseInt(indepWin[i].Total_EV);
      accumEVI += parseInt(indepWin[i].Total_EV);

    }
    for(var i = 0; i < dOrRWinsorted.length; ++i){
      self.stateStack.push([dOrRWinsorted[i].State, accumEV, accumEV + parseInt(dOrRWinsorted[i].Total_EV)]);
      dOrRWinsorted[i].AccumEV = accumEV;
      accumEV += parseInt(dOrRWinsorted[i].Total_EV);
      if(dOrRWinsorted[i].RDmargin < 0){
        accumEVD += parseInt(dOrRWinsorted[i].Total_EV);
      }
      else if(dOrRWinsorted[i].RDmargin > 0){
        accumEVR += parseInt(dOrRWinsorted[i].Total_EV);
      }
    }
    //Create the stacked bar chart.
    //Use the global color scale to color code the rectangles.
    //HINT: Use .electoralVotes class to style your bars.
    self.xScale.domain([0,accumEV]);
    self.accumEV = accumEV;


    // fill the I group
    self.iGroup.selectAll("rect")
               .data(indepWin,function(d){
               })
               .enter()
               .append("rect")
               .attr("class","independent electoralVotes");

    self.iGroup.selectAll("rect")
               .data(indepWin)
               .transition()
               .attr("x",function(d){
                 return self.xScale(d.AccumEV);
               })
               .attr("y",self.svgHeight/2)
               .attr("width",function(d){
                 return self.xScale(d.Total_EV);
               })
               .attr("height",30)
               ;

    self.iGroup.selectAll("rect").data(indepWin).exit().remove();

    // fill the DR group
    self.dRGroup.selectAll("rect")
               .data(dOrRWinsorted)
               .enter()
               .append("rect")
               .attr("class",function(d){
                 return self.chooseClass(d.PARTY)+" electoralVotes";
               });

    self.dRGroup.selectAll("rect")
               .data(dOrRWinsorted)

               .transition()
               .attr("x",function(d){
                 return self.xScale(d.AccumEV);
               })
               .attr("y",self.svgHeight/2)
               .attr("width",function(d){
                 return self.xScale(d.Total_EV);
               })
               .attr("height",30)
               .attr("fill",function(d){
                 return colorScale(d.RDmargin)
               });
   self.dRGroup.selectAll("rect").data(dOrRWinsorted).exit().remove();

    //Display total count of electoral votes won by the Democrat and Republican party
    //on top of the corresponding groups of bars.
    //HINT: Use the .electoralVoteText class to style your text elements;  Use this in combination with
    // chooseClass to get a color based on the party wherever necessary
     self.iText.attr("x",self.xScale(0))
     .attr("y",(self.svgHeight/2-10))
     .attr("class","independent electoralVoteText")
     .text(function(d){
       if(accumEVI==0){
         return "";
       }else{
         return accumEVI;
       }
     });
    self.dText.attr("x",self.xScale(dOrRWinsorted[0].AccumEV))
    .attr("y",(self.svgHeight/2-10))
    .attr("class","democrat electoralVoteText")
    .text(accumEVD);

     self.rText.attr("x",self.svgWidth)
     .attr("y",(self.svgHeight/2-10))
     .attr("class","republican electoralVoteText")
     .text(accumEVR);
    //Display a bar with minimal width in the center of the bar chart to indicate the 50% mark
    //HINT: Use .middlePoint class to style this bar.
    self.MiddleLine
    .attr("class","middlePoint")
    .attr("x",self.svgWidth/2)
    .attr("y",(self.svgHeight/2-10))
    .attr("width",1)
    .attr("height",50);

    //Just above this, display the text mentioning the total number of electoral votes required
    // to win the elections throughout the country
    //HINT: Use .electoralVotesNote class to style this text element
    self.MiddleText
    .attr("class","electoralVotesNote")
    .attr("x",self.svgWidth/2)
    .attr("y",(self.svgHeight/2-20))
    .text(function(d){
      return "Electoral Vote ( "+ Math.round((accumEVI+accumEVD+accumEVR)/2) +" needed to win)"
    });
    //HINT: Use the chooseClass method to style your elements based on party wherever necessary.

    //******* TODO: PART V *******
    //Implement brush on the bar chart created above.
    //Implement a call back method to handle the brush end event.
    //Call the update method of brushSelection and pass the data corresponding to brush selection.
    //HINT: Use the .brush class to style the brush.


    //process stateStack data first
    self.stateStack.forEach((i) => {
      i[1]=self.xScale(i[1]);
      i[2]=self.xScale(i[2]);
    });

    //add brush
    self.svg.append("g")
            .attr("class","brush")
            .call(d3.brushX()
                  .extent([[0, self.svgHeight/2 - 15],[self.svgWidth, self.svgHeight/2+45]])
                  .on('end',function(){
                    var extent = d3.event.selection;
                    var states = [];
                    // var cood = [];
                    self.stateStack.forEach((i) => {
                      if (i[1]>=extent[0] && i[2] <= extent[1]){
                        states.push(i[0]);
                        // cood.push([i[1],i[2]])
                      }});
                    // console.log(states);
                    // console.log(cood);
                    self.brushSelection.update(states);
                  })
                );

};

/**
Process the  brushed data and transfer the state data to brushSlection
*/
// ElectoralVoteChart.prototype.brushedState = function (elecProto) {
//   console.log(elecProto.stateStack);
//   // elecProto.stateStack.forEach((item, i) => {
//   //   console.log(item, i);
//   // });
//
//   // console.log(self.svgWidth);
// };

function brushedState(eproto) {
  console.log(eproto.stateStack);
  // self.stateStack.forEach((item, i) => {
  //   console.log(item,i);
  // });
//
//   // console.log(brushedExtent);
//
//   // self.brushSelection.update(stateData);
};
