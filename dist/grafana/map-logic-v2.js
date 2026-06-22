export async function renderMap({ series, grafana, element }) {
  const { default: L } = await import("https://esm.sh/leaflet");
  window.L = L;
  await Promise.all([
    import("https://esm.sh/leaflet.awesome-markers"),
    import("https://esm.sh/leaflet.markercluster"),
  ]);

  const selectedSensor = grafana.replaceVariables("${Sensor}");
  const removeMarker = grafana.replaceVariables("${MapMarker:text}");

  const processedData = [];
  const deviceMap = new Map();

  const fields = series.fields;
  const rowCount = fields[0].values.length;

  for (let i = 0; i < rowCount; i++) {
    const row = {};
    for (const f of fields) {
      row[f.name] = f.values.buffer ? f.values.buffer[i] : f.values[i];
    }

    try {
      row.parsedLocation = JSON.parse(row.location);
    } catch (e) {
      continue;
    }

    const coords = row.parsedLocation.geometry.coordinates;
    const isGpsError = !coords[0] || !coords[1];
    const isExcluded = removeMarker.includes(row.device_id);

    if (!isGpsError && !isExcluded) {
      processedData.push(row);
      const key = `${coords[0]},${coords[1]}`;
      deviceMap.set(key, row);
    }
  }

  if (element.leafletMap) {
    element.leafletMap.remove();
  }
  const map = L.map(element, {
    scrollWheelZoom: true,
    zoomControl: true,
    dragging: true,
  });
  element.leafletMap = map;

  if (processedData.length > 0) {
    const bounds = processedData.map((d) => [
      d.parsedLocation.geometry.coordinates[1],
      d.parsedLocation.geometry.coordinates[0],
    ]);
    map.fitBounds(bounds);
    if (map.getZoom() > 10) map.setZoom(10);
  }

  L.tileLayer("https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
    attribution: "Image &copy;TerraMetrics, Map Data &copy;TMap Mobility",
    maxZoom: 18,
  }).addTo(map);

  const getIconSettings = (device) => {
    const isSelected = selectedSensor === device.device_id;
    const isConnected = device.connection;
    const type = device.device_type;

    const config = {
      mount: "archive",
      buoy: "life-ring",
      portable: "briefcase",
      default: "cube",
    };
    const icon = config[type] || config.default;

    let markerColor = isConnected
      ? isSelected
        ? "orange"
        : "beige"
      : isSelected
        ? "gray"
        : "lightgray";

    return { icon, markerColor, prefix: "fa" };
  };

  const markers = L.markerClusterGroup({
    polygonOptions: {
      fillColor: "#ffefc4",
      color: "#ff8000",
      opacity: 1,
      fillOpacity: 0.5,
    },
    iconCreateFunction: (cluster) => {
      const childMarkers = cluster.getAllChildMarkers();
      let connectedCount = 0;
      let hasSelectedMarker = false;
      let selectedMarkerStatus = "disconnected";

      childMarkers.forEach((m) => {
        const d = m.options.deviceData;
        if (d.connection) connectedCount++;
        if (d.device_id === selectedSensor) {
          hasSelectedMarker = true;
          selectedMarkerStatus = d.connection ? "connected" : "disconnected";
        }
      });

      const totalCount = cluster.getChildCount();
      const connectedPercent = (connectedCount / totalCount) * 100;
      const selectedStatusIcon = hasSelectedMarker
        ? `<div style="position: absolute; top: -5px; right: -5px; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white; background: ${selectedMarkerStatus === "connected" ? "rgb(255, 128, 0)" : "#575757"}; z-index: 10;"></div>`
        : "";

      // Extracted helper function for creating the cluster icon
      const createClusterIcon = () => {
        const gradientColor =
          100 - connectedPercent === 100 ? "white" : "rgb(255, 239, 196)";
        const clusterContent = `<div style="background: ${gradientColor}; width: 60%; height: 60%; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; color: black !important;">${totalCount}</div>`;

        return L.divIcon({
          html: `<div style="position: relative; width: 40px; height: 40px; background: conic-gradient(rgb(255, 128, 0) 0% ${connectedPercent}%, #575757 ${connectedPercent}% 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid white;">
                   ${clusterContent}
                   ${selectedStatusIcon}
                 </div>`,
          className: "leaflet-cluster-icon",
          iconSize: [40, 40],
        });
      };

      return createClusterIcon();
    },
  });

  const geoLayer = L.geoJSON(
    processedData.map((d) => d.parsedLocation),
    {
      pointToLayer: (feature, latlng) => {
        const coords = feature.geometry.coordinates;
        const device = deviceMap.get(`${coords[0]},${coords[1]}`);
        if (!device) return null;

        const iconOptions = getIconSettings(device);
        return L.marker(latlng, {
          icon: L.AwesomeMarkers.icon(iconOptions),
          deviceData: device,
        });
      },
    },
  );

  markers.addLayer(geoLayer);
  map.addLayer(markers);

  markers.on("click", (e) => {
    const device = e.layer.options.deviceData;
    if (device && selectedSensor !== device.device_id) {
      grafana.locationService.partial({ Sensor: device.device_id }, true);
    }
  });

  markers.on("mouseover", (e) => {
    const device = e.layer.options.deviceData;
    if (device) {
      e.layer
        .bindPopup(
          `<p style="text-align: center; line-height: 1.5; color: black;"><b>Alias : ${device.alias || "null"}</b><br><b>Type : ${device.device_type || "null"}</b></p>`,
        )
        .openPopup();
    }
  });

  markers.on("mouseout", (e) => e.layer.closePopup());

  markers.on("clustermouseover", (e) => {
    const connectedCount = e.layer
      .getAllChildMarkers()
      .filter((m) => m.options.deviceData?.connection).length;

    e.layer
      .bindPopup(
        `<p style="text-align: center; color: black;"><b>Connected : ${connectedCount}</b></p>`,
      )
      .openPopup();
  });

  markers.on("clustermouseout", (e) => e.layer.closePopup());

  grafana.locationService.partial(
    { "var-Height": (element?.clientHeight || 0) - 20 },
    true,
  );
  setTimeout(() => map.invalidateSize(), 200);
}
