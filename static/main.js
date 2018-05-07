//Append the svg element

// Map's constant definitions
let height = 550;
let width = 1000;
let overlayWidth = 100;
let overlayHeight = 55;
let circleAmount = 5;   //Million
let pathTime = 10000;   //Time to transit between locations
let minCircleRadius = 2;
let maxCircleRadius = 15;     //countrycircies
let positiveColor = "blue";
let negativeColor = "red";
let displayPrecision = 3;   //For overlay
let codeMap = d3.map();
let nameMap = d3.map();
let alphaMap = d3.map();
let latMap = d3.map();
let longMap = d3.map();


$(document).ready(function() {
    console.log( "Start Application" );
    $( ".company-dialog" ).dialog({
      autoOpen: false,
      show: {
        effect: "blind",
        duration: 500
      },
      hide: {
        effect: "explode",
        duration: 500
      }
    });

    // Initialize startup map
    initMap();
});


function initMap(){
    d3.queue()
        .defer(d3.json, "/countrycode")
        .defer(d3.json, "/countrycenter")
        .await(mapCountryCode);
}


function mapCountryCode(error, countryCode, countryCenter){
    let tempLatMap = d3.map();
    let tempLongMap = d3.map();
    let tempNameMap = d3.map();

    for(let i = 0; i < countryCode.length; i++){
        codeMap.set(countryCode[i].code, countryCode[i].alpha3);
        alphaMap.set(countryCode[i].alpha2, countryCode[i].alpha3);
    }

    for(let i = 0; i < countryCenter.length; i++){
      let a3 = alphaMap.get(countryCenter[i].code);
      tempLatMap.set(a3,countryCenter[i].lat);
      tempLongMap.set(a3,countryCenter[i].long);
      tempNameMap.set(a3,countryCenter[i].name);
    }
    for(let i = 0; i < countryCode.length; i++){
      let code = codeMap.get(countryCode[i].code);
      latMap.set(code,tempLatMap.get(code));
      longMap.set(code,tempLongMap.get(code));
      nameMap.set(code, tempNameMap.get(code));
    }

    d3.queue()
      .defer(d3.json, "/worldmap")
      .defer(d3.json , "/countrycode")
      .defer(d3.json , "/getflow")
      .defer(d3.json , "/gettotal")
      .await(drawMap)
}


function drawMap(error, worldmap, countrycode, dealflow, totalbycountry){
    console.log("Begin drawing map..");
    if(error){
        console.log(error);
        throw error;
    }

    //Map projection
    let projection = d3.geo.mercator().translate([500,350]);

    //Create projected geopath
    let geoPath = d3.geo.path().projection(projection);

    //Convert net foreign investment into circle radius
    let amountRadiusScale = d3.scale.sqrt()
      .domain([0,d3.max(totalbycountry,function(d){return Math.abs(d.net);})])
      .range([2,maxCircleRadius]);

    //Convert net foreign investment into [0,1] , currently not used
    let amountColorScale = d3.scale.linear()
      .domain([-amountRadiusScale.range()[1],amountRadiusScale.range()[1]])
      .range([0,1]);

    let svg = d3.select("#map").append("svg")
                .attr("height",height)
                .attr("width",width)
                .call(d3.behavior.zoom().scaleExtent([1, 5]).on("zoom", function zm() {
                  svg.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
                }))
                .append("g");

    let selectedCountry = null;

    //Map
    let world = topojson.feature(worldmap, {
        type: "GeometryCollection",
        geometries: worldmap.objects.countries.geometries
    });

    //Map
    map = svg.append("g").selectAll("path")
        .data(world.features)
        .enter()
        .append("path")
        .attr("class", "countries")
        .attr("d",geoPath)
        .attr("id", function(d){return codeMap.get(+d.id)});

    //Map, to create the borders, notice only borders between countries are drawn
    svg.append("g").append("path")
        .attr("class", "borders")
        .attr("d",geoPath(topojson.mesh(worldmap, worldmap.objects.countries, function(a, b) { return a !== b; })));

    //A background for people to click on and cancels any filtering
    svg.append("g").append("rect")
        .attr("height",height)
        .attr("width",width)
        .attr("opacity","0")
        .on("click",clickbackground);

     //Create group for each line of circles based on the dealflow dataset
    deals = svg.append("g").attr("class","transit-circles").selectAll("g")
                .data(dealflow)
                .enter()
                .append("g")
                .attr("class",function(d){return d.origin + " " + d.destination;});

    //Create line of circles for each group, ideally integrated into the enter state
    deals.each(function(d){
        let originCentroid = getCenter(d.origin);
        let destinationCentroid = getCenter(d.destination);
        //Rather complicated way of drawing the line of circles and distribute them evenly
        var numCircle = Math.ceil(+d.amount/circleAmount);
        var randPos = Math.random();
        for(i = 0 ; i < numCircle ; i++){
            if((typeof destinationCentroid !== "undefined") && (typeof originCentroid !== "undefined")) {
                let circle = d3.select(this).append("circle").attr("class","transit");
                //Animations
                circle
                  .attr("cx", function (d) {
                      return originCentroid[0] + (i+randPos) * (destinationCentroid[0] - originCentroid[0]) / numCircle;
                  })
                  .attr("cy", function (d) {
                      return originCentroid[1] + (i+randPos) * (destinationCentroid[1] - originCentroid[1]) / numCircle;
                  })
                  .transition()
                  .ease("linear")
                  .duration((numCircle - (i-randPos)) * pathTime / numCircle)
                  .attr('cx', destinationCentroid[0])
                  .attr('cy', destinationCentroid[1])
                  .each("end",repeat);

                  function repeat(){
                    d3.select(this)
                    .attr('cx', originCentroid[0])
                    .attr('cy', originCentroid[1])
                    .transition()
                    .ease("linear")
                    .duration(pathTime)
                    .attr('cx', destinationCentroid[0])
                    .attr('cy', destinationCentroid[1])
                    .each("end", repeat);
                  }
            }
        }
    });
    //Create net investment circle for each country based on the totalbycountry dataset passed in
    //i.e. big circles
    countrytotal = svg.append("g").attr("class","country-circles").selectAll("circle")
      .data(totalbycountry)
      .enter()
      .append("circle");

      //Configure each net investment circle
    //Note there are click, mouseover, mouseout and mousemove events built in
    countrytotal.each(function(d){
      let centroid = getCenter(d.country);
      if(centroid !== null) {
          d3.select(this)
              .attr("cx", centroid[0])
              .attr("cy", centroid[1])
              .attr("r", function (d) {
                  return amountRadiusScale(Math.abs(d.net));
              })
              .attr("class",function(d){
                if(d.net>=0){
                  return d.country + " out";
                }
                else{
                  return d.country + " in";
                }
              })
              .attr("val",d.net)
              .on("click", click)
              .on("mouseover",mouseover)
              .on("mouseout",mouseout)
              .on("mousemove",mousemove);
      }
      else{
        console.log("Cannot render " + d.country + " as it does not exist on the countries list");
      };
    });
    function getCenter(country){
      let lat = latMap.get(country);
      let long = longMap.get(country);
      if(isNaN(lat)){
        return null;
      }
      else{
        return projection([long,lat]);
      }
    }

    //Overlay when mousedover, just a proof of concept
    let overlay = svg.append("g")
        .attr("id","overlay")
        .style("display", "none");

    overlay.append("rect")
        .attr("height",overlayHeight)
        .attr("width",overlayWidth);

    overlay.append("text").attr("id","country");
    overlay.append("text").attr("id","data");


    function click(d){
      // Clicking the country will display the world cloud and parallel coordinate
      $( ".company-dialog" ).dialog( "close" );
      //createWordCloud(d.country);
      //createParCoords(d.country);
      let selectedCountry = nameMap.get(d.country);
      let displayString = "Startup Information of: " + selectedCountry;
      $(".country-info").text(displayString);

      //Filtering
      d3.selectAll(".transit-circles g circle").each(function(d){
        d3.select(this).style("display","inline");
      });
      //If the same country circle is clicked a second time (tracked by the "country" variable), return to top view
      if(country != d.country){
        country = d.country;
        d3.selectAll(".transit-circles g:not(." + country + ") circle").each(function(d){
          d3.select(this).style("display","none");
        });
        //Select all country circles and set to 0 opacity
        d3.selectAll(".country-circles circle:not(." + country + ")").each(function(d){
          var obj = d3.select(this).style("display","none").attr("val", function(d){
            return d.net;
          });
        });
        //Select all rellavant countries and set to 1 opacity
        d3.selectAll(".transit-circles g." + country).each(function(d){
          let amount = d.amount;
          let origin = d.origin;
          let fromOrigin = 0;
          if(origin==country){fromOrigin = 1;}
          //Super crude method... please help think how to improve this, maybe a more advanced not selection?
          var otherCountry = ".country-circles circle."+d3.select(this).attr("class").replace(country,"").replace(" ","");
          d3.selectAll(otherCountry).each(function(d){
            var obj = d3.select(this).style("display",null)
              .attr("r", function (d) {
                  return amountRadiusScale(Math.abs(amount));
              })
              .attr("class",function(d){
                if(fromOrigin == 0){
                  return d.country + " out";
                }
                else{
                  return d.country + " in";
                }
              })
              .attr("val",function(d){
                if(fromOrigin == 0){
                  return amount;
                }
                else{
                  return -amount;
                }
              });
          });
        });
        d3.selectAll(".country-circles circle." + country).each(function(d){
          d3.select(this).style("display",null)
          .attr("r", function (d) {
              return amountRadiusScale(Math.abs(d.net));
          })
          .attr("class",function(d){
            if(d.net>=0){
              return d.country + " out";
            }
            else{
              return d.country + " in";
            }
          })
          .attr("val",function(d){
            return d.net;
          });
        });
      }
      else{
        d3.selectAll(".country-circles circle").each(function(d){
          d3.select(this).style("display","inline")
          .attr("r", function (d) {
              return amountRadiusScale(Math.abs(d.net));
          })
          .attr("class",function(d){
            if(d.net>=0){
              return d.country + " out";
            }
            else{
              return d.country + " in";
            }
          })
          .attr("val", function(d){
            return d.net;
          });
        });
        country = "svg"
      }
    }

    function clickbackground(d){
      //When users click the empty background created earlier, view reverts to the original
      d3.selectAll(".transit-circles g circle").each(function(d){
        d3.select(this).style("display","inline");
      });
      d3.selectAll(".country-circles circle").each(function(d){
        d3.select(this).style("display","inline")
        .attr("r", function (d) {
            return amountRadiusScale(Math.abs(d.net));
        })
        .attr("class",function(d){
          if(d.net>=0){
            return d.country + " out";
          }
          else{
            return d.country + " in";
          }
        })
        .attr("val", function(d){
          return d.net;
        });
      });
      country = "svg"
    }
}

let country = "svg";

function mouseover(d){d3.select("#overlay").style("display", null);}
function mouseout(d){d3.select("#overlay").style("display", "none");}
function mousemove(d){
  let overlay = d3.select("#overlay");

  overlay.select("rect")
      .attr("x",d3.mouse(this)[0]-0.5*overlayWidth)
      .attr("y",d3.mouse(this)[1]-1.25*overlayHeight);
  overlay.select("#country")
      .attr("x",d3.mouse(this)[0]-0.5*overlayWidth)
      .attr("y",d3.mouse(this)[1]-1.5*overlayHeight)
      .text(nameMap.get(d.country))
  overlay.select("#data")
      .attr("x",d3.mouse(this)[0]-0.5*overlayWidth)
      .attr("y",d3.mouse(this)[1]-0.5*overlayHeight)
      .text(Number.parseFloat(d3.select(this).attr("val")).toPrecision(displayPrecision));
}

function createWordCloud(countryChoice) {
    let color = d3.scale.linear()
            .domain([0,1,2,3,4,5,6,10,15,20,100])
            .range(["#ddd", "#ccc", "#bbb", "#aaa", "#999", "#888", "#777", "#666", "#555", "#444", "#333", "#222"]);

    function draw(categories) {
        console.log("Begin drawing wordcloud");

        // Remove previous wordcloud if there is any
        d3.select(".wordcloud").remove();

        d3.select("#wordcloud-container").append("svg")
                .attr("width", 900)
                .attr("height", 300)
                .attr("class", "wordcloud")
                .append("g")
                // without the transform, words words would get cutoff to the left and top, they would
                // appear outside of the SVG area
                .attr("transform", "translate(300,150)")
                .selectAll("text")
                .data(categories)
                .enter().append("text")
                .style("font-size", function(d) { return d.size + "px"; })
                .style("fill", function(d, i) { return color(i); })
                .attr("transform", function(d) {
                    return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
                })
                .text(function(d) { return d.text; })
                .on("click", function (d, i){
                  $( ".company-dialog" ).dialog( "close" );
                  let category = d.text;
                  let requestString = '/most_popular_companies?country='
                      + countryChoice + '&category=' + category;
                  d3.json(requestString, function(error, result) {
                    // Display the top 3 companies of the given category
                    $(".company-dialog-text").text("Most popular company in this category: ");
                    let company_list = $(".company-dialog-text").append('<ul></ul>').find('ul');

                    for (i in result) {
                        let company_link = $('<a />');
                        company_link.attr('href', result[i].homepage_url);
                        company_link.attr('target', '_blank');
                        company_link.text(result[i].company_name);

                        inside_list = company_list.append('<li></li>').find('li').last();
                        inside_list.append(company_link);
                        company_list.append(inside_list);
                    }

                    $( ".company-dialog" ).dialog( "open" );
                  });
              });
    }

    // request the data
    d3.json("/word_cloud?country=" + countryChoice, function (error, categories) {
        d3.layout.cloud()
        .size([900, 300])
        .words(categories)
        .rotate(0)
        .fontSize(function(d) { return d.frequency; })
        .on("end", draw)
        .start();
    });
    return false;
}

function createParCoords(countryChoice){
    // First, remove the previous parallel coordinate if there is any
    $(".parcoords").empty();

    console.log("Begin parallel coordinates..");

    // Parallel Coordinate creation begins
    let requestString = "/par_coords?country=" + countryChoice;
    d3.json(requestString, function(data) {
              //keep only the important columns
              let filtered_data = data.map(function(d) {
                return {
                  investment_type: d.investment_type,
                  amount_invested: + d.raised_amount_usd,
                  investor_type: d.investor_type,
                  foreign_vs_local: (d.country_code == d.investor_country_code)?"local":"foreign"
                }
              });
              //dimensions of each axis
              let dimensions = {"investment_type": {
                              title: 'investment type',
                              type: 'string',
                              index: 0
                              // yscale: 'linear'
                            },
                            "amount_invested": {
                              title: 'amount invested (USD)',
                              type: 'number',
                              index: 1
                              // yscale: 'ordinal'
                            },
                            "investor_type": {
                              title: 'investor type',
                              type: 'string',
                              index: 2
                              // yscale: 'ordinal'
                            },
                          "foreign_vs_local": {
                            title: 'foreign vs local investors',
                            type: 'string',
                            index: 3
                          }};

               let colourIndex = d3.scale.linear()
                .domain([0, 11])
                .range(['#FDC33E', '#A6C9B1'])
                .interpolate(d3.interpolateLab);
               let it = 0;
               let color = function(d){return colourIndex((it++)%12)};
               let parcoords = d3.parcoords()(".parcoords")
                 .data(filtered_data)
                 .color(color)
                 .dimensions(dimensions)
                 .bundlingStrength(1)
                 .nullValueSeparator('bottom')
                 .showControlPoints(true)
                 .render()
                 .createAxes()
                 .alpha(0.5)
                 .brushMode("1D-axes")
                 .mode("queue")
                 .interactive();
               parcoords.svg.selectAll("text")
               .style("font", "10px sans-serif");
            });
}
