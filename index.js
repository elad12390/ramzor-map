function xmlParser(xml) {
    $('#load').fadeOut();
}

const x2js = new X2JS();
proj4.defs("EPSG:2039","+proj=tmerc +lat_0=31.73439361111111 +lon_0=35.20451694444445 +k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 +towgs84=-48,55,52,0,0,0,0 +units=m +no_defs");
const markers = [];
let currZoom = 10;
let hidden = false;
let mappedSettlements = [];
const HIDE_ZOOM_LEVEL = 11;

var mymap = L.map('map').setView({lon: 34.8371548872487, lat: 31.85776786709163}, currZoom);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>'
  }).addTo(mymap);
L.marker({lon: 0, lat: 0}).bindPopup('The center of the world').addTo(mymap);

async function fetchSettlementsFromApi() {
    const locationsUrlApi = `./CITY.xml`;
    const locations = await fetch(locationsUrlApi);
    console.log(locations);
    return await locations.text();
}
async function ramzorSettlementsFromApi() {
    const apiKey = "718ff8c3-84ae-4ea8-b686-101cf98f343f";
    const apiUrl = `https://data.gov.il/api/3/action/datastore_search?resource_id=${apiKey}&limit=2000`
    const locations = await fetch(apiUrl);
    return await locations.json();
}
async function getSettlementsAndExtract() {
    const settlements = await fetchSettlementsFromApi();
    const extracted = x2js.xml_str2json(settlements).Workspace.WorkspaceData.DatasetData.Data.Records.Record.map(item => {
        return {
            name: item.Values.Value[4].__text,
            code: parseInt(item.Values.Value[3].__text),
            coords: proj4('EPSG:2039', 'WGS84' ,{x: parseFloat(item.Values.Value[1].X), y: parseFloat(item.Values.Value[1].Y)}),
        };
    })
    const ramzor = (await ramzorSettlementsFromApi()).result.records;
    const merged = _u.merge(_u.keyBy(extracted, 'name'), _u.keyBy(ramzor, 'city_desc'))
    const values = _u.values(merged)
    console.log(values);
    return values;
}

getSettlementsAndExtract().then((values) => {
    mappedSettlements = values;
    values.map(val => {
        if (!val.coords || _u.isNaN(parseFloat(val.score))) return;
        const score = parseFloat(val.score);
        console.log();
        let color = "00000000";
        switch(val.colour_Calc) {
            case 'כתום':
                color = '#FFA500';
                break;
            case 'אדום':
                color = '#FF0000'
                break;
            case 'צהוב':
                color = '#FFFF00'
                break;
            case 'ירוק':
                color = '#00FF00'
                break;
        }
        var marker = L.marker([val.coords.y,val.coords.x], {opacity: .5, riseOnHover: true}).bindPopup(val.name + ` ציון: ${score}/10`).addTo(mymap);
        marker.on('click', (e) => {
            mymap.setView([val.coords.y,val.coords.x], 14);
            currZoom = 14;
        })
        markers.push(marker);
        L.circle([val.coords.y,val.coords.x], {radius: 500, color}).addTo(mymap);
    })
})

mymap.on('zoom', (e) => {
    const zoom = mymap.getZoom();
    if (!!zoom) {
        currZoom = zoom;
    }
    
    if (currZoom < 10 && hidden == false) {
        console.log('test');
        for (i = 0; i < markers.length; i++) {
            markers[i].options.opacity = 0;
            markers[i]._updateOpacity()
        }
        hidden = true;
    } else if (hidden == true && currZoom > 10) {
        console.log('test');
        for (i = 0; i < markers.length; i++) {
            markers[i].options.opacity = .5;
            markers[i]._updateOpacity()
        }
        hidden = false;
    }
})

$('#search').change(() => {
    const value = $('#search').val();
    console.log(mappedSettlements[0])
    const foundSettlement = mappedSettlements.find(a => !!a.city_desc && a.city_desc.includes(value));
    console.log(foundSettlement.coords);
    mymap.flyTo([foundSettlement.coords.y, foundSettlement.coords.x],14);
});