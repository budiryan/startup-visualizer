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


$(document).ready(function() {
    console.log( "ready!" );
    initMap();
});


document.getElementById('sub_form').onsubmit = function(){
  let countryChoice = document.getElementById('dropdown').value;
  createWordCloud(countryChoice);
  createParCoords(countryChoice);
  return false;
};


function drawMap(error, worldmap, countrycode, dealflow, totalbycountry){
    if(error){
        console.log(error);
        throw error;
    }

    codeMap.set(countrycode.code, countrycode.alpha3);
    nameMap.set(countrycode.alpha3, countrycode.code);

    //Map projection
    let projection = d3.geo.mercator().translate([500,350]);

    //Create projected geopath
    let geoPath = d3.geo.path().projection(projection);

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
        .attr("id", function(d){return codeMap.get(d.id)});

    //Map, to create the borders, notice only borders between countries are drawn
    svg.append("g").append("path")
        .attr("class", "borders")
        .attr("d",geoPath(topojson.mesh(worldmap, worldmap.objects.countries, function(a, b) { return a !== b; })));

}

function initMap(){
    d3.queue()
      .defer(d3.json, "/worldmap")
      .defer(d3.json , "/countrycode")
      .defer(d3.json , "/demoflow") // TODO: Replace this with a request to server
      .defer(d3.json , "/demototal") // TODO: Replace this with a request to server
      .await(drawMap);

    d3.queue().defer(d3.json , "/countrycode",function(d){
           codeMap.set(d.code  , d.alpha3);
           nameMap.set(d.alpha3, d.name  );
    });
}


function createParCoords(countryChoice){
    console.log("country choice for parcoords: " + countryChoice);
    d3.select("svg").remove();
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


function createWordCloud(countryChoice) {
    let color = d3.scale.linear()
            .domain([0,1,2,3,4,5,6,10,15,20,100])
            .range(["#ddd", "#ccc", "#bbb", "#aaa", "#999", "#888", "#777", "#666", "#555", "#444", "#333", "#222"]);

    function draw(categories) {
        d3.select("svg").remove();
        d3.select("canvas").remove();
        d3.select("#word-cloud").append("svg")
                .attr("width", 800)
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
        // console.log(categories);
        d3.layout.cloud()
        .size([800, 300])
        .words(categories)
        .rotate(0)
        .fontSize(function(d) { return d.frequency; })
        .on("end", draw)
        .start();
    });

    return false;
}



