/* splitter js from https://stackoverflow.com/a/55202728 */
function initSeparator(direction, element, first, second) {
    let md; // remember mouse down info
    element.onmousedown = onMouseDown;

    function onMouseDown(e) {
        md = {
            e,
            offsetLeft: element.offsetLeft,
            offsetTop: element.offsetTop,
            firstWidth: first.offsetWidth,
            secondWidth: second.offsetWidth
        };
        document.onmousemove = onMouseMove;
        document.onmouseup = () => {
            document.onmousemove = document.onmouseup = null;
        }
    }

    function onMouseMove(e) {
        let delta = {x: e.clientX - md.e.clientX, y: e.clientY - md.e.clientY};
        if (direction === "H") {
            delta.x = Math.min(Math.max(delta.x, -md.firstWidth), md.secondWidth);
            element.style.left = md.offsetLeft + delta.x + "px";
            first.style.width = (md.firstWidth + delta.x) + "px";
            second.style.width = (md.secondWidth - delta.x) + "px";
        }
    }
}

/* Map component*/
Vue.component('google-map', {
    template: `<div id="map"></div>`,

    // Non-reactive attributes. Access these via this.$options
    map_overlays: [],
    map_default_center: [-29.078, 147.257],
    map_default_zoom: 4,

    methods: {
        initMap(){
            this.googleMapMixins();

            map = new google.maps.Map(document.getElementById("map"), {
                zoom: this.$options.map_default_zoom,
                center: new google.maps.LatLng(...this.$options.map_default_center),
                streetViewControl: false,
                mapTypeId: google.maps.MapTypeId.HYBRID,
                labels:true
            });
            const polygonStyle = {
                fillOpacity: 0,
                strokeWeight: 2,
            }
            map.data.setStyle({...polygonStyle, strokeColor: 'red'});

            const drawingManager = new google.maps.drawing.DrawingManager({
                drawingMode: google.maps.drawing.OverlayType.MARKER,
                drawingControl: true,
                drawingControlOptions: {
                    position: google.maps.ControlPosition.TOP_CENTER,
                    drawingModes: [
                        google.maps.drawing.OverlayType.RECTANGLE,
                        google.maps.drawing.OverlayType.POLYGON,
                    ],
                },
                rectangleOptions: {...polygonStyle, strokeColor: 'blue'},
                polygonOptions: {...polygonStyle, strokeColor: 'blue'},
            });
            google.maps.event.addListener(drawingManager, 'overlaycomplete', (e) => {
                this.$options.map_overlays.push(e.overlay);
            });
            drawingManager.setMap(map);

            this.addControl('Clear', 'Click to clear the map', () => {
                this.clear();
            });
            this.addControl('Show All', 'Click to zoom to all features', () => {
                this.zoomToFeatures();
            })

        },

        googleMapMixins() {
            // Provide a .getGeoJSON for Polygon
            google.maps.Polygon.prototype.getGeoJSON = function()  {
                let geoJSON = {
                    type: "Polygon",
                    coordinates: []
                };
                let paths = this.getPaths().getArray();
                for (path of paths)  {
                    let pathArray = [];
                    let points = path.getArray();
                    let firstPoint = false;
                    for (point of points)  {
                        if (firstPoint === false)  {
                            firstPoint = point;
                        }
                        pathArray.push([point.lng(), point.lat()])
                    }
                    pathArray.push([firstPoint.lng(), firstPoint.lat()]);
                    geoJSON.coordinates.push(pathArray);
                }
                return geoJSON;
            };

            // Provide a .getGeoJSON for Rectangle
            google.maps.Rectangle.prototype.getGeoJSON = function() {
                const bounds = this.getBounds().toJSON();
                return {
                    type: "Polygon",
                    coordinates: [
                        [bounds['west'], bounds['south']],
                        [bounds['east'], bounds['south']],
                        [bounds['east'], bounds['north']],
                        [bounds['west'], bounds['north']],
                        [bounds['west'], bounds['south']],
                    ]
                };
            }

        },

        addControl(text, title, onclick){
            // Create a div to hold the control.
            var controlDiv = document.createElement('div');

            // Set CSS for the control border
            var controlUI = document.createElement('div');
            controlUI.style.backgroundColor = '#fff';
            controlUI.style.border = '2px solid #fff';
            controlUI.style.cursor = 'pointer';
            controlUI.style.marginTop = '5px';
            controlUI.style.marginRight = '5px';
            controlUI.style.borderRadius = '2px';
            controlUI.style.textAlign = 'center';
            controlUI.title = title;
            controlDiv.appendChild(controlUI);

            // Set CSS for the control interior
            var controlText = document.createElement('div');
            controlText.style.color = 'rgb(25,25,25)';
            controlText.style.fontFamily = 'Roboto,Arial,sans-serif';
            controlText.style.fontSize = '16px';
            controlText.style.lineHeight = '24px';
            controlText.style.paddingLeft = '5px';
            controlText.style.paddingRight = '5px';
            controlText.innerHTML = text;
            controlUI.appendChild(controlText);
            controlUI.addEventListener("click", onclick);

            map.controls[google.maps.ControlPosition.TOP_CENTER].push(controlDiv);
        },

        featureBounds(features) {
            // Find the bounds of a set of features
            const bounds = new google.maps.LatLngBounds();
            features.forEach(ft => {
                ft.getGeometry().forEachLatLng(point => {
                    bounds.extend(point);
                });
            });
            return bounds;
        },

        zoomToFeatures() {
            // Zoom to see all features drawn on the map
            const bounds = this.featureBounds(map.data);
            if (bounds.isEmpty()){
                map.setCenter(new google.maps.LatLng(...this.$options.map_default_center));
                map.setZoom(this.$options.map_default_zoom);
            } else {
                map.fitBounds(bounds);
            }
        },
        drawLayer(geometry, raster) {

            // Bounds for the overlay object
            const overlayBounds = new google.maps.LatLngBounds(
                new google.maps.LatLng(raster.bounds[1], raster.bounds[0]),
                new google.maps.LatLng(raster.bounds[3], raster.bounds[2])
            );

            // Add overlay
            overlay = new google.maps.GroundOverlay(raster.image, overlayBounds, {map});
            this.$options.map_overlays.push(overlay);

            // Add geometry
            const features = map.data.addGeoJson({
                type: 'Feature',
                properties: {},
                geometry: geometry
            });

            // Include overlay and geometry in map bounds
            const mapBounds = new google.maps.LatLngBounds(
                overlayBounds.getSouthWest(),
                overlayBounds.getNorthEast()
            );
            mapBounds.union(this.featureBounds(features));
            map.fitBounds(mapBounds);
        },

        clear() {
            map.data.forEach(ft => {
                map.data.remove(ft);
            });
            while (this.$options.map_overlays.length){
                this.$options.map_overlays.pop().setMap(null);
            }
            // There has got to be a better way to force a redraw
            map.panBy(0, 1);
        }

    },

});


// Control Panel component
Vue.component('control-panel', {
    template: `
      <div>
      <div class="app-icon">
        <img :src="icon" alt="Snorkel Icon">
      </div>

      <label for="host_input">Host</label>
      <div>
        <input id="host_input"
               type="text"
               v-model="host"
               @keyup.enter="refreshCatalog">
        <select id="api_version_input" v-model="selected_api_version">
          <option v-for="item in api_versions" :value="item" :key="item">{{ item }}</option>
        </select>
        <input type="button" value="⟳ Load Catalog" @click="refreshCatalog">
      </div>

      <label for="layer_input">Layer</label>
      <select id="layer_input" v-model="layer">
        <option v-for="item in layers" :value="item" :key="item">{{ item }}</option>
      </select>

      <br>
      <label for="version_input">Version</label>
      <select id="version_input" v-model="version">
        <option v-for="item in versions" :value="item" :key="item">{{ item }}</option>
      </select>

      <br>
      <label for="geometry_input">Geometry</label>
      <select id="geometry_input" v-model="selected_geometry">
        <option value="custom">Custom</option>
        <option v-for="item in geometry_names" :value="item" :key="item">{{ item }}</option>
      </select>

      <textarea id="geometry_input"
                v-if="selected_geometry === 'custom'"
                @keyup.ctrl.enter="submitForm"
                v-model="custom_geometry"></textarea>

      <textarea v-else disabled
                :value="geometry | json"></textarea>

      <br>
      <input type="button" value="Submit" @click="submitForm" :disabled="!scuba.submitReady">
      <!-- </form> -->
      </div>`,

    props: ['icon', 'geometriesUrl', 'defaultHost'],

    filters: {
        json: JSON.stringify
    },

    data() {
        return {
            host: this.defaultHost,
            layer: '',
            version: '',

            api_versions: ['v1', 'v2'],
            selected_api_version: 'v2',

            selected_geometry: 'custom',
            custom_geometry: '',

            // Fetched from snorkel server
            geometries: {},

            // Fetched from target host
            catalog: {},
        };
    },

    computed: {
        layers() {
            return Object.keys(this.catalog);
        },
        versions() {
            if (this.layer && this.catalog[this.layer] && this.catalog[this.layer]['versions']) {
                return this.catalog[this.layer]['versions'];
            } else {
                return [];
            }
        },
        geometry() {
            if (this.selected_geometry === 'custom') {
                try {
                    return JSON.parse(this.custom_geometry);
                } catch (err) {
                    return this.custom_geometry;
                }
            } else {
                return this.geometries[this.selected_geometry];
            }
        },
        geometry_names() {
            return Object.keys(this.geometries);
        },
        submitReady() {
            return (this.layer && this.version && this.geometry);
        },

        scuba() {
            switch (this.selected_api_version) {
                case 'v1':
                    return {
                        catalogUrl: `${this.host}/catalog`,
                        maskUrl: `${this.host}/mask`,
                        payload: {
                            raster: this.layer,
                            geometry: this.geometry,
                            version: this.version,
                        },
                        submitReady:  (this.layer && this.version && this.geometry)
                    }
                case 'v2':
                    return {
                        catalogUrl: `${this.host}/v2/catalog`,
                        maskUrl: `${this.host}/v2/${this.layer}/mask`,
                        payload: {
                            geometry: this.geometry,
                            version: this.version,
                        },
                        submitReady: (this.version && this.geometry)
                    }
            }
        },

    },

    mounted: async function () {
        this.refreshCatalog();

        this.geometries = await (await fetch(this.geometriesUrl)).json();

        if (this.geometry_names.length > 0) {
            this.custom_geometry = JSON.stringify(this.geometries[Object.keys(this.geometries)[0]]);
        } else {
            this.custom_geometry = JSON.stringify({
                'type': 'Polygon',
                'coordinates': [[
                    [177.66712, -38.97675],
                    [177.70420, -38.97675],
                    [177.70420, -38.95206],
                    [177.66712, -38.95206],
                    [177.66712, -38.97675]
                ]]
            });
        }
    },

    watch: {
        layer: function () {
            this.version = this.versions[this.versions.length - 1];
        }
    },

    methods: {
        refreshCatalog: async function () {
            await this.fetchCatalog();
            // Find a layer which has versions
            for (let layer of this.layers) {
                if (this.catalog[layer]['versions'].length) {
                    this.layer = layer; break;
                }
            }
        },

        fetchCatalog: async function () {
            this.catalog = await (await fetch('/catalog', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    catalogUrl: this.scuba.catalogUrl,
                    //host: this.host,
                    //api_version: this.selected_api_version,
                })
            })).json();
        },

        fetchMask: async function() {
            return await (await fetch('/mask', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    maskUrl: this.scuba.maskUrl,
                    payload: this.scuba.payload
                })
            })).json();
        },

        submitForm: async function () {
            // RESPONSE FAKER
            function getFakeResponse(geometry){

                function getBoundingBox() {

                    // Only used for debug. Get the bounds from the response and delete this.
                    let bounds = {}, coordinates, latitude, longitude;
                    coordinates = geometry.coordinates;
                    if(geometry.type === 'Polygon'){
                        for (let j = 0; j < coordinates[0].length; j++) {
                            longitude = coordinates[0][j][0];
                            latitude  = coordinates[0][j][1];
                            bounds.xMin = bounds.xMin < longitude ? bounds.xMin : longitude;
                            bounds.xMax = bounds.xMax > longitude ? bounds.xMax : longitude;
                            bounds.yMin = bounds.yMin < latitude ? bounds.yMin : latitude;
                            bounds.yMax = bounds.yMax > latitude ? bounds.yMax : latitude;
                        }
                    } else if (geometry.type === 'MultiPolygon') {
                        for (let j = 0; j < coordinates.length; j++) {
                            for (let k = 0; k < coordinates[j][0].length; k++) {
                                longitude = coordinates[j][0][k][0];
                                latitude  = coordinates[j][0][k][1];
                                bounds.xMin = bounds.xMin < longitude ? bounds.xMin : longitude;
                                bounds.xMax = bounds.xMax > longitude ? bounds.xMax : longitude;
                                bounds.yMin = bounds.yMin < latitude ? bounds.yMin : latitude;
                                bounds.yMax = bounds.yMax > latitude ? bounds.yMax : latitude;
                        }
                        }
                    }
                    return [bounds.xMin, bounds.yMin, bounds.xMax, bounds.yMax];
                }
                // Static image located in the bounds of the input image
                return {
                    image: 'data:image/png;base64,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',
                    bounds: getBoundingBox(geometry),
                }
            }
            //----------------------------------------

            //const response = getFakeResponse(this.geometry);
            const response = await this.fetchMask();

            if (response.error !== undefined){
                alert(response.error);
                return;
            }

            // Raise an event for the main app to interop with google maps
            this.$emit('create-layer', {
                geometry: this.geometry,
                raster: {
                    image: response.image,
                    bounds: response.bounds,
                }
            });
        },
    }

})

// Main
// ---------------------------------------------------------------------------

let map;

const app = new Vue({
    el: '#app',

    mounted(){
        // Setup splitter
        initSeparator('H',
            document.getElementById('separator'),
            document.getElementById('map'),
            document.getElementById('panel'),
        );
    },

    methods: {
        // Triggered by create-layer event
        onControlPanelCreateLayer(e){
            this.$refs.googleMap.drawLayer(e.geometry, e.raster);
        }
    }

});


// Google Maps init callback
function initMap(){
    app.$refs.googleMap.initMap();
}
