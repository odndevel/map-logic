/**
 * Grafana Leaflet Map Logic (Refactored)
 */

// 1. 설정값 관리
const CONFIG = {
  layers: {
    osm: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    google: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
  },
  attribution: "Image &copy;TerraMetrics, Map Data &copy;TMap Mobility",
  icons: {
    mount: "archive",
    buoy: "life-ring",
    portable: "briefcase",
    default: "cube",
  },
  colors: {
    selected: "orange",
    connected: "beige",
    disconnected: "lightgray",
    error: "gray",
    clusterBg: "rgb(255, 239, 196)",
    clusterPrimary: "rgb(255, 128, 0)",
    clusterDark: "#575757",
  },
};

// 2. 헬퍼 함수: 마커 아이콘 설정
const getMarkerConfig = (type, connected, selected) => {
  const icon = CONFIG.icons[type] || CONFIG.icons.default;
  let markerColor = CONFIG.colors.error;

  if (connected) {
    markerColor = selected ? CONFIG.colors.selected : CONFIG.colors.connected;
  } else {
    markerColor = selected ? CONFIG.colors.error : CONFIG.colors.disconnected;
  }

  return { icon, markerColor, prefix: "fa" };
};

// 3. 메인 렌더링 함수
export async function renderMap(context, L) {
  const { data, grafana, element } = context;
  const selectedSensor = grafana.replaceVariables("${Sensor}");
  const removeMarker = grafana.replaceVariables("${MapMarker:text}");

  // 데이터 전처리: 반복적인 JSON.parse 방지
  const processedData = data[0]
    .filter((x) => !removeMarker.includes(x.device_id))
    .map((item) => ({
      ...item,
      parsedLocation: JSON.parse(item.location),
    }));

  if (this.map) this.map.remove();

  // 지도 초기화
  const map = L.map("leaflet", { scrollWheelZoom: true }).fitBounds(
    processedData.map((d) =>
      [...d.parsedLocation.geometry.coordinates].reverse(),
    ),
  );

  const zoom = map.getZoom();
  map.setZoom(zoom > 10 ? 10 : zoom);
  this.map = map;

  L.tileLayer(CONFIG.layers.google, {
    attribution: CONFIG.attribution,
    maxZoom: 18,
  }).addTo(map);

  // 마커 클러스터 설정
  const markers = L.markerClusterGroup({
    polygonOptions: {
      fillColor: "#ffefc4",
      color: "#ff8000",
      opacity: 1,
      fillOpacity: 0.5,
    },
    iconCreateFunction: (cluster) => {
      const children = cluster.getAllChildMarkers();
      let connectedCount = 0;
      let hasSelected = false;
      let selectedStatus = "disconnected";

      children.forEach((m) => {
        const device = processedData.find(
          (d) =>
            d.parsedLocation.geometry.coordinates[0] ===
            m.feature.geometry.coordinates[0],
        );
        if (device?.connection) connectedCount++;
        if (device?.device_id === selectedSensor) {
          hasSelected = true;
          selectedStatus = device.connection ? "connected" : "disconnected";
        }
      });

      const total = cluster.getChildCount();
      const percent = (connectedCount / total) * 100;
      const statusColor =
        selectedStatus === "connected"
          ? CONFIG.colors.clusterPrimary
          : CONFIG.colors.clusterDark;

      return L.divIcon({
        html: `
          <div style="position:relative; width:40px; height:40px; border-radius:50%; border:1px solid white;
                      background:conic-gradient(${CONFIG.colors.clusterPrimary} ${percent}%, ${CONFIG.colors.clusterDark} ${percent}% 100%);
                      display:flex; align-items:center; justify-content:center;">
            <div style="background:${percent === 0 ? "white" : CONFIG.colors.clusterBg}; width:60%; height:60%; 
                        border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px;">
              ${total}
            </div>
            ${hasSelected ? `<div style="position:absolute; top:-5px; right:-5px; width:10px; height:10px; border-radius:50%; border:2px solid white; background:${statusColor}; z-index:10;"></div>` : ""}
          </div>`,
        className: "leaflet-cluster-icon",
        iconSize: L.point(40, 40),
      });
    },
  });

  // 개별 마커 생성
  const geojson = L.geoJSON(
    processedData.map((d) => d.parsedLocation),
    {
      pointToLayer: (feature, latlng) => {
        const filter = processedData.find(
          (d) =>
            d.parsedLocation.geometry.coordinates[0] ===
            feature.geometry.coordinates[0],
        );
        if (!filter || filter.parsedLocation.geometry.coordinates[0] === 0)
          return null;

        const icon = L.AwesomeMarkers.icon(
          getMarkerConfig(
            filter.device_type,
            filter.connection,
            selectedSensor === filter.device_id,
          ),
        );
        return L.marker(latlng, { icon });
      },
    },
  );

  markers.addLayer(geojson);
  map.addLayer(markers);

  // 이벤트 바인딩
  markers.on("mouseover", (e) => {
    const filter = processedData.find(
      (d) =>
        d.parsedLocation.geometry.coordinates[0] ===
        e.layer.feature.geometry.coordinates[0],
    );
    if (filter) {
      e.layer
        .bindPopup(
          `<p style="text-align:center;"><b>Alias: ${filter.alias || "None"}</b><br><b>Type: ${filter.device_type}</b></p>`,
        )
        .openPopup();
    }
  });

  markers.on("mouseout", (e) => e.layer.closePopup());

  // 높이 업데이트
  grafana.locationService.partial(
    {
      "var-Height": element.parentElement.parentElement.clientHeight - 20,
    },
    true,
  );
}
