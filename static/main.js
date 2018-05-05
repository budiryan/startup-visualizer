//Append the svg element
let height = 550;
let width = 1000;
let overlayWidth = 100;
let overlayHeight = 55;
let circleAmount = 1;   //Million
let pathTime = 10000;   //Time to transit between locations
let maxCircleRadius = 15;     //circle for net amounts
let positiveColor = "blue";
let negativeColor = "red";
let codeMap = d3.map();
let nameMap = d3.map();

let svg = d3.select("#map").append("svg")
            .attr("height",height)
            .attr("width",width);

let selectedCountry = null;


$(document).ready(function() {
    console.log( "Ready function is called!" );
    initMap();
});


document.getElementById('sub_form').onsubmit = function(){
  let countryChoice = document.getElementById('dropdown').value;
  createWordCloud(countryChoice);
  createParCoords(countryChoice);
  return false;
};


function initMap(){
    d3.queue()
        .defer(d3.json, "/countrycode")
        .await(mapCountryCode);
}


function mapCountryCode(error, countryCode){
    // codeMap.set(countryCode.code  , countryCode.alpha3);
    // nameMap.set(countryCode.alpha3, countryCode.name  );
    for(let i = 0; i < countryCode.length; i++)
        codeMap.set(countryCode[i].code, countryCode[i].alpha3);

    for(let i = 0; i < countryCode.length; i++)
        nameMap.set(countryCode[i].alpha3, countryCode[i].name);

    d3.queue()
      .defer(d3.json, "/worldmap")
      .defer(d3.json , "/countrycode")
      .defer(d3.json , "/demoflow") // TODO: Replace this with a request to server
      .defer(d3.json , "/demototal") // TODO: Replace this with a request to server
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
      .range([0,maxCircleRadius]);
    //Convert net foreign investment into [0,1] , currently not used

    let amountColorScale = d3.scale.linear()
      .domain([-amountRadiusScale.range()[1],amountRadiusScale.range()[1]])
      .range([0,1]);

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

     //Create group for each line of circles based on the dealflow dataset
    deals = svg.append("g").attr("class","transit-circles").selectAll("g")
                .data(dealflow)
                .enter()
                .append("g")
                .attr("class",function(d){return d.origin + " " + d.destination;});

    //Create line of circles for each group, ideally integrated into the enter state
    deals.each(function(d){
        let originCentroid;
        let destinationCentroid;
        let origin = d3.select("#" + d.origin);
        let destination = d3.select("#" + d.destination);
        origin.each(function(d){originCentroid = geoPath.centroid(d);});
        destination.each(function(d){destinationCentroid = geoPath.centroid(d);});
        //Rather complicated way of drawing the line of circles and distribute them evenly
        for(i = 0 ; i < +d.amount/circleAmount ; i++){
          let circle = d3.select(this).append("circle");
          //
          circle
            .attr("r","1.5")
            .attr("fill","rgba(0,0,0,1)")
          circle
            .attr("cx", function(d){return originCentroid[0]+i*(destinationCentroid[0]-originCentroid[0])/d.amount;})
            .attr("cy", function(d){return originCentroid[1]+i*(destinationCentroid[1]-originCentroid[1])/d.amount;})
            .transition()
            .ease("linear")
            .duration((+d.amount-i)*pathTime/d.amount)
            .attr('cx', destinationCentroid[0])
            .attr('cy', destinationCentroid[1])
            // .on("end",function repeat(){
            //   d3.active(this)
            //   .transition()
            //   .duration(0)
            //   .attr('cx', originCentroid[0])
            //   .attr('cy', originCentroid[1])
            //   .transition()
            //   .duration(pathTime)
            //   .attr('cx', destinationCentroid[0])
            //   .attr('cy', destinationCentroid[1])
            //   .on("end", repeat);
            // });
        }
    });
      //Create net investment circle for each country based on the totalbycountry dataset passed in
      //i.e. big circles
      countrytotal = svg.append("g").attr("class","country-circles").selectAll("circle")
        .data(totalbycountry)
        .enter()
        .append("circle")
        .attr("class",function(d){return d.country});

        //Configure each net investment circle
      //Note there are click, mouseover, mouseout and mousemove events built in
      countrytotal.each(function(d){
        let centroid;
        let origin = d3.select("#" + d.country);
        origin.each(function(d){centroid = geoPath.centroid(d);});
        d3.select(this)
            .attr("cx",centroid[0])
            .attr("cy",centroid[1])
            .attr("r",function(d){return amountRadiusScale(Math.abs(d.net));})
            .attr("fill", function(d){if(d.net>=0){return positiveColor} else{return negativeColor}})
            .on("click", function(d){
                // Clicking the country will display the world cloud and parallel coordinate
                createWordCloud(d.country);
                createParCoords(d.country);
            })
            // .on("mouseover",mouseover)
            // .on("mouseout",mouseout)
            // .on("mousemove",mousemove);
      });
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
                  let category = d.text;
                  console.log("submitted request for: " + category);
                  let requestString = '/most_popular_companies?country='
                      + countryChoice + '&category=' + category;
                  d3.json(requestString, function(error, result) {
                     console.log(result);
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



