let map;
let overlay;


function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 4,
        center: new google.maps.LatLng(-29.078, 147.257),
        mapTypeId: 'satellite',
    });
    map.data.setStyle({
        fillOpacity: 0,
        strokeColor: 'red',
        strokeWeight: 2,
    });
}


function geometryToFeature(geometry){
    return {
        type: 'Feature',
        properties: {},
        geometry: geometry
    }
}

function clearMapFeatures(){
    if (overlay !== undefined) {
        overlay.setMap(null);
    }
    map.data.forEach(e => map.data.remove(e));
}

function zoomToFeatures(){
    let bounds = new google.maps.LatLngBounds();
    map.data.forEach(function(feature){
        feature.getGeometry().forEachLatLng(function(latlng){
            bounds.extend(latlng);
        });
    });
    map.fitBounds(bounds);
}

function draw(geometry, raster_data, raster_bounds) {
    map.data.addGeoJson(geometryToFeature(geometry));
    const overlay_bounds = {
        west: raster_bounds[0],
        south: raster_bounds[1],
        east: raster_bounds[2],
        north: raster_bounds[3]
    }
    overlay = new google.maps.GroundOverlay(raster_data, overlay_bounds);
    overlay.setMap(map);
}

function readForm(form){
    const data = new FormData(form);
    let geometry;
    try {
        geometry = JSON.parse(data.get('geometry'));
    } catch (e) {
        throw new Error('Geometry is not a valid JSON object');
    }
    return {
        host: data.get('host'),
        layer: data.get('layer'),
        version: data.get('version'),
        geometry: JSON.parse(data.get('geometry')),
    };
}


async function submitRequest(event) {
    event.preventDefault();
    clearMapFeatures()

    let formData;
    try {
        formData = readForm(event.target)
    } catch (err) {
        console.error(`Form "validation" failed: ${err}`);
        alert(err);
        return;
    }

    let response
    try {
        response = await fetch(`${formData.host}/v2/${formData.layer}/mask`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({version: formData.version, geometry: formData.geometry})
        });
    } catch (err) {
        console.error(err);
        alert(err);
        return;
    }

    let data;
    try {
        data = await response.json();
    } catch (err) {
        console.error(response.statusText);
        alert(response.statusText);
        return;
    }

    if (!response.ok){
        alert(data.message);
        return
    }

    draw(formData.geometry, data.image, data.bounds);
    zoomToFeatures();
}




/* splitter js from https://stackoverflow.com/a/55202728 */
function dragElement(element, direction)
{
    var   md; // remember mouse down info
    const first  = document.getElementById("map");
    const second = document.getElementById("config-panel");
    element.onmousedown = onMouseDown;
    function onMouseDown(e)
    {
        md = {e,
              offsetLeft:  element.offsetLeft,
              offsetTop:   element.offsetTop,
              firstWidth:  first.offsetWidth,
              secondWidth: second.offsetWidth
             };
        document.onmousemove = onMouseMove;
        document.onmouseup = () => {
            document.onmousemove = document.onmouseup = null;
        }
    }
    function onMouseMove(e)
    {
        var delta = {x: e.clientX - md.e.clientX,
                     y: e.clientY - md.e.clientY};
        if (direction === "H" ) // Horizontal
        {
            delta.x = Math.min(Math.max(delta.x, -md.firstWidth),
                       md.secondWidth);
            element.style.left = md.offsetLeft + delta.x + "px";
            first.style.width = (md.firstWidth + delta.x) + "px";
            second.style.width = (md.secondWidth - delta.x) + "px";
        }
    }
}

document.addEventListener('DOMContentLoaded', function(){
    dragElement( document.getElementById("separator"), "H" );
});

