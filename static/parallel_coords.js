d3.csv("data_join_filtered.csv", function(data){
  //filter data by country
  var filtered_country = data.filter(function(d) {
    if (d.country_code == 'CHN') {
      return d;
  }
  });
  //keep only the important columns
  var filtered_data = filtered_country.map(function(d) {
    return {
      investment_type: d.investment_type,
      amount_invested: +d.raised_amount_usd,
      investor_type: d.investor_type,
      foreign_vs_local: (d.country_code == d.investor_country_code)?"local":"foreign"
    }
  });
  //dimensions of each axis
  var dimensions = {"investment_type": {
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

   var colourIndex = d3.scale.linear()
    .domain([0, 11])
    .range(['#FDC33E', '#A6C9B1'])
    .interpolate(d3.interpolateLab);
   var it = 0;
   var color = function(d){console.log(it); return colourIndex((it++)%12)};
   var parcoords = d3.parcoords()(".parcoords")
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
