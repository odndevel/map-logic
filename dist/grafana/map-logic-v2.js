/**
 * Grafana HTML Graphics - Leaflet Map Logic (ReferenceError 수정)
 */
export async function renderMap({ series, grafana, element }) {
  const { default: L } = await import("https://esm.sh/leaflet");
  window.L = L;

  await Promise.all([
    import("https://esm.sh/leaflet.awesome-markers"),
    import("https://esm.sh/leaflet.markercluster"),
  ]);

  const rowCount = series.fields[0].values.length;
  const formattedData = [];
  for (let i = 0; i < rowCount; i++) {
    let row = {};
    series.fields.forEach(
      (f) => (row[f.name] = f.values.buffer ? f.values.buffer[i] : f.values[i]),
    );
    formattedData.push(row);
  }
  const data = [formattedData];

  const googleMapLayer = "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";
  const mapAttribution =
    "Image &copy;TerraMetrics, Map Data &copy;TMap Mobility";

  const selectedSensor = grafana.replaceVariables("${Sensor}");
  const removeMarker = grafana.replaceVariables("${MapMarker:text}");
  const removeFilter = data[0].filter(
    (x) => !removeMarker.includes(x.device_id),
  );

  grafana.locationService.partial(
    { "var-Height": element?.clientHeight - 20 },
    true,
  );

  const pointToLayer = (feature, latlng) => {
    const filter = removeFilter.find((res) => {
      const loc = JSON.parse(res.location);
      return (
        loc.geometry.coordinates[0] === feature.geometry.coordinates[0] &&
        loc.geometry.coordinates[1] === feature.geometry.coordinates[1]
      );
    });

    if (!filter) return null;
    const locData = JSON.parse(filter.location);
    const findGpsError =
      (locData.geometry.coordinates[0] === 0 ||
        locData.geometry.coordinates[0] === null) &&
      (locData.geometry.coordinates[1] === 0 ||
        locData.geometry.coordinates[1] === null);

    if (findGpsError) return null;

    /**
     * 사용 가능한 마커 색상:
     * 'red', 'darkred', 'orange', 'green', 'darkgreen', 'blue', 'purple', 'darkpurple',
     * 'cadetblue', 'beige', 'white', 'pink', 'lightblue', 'lightgreen', 'gray', 'black', 'lightgray'
     *
     * 사용 가능한 아이콘 (Font Awesome prefix 'fa' 사용 시):
     * 'home', 'user', 'flag', 'info-circle', 'exclamation-triangle', 'check', 'cube',
     * 'life-ring', 'archive', 'briefcase', 'bolt', 'camera', 'microchip', 등 Font Awesome 아이콘명
     */
    const changeType = (type, connected, selected) => {
      const prefix = "fa";
      let markerColor = "gray";
      const config = {
        mount: "archive",
        buoy: "life-ring",
        portable: "briefcase",
        default: "cube",
      };
      const icon = config[type] || config.default;
      if (connected) {
        markerColor = selected ? "orange" : "beige";
      } else {
        markerColor = selected ? "gray" : "lightgray";
      }
      return { icon, markerColor, prefix };
    };

    const iconOptions = {
      connected: { ...changeType(filter.device_type, true, false) },
      disconnected: { ...changeType(filter.device_type, false, false) },
      selectedConnected: { ...changeType(filter.device_type, true, true) },
      selectedDisconnected: { ...changeType(filter.device_type, false, true) },
    };

    let customIcon = filter.connection
      ? selectedSensor === filter.device_id
        ? iconOptions.selectedConnected
        : iconOptions.connected
      : selectedSensor === filter.device_id
        ? iconOptions.selectedDisconnected
        : iconOptions.disconnected;

    return L.marker(latlng, { icon: L.AwesomeMarkers.icon(customIcon) });
  };

  if (element.leafletMap) element.leafletMap.remove();
  const map = L.map(element, {
    scrollWheelZoom: true,
    zoomControl: true,
    dragging: true,
  });
  element.leafletMap = map;

  const bounds = removeFilter
    .map((res) => {
      const loc = JSON.parse(res.location);
      return [loc.geometry.coordinates[1], loc.geometry.coordinates[0]];
    })
    .filter((b) => b[0] !== 0);
  if (bounds.length > 0) {
    map.fitBounds(bounds);
    const zoom = map.getZoom();
    map.setZoom(zoom > 10 ? 10 : zoom);
  }

  L.tileLayer(googleMapLayer, {
    attribution: mapAttribution,
    maxZoom: 18,
  }).addTo(map);

  const markers = L.markerClusterGroup({
    polygonOptions: {
      fillColor: "#ffefc4",
      color: "#ff8000",
      opacity: 1,
      fillOpacity: 0.5,
    },
    iconCreateFunction: function (cluster) {
      const childMarkers = cluster.getAllChildMarkers();
      let connectedCount = 0;
      let hasSelectedMarker = false;
      let selectedMarkerStatus = "disconnected";

      childMarkers.forEach((marker) => {
        const device = data[0].find((res) => {
          const loc = JSON.parse(res.location);
          return (
            loc.geometry.coordinates[0] ===
            marker.feature.geometry.coordinates[0]
          );
        });
        if (device) {
          if (device.connection) connectedCount++;
          if (device.device_id === selectedSensor) {
            hasSelectedMarker = true;
            selectedMarkerStatus = device.connection
              ? "connected"
              : "disconnected";
          }
        }
      });

      const totalCount = cluster.getChildCount();
      const connectedPercent = (connectedCount / totalCount) * 100;
      const selectedStatusIcon = hasSelectedMarker
        ? `<div style="position: absolute; top: -5px; right: -5px; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white; background: ${selectedMarkerStatus === "connected" ? "rgb(255, 128, 0)" : "#575757"}; z-index: 10;"></div>`
        : "";

      return L.divIcon({
        html: `<div style="position: relative; width: 40px; height: 40px; background: conic-gradient(rgb(255, 128, 0) 0% ${connectedPercent}%, #575757 ${connectedPercent}% 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid white;">
                 <div style="background: ${100 - connectedPercent === 100 ? `white` : `rgb(255, 239, 196)`}; width: 60%; height: 60%; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; color: black !important;">${totalCount}</div>
                 ${selectedStatusIcon}
               </div>`,
        className: "leaflet-cluster-icon",
        iconSize: [40, 40],
      });
    },
  });

  markers.addLayer(
    L.geoJSON(
      removeFilter.map((res) => JSON.parse(res.location)),
      { pointToLayer },
    ),
  );
  map.addLayer(markers);

  // 클릭 이벤트 (변수 변경)
  markers.on("click", function (e) {
    const filter = data[0].find((res) => {
      const loc = JSON.parse(res.location);
      return (
        loc.geometry.coordinates[0] ===
          e.layer.feature.geometry.coordinates[0] &&
        loc.geometry.coordinates[1] === e.layer.feature.geometry.coordinates[1]
      );
    });
    if (filter && selectedSensor !== filter.device_id) {
      grafana.locationService.partial({ Sensor: filter.device_id }, true);
    }
  });

  // 마우스 오버 팝업
  markers.on("mouseover", function (e) {
    const filter = data[0].find(
      (res) =>
        JSON.parse(res.location).geometry.coordinates[0] ===
        e.layer.feature.geometry.coordinates[0],
    );
    if (filter) {
      e.layer
        .bindPopup(
          `<p style="text-align: center; line-height: 1.5; color: black;"><b>Alias : ${filter.alias || "null"}</b><br><b>Type : ${filter.device_type || "null"}</b></p>`,
        )
        .openPopup();
    }
  });

  markers.on("mouseout", (e) => e.layer.closePopup());

  markers.on("clustermouseover", function (e) {
    let connectedCount = 0;
    e.layer.getAllChildMarkers().forEach((m) => {
      const dev = data[0].find(
        (d) =>
          JSON.parse(d.location).geometry.coordinates[0] ===
          m.feature.geometry.coordinates[0],
      );
      if (dev?.connection) connectedCount++;
    });
    e.layer
      .bindPopup(
        `<p style="text-align: center; color: black;"><b>Connected : ${connectedCount}</b></p>`,
      )
      .openPopup();
  });

  markers.on("clustermouseout", (e) => e.layer.closePopup());
  setTimeout(() => map.invalidateSize(), 200);
}
