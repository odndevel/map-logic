/**
 * Grafana HTML Graphics - Leaflet Map Logic
 */
export function renderMap(context, L) {
  const { data, grafana, element } = context;

  const openstreetmapLayer =
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const googleMapLayer = "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";
  const mapAttribution =
    "Image &copy;TerraMetrics, Map Data &copy;TMap Mobility";

  const selectedSensor = grafana.replaceVariables("${Sensor}");
  const removeMarker = grafana.replaceVariables("${MapMarker:text}");

  const removeFilter = data[0].filter(
    (x) => !removeMarker.includes(x.device_id),
  );

  // 1. 패널 높이 조절 (HTML Graphics는 변수 변경 시 패널이 리렌더링되므로 주의 필요)
  // 만약 무한 루프가 발생한다면 이 부분은 주석 처리하세요.
  grafana.locationService.partial({ "var-Height": element?.clientHeight - 20 });

  const pointToLayer = (feature, latlng) => {
    const filter = removeFilter.find((res) => {
      const loc = JSON.parse(res.location);
      return (
        loc.geometry.coordinates[0] === feature.geometry.coordinates[0] &&
        loc.geometry.coordinates[1] === feature.geometry.coordinates[1]
      );
    });

    if (!filter) return null;

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

    const customIcon = filter.connection
      ? selectedSensor === filter.device_id
        ? iconOptions.selectedConnected
        : iconOptions.connected
      : selectedSensor === filter.device_id
        ? iconOptions.selectedDisconnected
        : iconOptions.disconnected;

    return L.marker(latlng, { icon: L.AwesomeMarkers.icon(customIcon) });
  };

  if (element.leafletMap) {
    element.leafletMap.remove();
  }

  const map = L.map(element, {
    scrollWheelZoom: true,
    zoomControl: true,
    dragging: true,
  });

  element.leafletMap = map;

  const bounds = removeFilter
    .map((res) => {
      const loc = JSON.parse(res.location);
      return loc.geometry.coordinates[0] !== 0 &&
        loc.geometry.coordinates[1] !== 0
        ? [loc.geometry.coordinates[1], loc.geometry.coordinates[0]]
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
  });

  const markerLayer = L.geoJSON(geojson, {
    pointToLayer: (feature, latlng) => pointToLayer(feature, latlng),
  });

  markers.addLayer(markerLayer);
  map.addLayer(markers);

  // 2. [중요] 마커 클릭 시 팝업과 변수 변경 연동
  // bindPopup 내부에서 partial을 호출하면 팝업이 뜰 때 변수가 바뀝니다.
  markers.bindPopup(function (layer) {
    const filter = data[0].find((res) => {
      const loc = JSON.parse(res.location);
      return (
        loc.geometry.coordinates[0] === layer.feature.geometry.coordinates[0] &&
        loc.geometry.coordinates[1] === layer.feature.geometry.coordinates[1]
      );
    });

    if (filter) {
      // 변수 변경 요청 (JS 탭에서 정의한 partial 호출)
      grafana.locationService.partial({ "var-Sensor": filter.device_id });
      return `<p style="text-align: center; color: black;"><b>Alias : ${filter.alias || "null"}</b><br><b>Type : ${filter.device_type || "null"}</b></p>`;
    }
    return "No Data";
  });

  markers.on("mouseover", (e) => e.layer.openPopup());
  markers.on("mouseout", (e) => e.layer.closePopup());

  // 클러스터 팝업 로직 (생략 가능)
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
        `<p style="text-align: center; color: black;"><b>Connected : ${connectedCount}</b></p>`,
      )
      .openPopup();
  });
  markers.on("clustermouseout", (e) => e.layer.closePopup());
}
