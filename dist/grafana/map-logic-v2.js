/**
 * Grafana Business Text - Leaflet Map Logic
 */
export function renderMap(context, L) {
  const { data, grafana, element } = context;

  // 기본 설정값
  const openstreetmapLayer =
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const googleMapLayer = "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";
  const mapAttribution =
    "Image &copy;TerraMetrics, Map Data &copy;TMap Mobility";

  const selectedSensor = grafana.replaceVariables("${Sensor}");
  const removeMarker = grafana.replaceVariables("${MapMarker:text}");

  // 데이터 필터링 (원본 로직 유지)
  const removeFilter = data[0].filter(
    (x) => !removeMarker.includes(x.device_id),
  );

  // 패널 높이 조절
  grafana.locationService.partial(
    {
      "var-Height": element?.clientHeight - 20,
    },
    true,
  );

  // pointToLayer 함수 (원본 로직 유지)
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

    let customIcon;
    if (filter.connection) {
      customIcon =
        selectedSensor === filter.device_id
          ? iconOptions.selectedConnected
          : iconOptions.connected;
    } else {
      customIcon =
        selectedSensor === filter.device_id
          ? iconOptions.selectedDisconnected
          : iconOptions.disconnected;
    }

    return L.marker(latlng, { icon: L.AwesomeMarkers.icon(customIcon) });
  };

  /**
   * Cleanup & Initialize (this.map 에러 해결)
   */
  if (element.leafletMap) {
    element.leafletMap.remove();
  }

  const map = L.map(element, {
    // 넘겨받은 element(div)를 직접 사용
    scrollWheelZoom: true,
    zoomControl: true,
    dragging: true,
  });

  element.leafletMap = map; // element에 저장하여 cleanup 시 사용

  // fitBounds (원본 로직 유지)
  const bounds = removeFilter
    .map((res) => {
      const loc = JSON.parse(res.location);
      return loc.geometry.coordinates[0] !== 0 &&
        loc.geometry.coordinates[1] !== 0
        ? [loc.geometry.coordinates[1], loc.geometry.coordinates[0]] // [lat, lng]
        : null;
    })
    .filter((b) => b !== null);

  if (bounds.length > 0) {
    map.fitBounds(bounds);
    const zoom = map.getZoom();
    map.setZoom(zoom > 10 ? 10 : zoom);
  }

  L.tileLayer(googleMapLayer, {
    attribution: mapAttribution,
    maxZoom: 18,
  }).addTo(map);

  const geojson = removeFilter.map((res) => JSON.parse(res.location));

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
              marker.feature.geometry.coordinates[0] &&
            loc.geometry.coordinates[1] ===
              marker.feature.geometry.coordinates[1]
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
      const disconnectedPercent = 100 - connectedPercent;

      const selectedStatusIcon = hasSelectedMarker
        ? `<div style="position: absolute; top: -5px; right: -5px; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white; background: ${selectedMarkerStatus === "connected" ? "rgb(255, 128, 0)" : "#575757"}; z-index: 10;"></div>`
        : "";

      return L.divIcon({
        html: `
          <div style="position: relative; width: 40px; height: 40px; background: conic-gradient(rgb(255, 128, 0) 0% ${connectedPercent}%, #575757 ${connectedPercent}% 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid white;">
            <div style="background: ${disconnectedPercent === 100 ? `white` : `rgb(255, 239, 196)`}; width: 60%; height: 60%; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; color: black !important;">${totalCount}</div>
            ${selectedStatusIcon}
          </div>`,
        className: "leaflet-cluster-icon",
        iconSize: L.point(40, 40),
      });
    },
  });

  const markerLayer = L.geoJSON(geojson, {
    pointToLayer: (feature, latlng) => pointToLayer(feature, latlng),
  });

  markers.addLayer(markerLayer);
  map.addLayer(markers);

  // Event Listeners (원본 팝업 및 변수 변경 로직 유지)
  markers.bindPopup(function (layer) {
    const filter = data[0].find((res) => {
      const loc = JSON.parse(res.location);
      return (
        loc.geometry.coordinates[0] === layer.feature.geometry.coordinates[0] &&
        loc.geometry.coordinates[1] === layer.feature.geometry.coordinates[1]
      );
    });
    if (filter) {
      grafana.locationService.partial({ "var-Sensor": filter.device_id }, true);
    }
  });

  markers.on("mouseover", function (e) {
    const filter = data[0].find((res) => {
      const loc = JSON.parse(res.location);
      return (
        loc.geometry.coordinates[0] ===
          e.layer.feature.geometry.coordinates[0] &&
        loc.geometry.coordinates[1] === e.layer.feature.geometry.coordinates[1]
      );
    });
    if (filter) {
      e.layer
        .bindPopup(
          `<p style="text-align: center; line-height: 1.2;"><b>Alias : ${filter.alias || "null"}</b><br><b>Type : ${filter.device_type || "null"}</b></p>`,
        )
        .openPopup();
    }
  });

  markers.on("mouseout", (e) => e.layer.closePopup());

  markers.on("clustermouseover", function (e) {
    const childMarkers = e.layer.getAllChildMarkers();
    let connectedCount = 0;
    childMarkers.forEach((m) => {
      const dev = data[0].find(
        (d) =>
          JSON.parse(d.location).geometry.coordinates[0] ===
          m.feature.geometry.coordinates[0],
      );
      if (dev?.connection) connectedCount++;
    });
    e.layer
      .bindPopup(
        `<p style="text-align: center;"><b>Connected : ${connectedCount}</b></p>`,
      )
      .openPopup();
  });

  markers.on("clustermouseout", (e) => e.layer.closePopup());
}
