/**
 * Grafana HTML Graphics - Leaflet Map Logic (V3)
 */
export function renderMap(context, L) {
  const { data, grafana, element } = context;

  // 기본 설정값
  const googleMapLayer = "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";
  const mapAttribution =
    "Image &copy;TerraMetrics, Map Data &copy;TMap Mobility";

  const selectedSensor = grafana.replaceVariables("${Sensor}");
  const removeMarker = grafana.replaceVariables("${MapMarker:text}");

  // 데이터 필터링
  const removeFilter = data[0].filter(
    (x) => !removeMarker.includes(x.device_id),
  );

  /**
   * [핵심 수정 1] 패널 높이 조절
   * element.parentElement 참조는 불안정하므로 안전한 참조 방식으로 변경
   */
  const parentHeight = element?.clientHeight || 500;
  grafana.locationService.partial({ "var-Height": parentHeight - 20 });

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
    if (!locData.geometry.coordinates[0] || !locData.geometry.coordinates[1])
      return null;

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

  /**
   * [핵심 수정 2] Cleanup & Initialize
   * element(이미 #leaflet임) 내부에서 또 찾지 않고 element 자체를 사용
   */
  if (element.leafletMap) {
    element.leafletMap.remove();
  }

  // element가 이미 div이므로 바로 전달
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
      const selectedStatusIcon = hasSelectedMarker
        ? `<div style="position: absolute; top: -5px; right: -5px; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white; background: ${selectedMarkerStatus === "connected" ? "rgb(255, 128, 0)" : "#575757"}; z-index: 10;"></div>`
        : "";

      return L.divIcon({
        html: `<div style="position: relative; width: 40px; height: 40px; background: conic-gradient(rgb(255, 128, 0) 0% ${connectedPercent}%, #575757 ${connectedPercent}% 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid white;">
                 <div style="background: ${connectedPercent === 0 ? `white` : `rgb(255, 239, 196)`}; width: 60%; height: 60%; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; color: black !important;">${totalCount}</div>
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

  /**
   * [핵심 수정 3] 이벤트 리스너 - 팝업 내 텍스트 컬러 보정 및 변수 변경 호출
   */
  markers.bindPopup(function (layer) {
    const filter = data[0].find((res) => {
      const loc = JSON.parse(res.location);
      return (
        loc.geometry.coordinates[0] === layer.feature.geometry.coordinates[0] &&
        loc.geometry.coordinates[1] === layer.feature.geometry.coordinates[1]
      );
    });
    if (filter) {
      // 변수 변경 시도 (JS 탭에서 주입된 partial 호출)
      grafana.locationService.partial({ "var-Sensor": filter.device_id });
      return `<div style="color: black; text-align: center;"><b>Alias : ${filter.alias || "null"}</b><br><b>Type : ${filter.device_type || "null"}</b></div>`;
    }
  });

  markers.on("mouseover", (e) => e.layer.openPopup());
  markers.on("mouseout", (e) => e.layer.closePopup());

  // 타일 깨짐 방지
  setTimeout(() => map.invalidateSize(), 200);
}
