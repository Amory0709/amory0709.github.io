/**
 * Constructor for the Vote Percentage Chart
 */
function VotePercentageChart(){

    var self = this;
    self.init();
};

/**
 * Initializes the svg elements required for this chart
 */
VotePercentageChart.prototype.init = function(){
    var self = this;
    self.margin = {top: 30, right: 20, bottom: 30, left: 50};
    var divvotesPercentage = d3.select("#votes-percentage").classed("content", true);

    //Gets access to the div element created for this chart from HTML
    self.svgBounds = divvotesPercentage.node().getBoundingClientRect();
    self.svgWidth = self.svgBounds.width - self.margin.left - self.margin.right;
    self.svgHeight = 200;

    //creates svg element within the div
    self.svg = divvotesPercentage.append("svg")
        .attr("width",self.svgWidth)
        .attr("height",self.svgHeight)
    self.perGroup = self.svg.append("g").attr("id","percentageText");
    self.nomiGroup = self.svg.append("g").attr("id","nomineeText");
    // self.middleRect = this.svg.append("rect").attr("class","middlePoint");
    // self.middleText = this.svg.append("text").attr("class","votesPercentageNote");
};

/**
 * Returns the class that needs to be assigned to an element.
 *
 * @param party an ID for the party that is being referred to.
 */
VotePercentageChart.prototype.chooseClass = function (party) {
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
 * Renders the HTML content for tool tip
 *
 * @param tooltip_data information that needs to be populated in the tool tip
 * @return text HTML content for toop tip
 */
VotePercentageChart.prototype.tooltip_render = function (tooltip_data) {
    var self = this;
    var text = "<ul>";
    tooltip_data.forEach(function(row){
        text += "<li class = " + self.chooseClass(row.party)+ ">" + row.nominee+":\t\t"+row.votecount+"("+row.percentage.toFixed(2)+"%)" + "</li>"
    });

    return text;
}

/**
 * Creates the stacked bar chart, text content and tool tips for Vote Percentage chart
 *
 * @param electionResult election data for the year selected
 */
VotePercentageChart.prototype.update = function(electionResult){
    var self = this;
    // console.log("vote percentage chart here");
    //for reference:https://github.com/Caged/d3-tip
    //Use this tool tip element to handle any hover over the chart

    var tooltip_data = [
     {"nominee": electionResult[0].D_Nominee,"votecount": 0,"percentage": 0,"party":"D"} ,
     {"nominee": electionResult[0].R_Nominee,"votecount": 0,"percentage": 0,"party":"R"} ,
     {"nominee": electionResult[0].I_Nominee,"votecount": 0,"percentage": 0,"party":"I"}
   ];

    for (var i = 0; i < electionResult.length;++i){
      // console.log(electionResult[i]);
       tooltip_data[0].votecount+= parseInt(electionResult[i].D_Votes);
       tooltip_data[1].votecount+= parseInt(electionResult[i].R_Votes);
       if (electionResult[i].I_Votes == ""){
       tooltip_data[2].votecount += parseInt(0);
       }else{
         tooltip_data[2].votecount += parseInt(electionResult[i].I_Votes);
       }
    };



    var allVote =  tooltip_data[0].votecount + tooltip_data[1].votecount +  parseInt(tooltip_data[2].votecount);
    // console.log(allVote);
    for(var i = 0 ; i < tooltip_data.length; ++i){
      tooltip_data[i].percentage = 100*tooltip_data[i].votecount/allVote;
    }

    tip = d3.tip().attr('class', 'd3-tip')
        .direction('s')
        .offset(function() {
            return [0,0];
        })
        .html(function(d) {
            /* populate data in the following format
             * tooltip_data = {
             * "result":[
             * {"nominee": D_Nominee_prop,"votecount": D_Votes_Total,"percentage": D_PopularPercentage,"party":"D"} ,
             * {"nominee": R_Nominee_prop,"votecount": R_Votes_Total,"percentage": R_PopularPercentage,"party":"R"} ,
             * {"nominee": I_Nominee_prop,"votecount": I_Votes_Total,"percentage": I_PopularPercentage,"party":"I"}
             * ]
             * }
             * pass this as an argument to the tooltip_render function then,
             * return the HTML content returned from that method.
             * */

            return self.tooltip_render(tooltip_data);
        });
        this.svg.call(tip);

    // ******* TODO: PART III *******

    //Create the stacked bar chart.
    //Use the global color scale to color code the rectangles.
    //HINT: Use .votesPercentage class to style your bars.
    self.xScale = d3.scaleLinear()
        .range([0,this.svgWidth])
        .domain([0,100]);

        // dont know how to use this tip


        //draw the bars

        var bar = this.svg.selectAll("rect")
        .data(tooltip_data)
        .enter()
        .append("rect")
        .attr("class",function(d){
          return self.chooseClass(d.party)+" votesPercentage";
        });


        this.svg.selectAll("rect")
        .data(tooltip_data)
        // .transition()
        .attr("x",function(d){
          if(d.party == "I"){
            return 0;
          }
          else if (d.party == "D"){
            return self.xScale(tooltip_data[2].percentage);
          }
          else{
            return self.xScale(tooltip_data[2].percentage)+self.xScale(tooltip_data[0].percentage);
          }
        })
        .attr("y",self.svgHeight/2)
        .attr("width",function(d){
          return self.xScale(d.percentage);
        })
        .attr("height",30)
        .on("mouseover", tip.show)
        .on("mouseout", tip.hide)
        ;

        this.svg.selectAll("rect").exit().remove();

    //Display the total percentage of votes won by each party
    //on top of the corresponding groups of bars.
    //HINT: Use the .votesPercentageText class to style your text elements;  Use this in combination with
    // chooseClass to get a color based on the party wherever necessary

        // var perGroup = this.svg.append("g").attr("id","percentage");

        self.perGroup.selectAll("text")
                .data(tooltip_data)
                .enter()
                .append("text")
                .attr("class",function(d){
                   return self.chooseClass(d.party)+" votesPercentageText";
                });

        self.perGroup.selectAll("text")
                .data(tooltip_data)
                .transition()
                .attr("x",function(d){
                  if(d.party == "I"){
                    return 0;
                  }
                  else if (d.party == "D"){
                    return self.xScale(tooltip_data[2].percentage)+200;
                  }
                  else{
                    // return self.xScale(tooltip_data[2].percentage)+self.xScale(tooltip_data[0].percentage)+350;
                    return self.xScale(100);
                  }
                  })
                .attr("y",self.svgHeight/2)
                .text(function(d){
                  if(d.percentage == 0){
                    return "";
                  }
                  return d.percentage.toFixed(2)+"%";
                });
        self.perGroup.selectAll("text").exit().remove();


        // text the nominee

        // nomiGroup.selectAll("text").exit().remove();
        // var nomiText = nomiGroup.selectAll("text")
        //         .data(tooltip_data);

        // var newNomiText =
              self.nomiGroup.selectAll("text")
               .data(tooltip_data)
               .enter()
               .append("text")
               .attr("y",self.svgHeight/2-50)
               ;

        // newNomiText
                self.nomiGroup.selectAll("text")
                .data(tooltip_data)
                .attr("class",function(d){
                   return self.chooseClass(d.party)+" votesPercentageText";
                 })
                .transition()
                .attr("x",function(d){
                  if(d.party == "I"){
                    return 0;
                  }
                  else if (d.party == "D"){
                    return self.xScale(tooltip_data[2].percentage)+ 200;
                  }
                  else{
                    // return self.xScale(tooltip_data[2].percentage)+self.xScale(tooltip_data[0].percentage)+350;
                    return self.xScale(100);
                  }
                  })
                .text(function(d){
                  return d.nominee;
                });

        self.nomiGroup.selectAll("text").exit().remove();



        //以下是一段完美的代码
      //
        // this.svg.selectAll("text")
        //         .data(tooltip_data)
        //         .enter()
        //         .append("text")
        //         .attr("class",function(d){
        //            return self.chooseClass(d.party)+" votesPercentageText";
        //         });
        //
        // this.svg.selectAll("text")
        //         .data(tooltip_data)
        //         .transition()
        //         .attr("x",function(d){
        //           if(d.party == "I"){
        //             return 0;
        //           }
        //           else if (d.party == "D"){
        //             return self.xScale(tooltip_data[2].percentage)+100;
        //           }
        //           else{
        //             return self.xScale(tooltip_data[2].percentage)+self.xScale(tooltip_data[0].percentage)+350;
        //           }
        //           })
        //         .attr("y",self.svgHeight/2)
        //         .text(function(d){
        //           if(d.percentage == 0){
        //             return "";
        //           }
        //           return d.percentage.toFixed(2)+"%";
        //         });

    //Display a bar with minimal width in the center of the bar chart to indicate the 50% mark
    //HINT: Use .middlePoint class to style this bar.

    self.middleRect = this.svg.append("rect").attr("class","middlePoint")
        self.middleRect.attr("x",self.xScale(50))
        .attr("y",(self.svgHeight/2-10))
        .attr("width",1)
        .attr("height",50)
        .attr("fill","black");
    //Just above this, display the text mentioning details about this mark on top of this bar
    //HINT: Use .votesPercentageNote class to style this text element
    self.middleText = this.svg.append("text").attr("class","votesPercentageNote")
        self.middleText.attr("x",self.xScale(50))
        .attr("y",(self.svgHeight/2-20))
        .text("Popular Vote(50%)");
    //Call the tool tip on hover over the bars to display stateName, count of electoral votes.
    //then, vote percentage and number of votes won by each party.

    //HINT: Use the chooseClass method to style your elements based on party wherever necessary.

};
