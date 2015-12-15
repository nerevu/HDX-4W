//configuration object
var def_config = {
    title: "La Nina Consortium 4W",
    description: "Who is doing What, Where, and When in response to La Nina",
    data: "data/data.json",
    whoFieldName: "agency",
    whatFieldName: "project_title",
    whereFieldName: "county",
    startFieldName: "start_date",
    endFieldName: "end_date",
    geo: "data/geography.geojson",
    joinAttribute: "COUNTY_NAM",
    nameAttribute: "COUNTY_NAM",
    color: "#fdbe85",
    enable4w: true
};

//function to generate the 3W/4w component
//data is the json file
//geom is geojson file
function generate3WComponent(config, data, geom) {
    var lookup = genLookup(geom, config)
      , val = null
      , paused = false
      , done = true
      , slider = $('.slider')
      , baseDate = new Date('1/1/1970')
      , firstPlay = true;

    $('#title').html(config.title);
    $('#description').html(config.description);
    var margins = {
        top: 0,
        left: 10,
        right: 10,
        bottom: 35
    };

    var whoChart = dc.rowChart('#hdx-3W-who')
      , whatChart = dc.rowChart('#hdx-3W-what')
      , whereChart = dc.leafletChoroplethChart('#hdx-3W-where')
      , cf = crossfilter(data);

    var whoDimension = cf.dimension(function(d){
            return d[config.whoFieldName];
        });

    var whatDimension = cf.dimension(function(d){
            return d[config.whatFieldName];
        });

    var whereDimension = cf.dimension(function(d){
            return d[config.whereFieldName].toLowerCase();
        });

    startDimension = cf.dimension(function(d){
        return new Date(d[config.startFieldName]);
    });

    endDimension = cf.dimension(function(d){
        return new Date(d[config.endFieldName]);
    });

    var whoGroup = whoDimension.group()
      , whatGroup = whatDimension.group()
      , whereGroup = whereDimension.group()
      , all = cf.groupAll()

    firstDate = new Date(startDimension.bottom(1)[0][config.startFieldName])
    lastDate = new Date(endDimension.top(1)[0][config.endFieldName])

    whoChart.width($('#hxd-3W-who').width()).height(400)
        .dimension(whoDimension)
        .group(whoGroup)
        .elasticX(true)
        .margins(margins)
        .data(function(group) {return group.top(15)})
        .labelOffsetY(13)
        .colors([config.color])
        .colorAccessor(function(d, i){return 0;})
        .xAxis().ticks(5);

    whatChart.width($('#hxd-3W-what').width()).height(400)
        .dimension(whatDimension)
        .group(whatGroup)
        .elasticX(true)
        .margins(margins)
        .data(function(group) {return group.top(15)})
        .labelOffsetY(13)
        .colors([config.color])
        .colorAccessor(function(d, i){return 0;})
        .xAxis().ticks(5);

    dc.dataCount('#count-info')
        .dimension(cf)
        .group(all);

    whereChart.width($('#hxd-3W-where').width()).height(360)
        .dimension(whereDimension)
        .group(whereGroup)
        .center([0,0])
        .zoom(0)
        .geojson(geom)
        .colors(['#CCCCCC', config.color])
        .colorDomain([0, 1])
        .colorAccessor(function (d) {
            if(d > 0){
                return 1;
            } else {
                return 0;
            }
        })
        .featureKeyAccessor(function(feature){
            return feature.properties[config.joinAttribute].toLowerCase();
        }).popup(function(d){
            return lookup[d.key];
        })
        .renderPopup(true);

    dc.renderAll();

    var map = whereChart.map();

    zoomToGeom(geom);

    var g = d3.selectAll('#hdx-3W-who').select('svg').append('g');

    g.append('text')
        .attr('class', 'x-axis-label')
        .attr('text-anchor', 'middle')
        .attr('x', $('#hdx-3W-who').width()/2)
        .attr('y', 400)
        .text('Activities');

    var g = d3.selectAll('#hdx-3W-what').select('svg').append('g');

    g.append('text')
        .attr('class', 'x-axis-label')
        .attr('text-anchor', 'middle')
        .attr('x', $('#hdx-3W-what').width()/2)
        .attr('y', 400)
        .text('Activities');

    function zoomToGeom(geom){
        var bounds = d3.geo.bounds(geom);
        map.fitBounds([[bounds[0][1],bounds[0][0]],[bounds[1][1],bounds[1][0]]]);
    }

    function genLookup(geojson, config){
        var lookup = {};
        geojson.features.forEach(function(e){
            join = e.properties[config.joinAttribute].toLowerCase()
            name = String(e.properties[config.nameAttribute])
            lookup[join] = name;
        });
        return lookup;
    }

    $('.play').on('click', function(){
        play(firstPlay ? minDate : val);
        $('.play').addClass('hide')
        $('.pause').removeClass('hide')
        firstPlay = false
    })

    $('.pause').on('click', function(){
        pause()
        $('.play').removeClass('hide')
        $('.pause').addClass('hide')
    })

    $('#reset').on('click', function(){
        if (config.enable4w) {
            reset()
        };
    })

    if (config.enable4w) {
        initSlider();
        $('.4w').removeClass('hide')
    };

    function initSlider() {
        var $value, count, now, start;
        now = moment(new Date());
        start = now.diff(baseDate, 'days');
        count = $('.slider').length;
        $value = $('#value')[0];
        minDate = moment(firstDate).diff(baseDate, 'days')
        maxDate = moment(lastDate).diff(baseDate, 'days')
        slider[0].setAttribute('min', minDate);
        slider[0].setAttribute('max', maxDate);
        slider[0].setAttribute('value', start);
        slider.rangeslider({
            polyfill: false,
            onInit: function() {
                updateValue($value, this.value);
                updateCharts(this.value);
            },
            onSlide: function(pos, value) {
                if (this.grabPos) {
                    updateValue($value, value);
                }
            },
            onSlideEnd: function(pos, value) {updateCharts(value)}
        });
    }

    function play(value) {
        var step = 30
          , delay = 2000

        if ((value <= maxDate) && !paused) {
            slider.val(value).change();
            updateCharts(value);
            return setTimeout((function() {
                play(value + step);
            }), delay);
        } else if ((value - step <= maxDate) && !paused) {
            slider.val(maxDate).change();
            updateCharts(maxDate);
            return setTimeout((function() {
                play(value + step);
            }), delay);
        } else if (paused) {
            paused = false;
        } else if (value > maxDate) {
            reset()
        }
    };

    function updateCharts(value) {
        dc.filterAll();
        var m = moment(baseDate).add('days', value);
        endDimension.filterRange([m.toDate(), Infinity]);
        startDimension.filterRange([baseDate, (m.add('d', 1)).toDate()]);
        dc.redrawAll();
    };

    function updateValue(e, value) {
        var m = moment(baseDate).add('days', value);
        e.textContent = m.format("l");
        val = value
    };

    function pause() {
        paused = true;
    };

    function reset() {
        slider.val(minDate).change();
        updateCharts(minDate);
        $('.play').removeClass('hide')
        $('.pause').addClass('hide')
    };
}

$(document).ready(
    function(){
        //load config
        var config = def_config;

        //load 4W data
        var dataCall = $.ajax({
            type: 'GET',
            url: config.data,
            dataType: 'json',
        });

        //load geometry
        var geomCall = $.ajax({
            type: 'GET',
            url: config.geo,
            dataType: 'json',
        });

        //when both ready construct 4W
        $.when(dataCall, geomCall).then(function(dataArgs, geomArgs){
            var data = dataArgs[0].result.records;
            var geom = geomArgs[0]

            geom.features.forEach(function(e){
                join = String(e.properties[config.joinAttribute])
                e.properties[config.joinAttribute] = join;
            });

            generate3WComponent(config, data, geom);
        });
    }
);
