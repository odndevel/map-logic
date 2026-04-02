## Guide

> [!IMPORTANT]
> 기존에 사용 중인 그라파나 인프라, Datasource 등이 준비되어 있는 상태에서 사용 가능
>
> 기존의 GitHub Page 사용에서 [jsDelivr](https://www.jsdelivr.com/github)로 CDN 링크 변경

### map-logic.js

> [!CAUTION]
> 해당 코드는 Business Text 플러그인 사용에 대한 코드
>
> 현재 해당 플러그인을 개발한 팀의 해체로 인해 추가 유지보수 X

<details>
<summary markdown="span">대시보드 프로비저닝 코드</summary>

- PC 패널 포지션, 사이즈 설정

  ```json
  "gridPos": {
    "h": 19,
    "w": 10,
    "x": 14,
    "y": 4
  },
  ```

- Mobile 패널 포지션, 사이즈 설정

  ```json
  "gridPos": {
    "h": 10,
    "w": 24,
    "x": 0,
    "y": 36
  },
  ```

```json
{
  "datasource": {
    "default": false,
    "type": "datasource",
    "uid": "-- Mixed --"
  },
  "fieldConfig": {
    "defaults": {
      "thresholds": {
        "mode": "absolute",
        "steps": [
          {
            "color": "green",
            "value": 0
          },
          {
            "color": "red",
            "value": 80
          }
        ]
      }
    },
    "overrides": []
  },
  "gridPos": {
    // PC, Mobile 환경에 맞는 수정 필요
    "h": 10,
    "w": 24,
    "x": 0,
    "y": 36
  },
  "id": 100,
  "interval": "5m",
  "options": {
    "afterRender": "const run = async () => {\n  // 라이브러리 로드\n  const { default: L } = await import(\"https://esm.sh/leaflet\");\n  window.L = L; // AwesomeMarkers 등을 위해 전역 할당\n  await import(\"https://esm.sh/leaflet.awesome-markers\");\n  await import(\"https://esm.sh/leaflet.markercluster\");\n\n  // 내 외부 파일 로드\n  const url = `https://cdn.jsdelivr.net/gh/odndevel/map-logic@main/dist/grafana/map-logic.js`;\n  const { renderMap } = await import(url);\n\n  renderMap(context, L);\n};\n\nrun().catch(console.error);",
    "content": "<!-- <div class=\"weather-icon\">\n  <img src=\"https://openweathermap.org/img/wn/50d@2x.png\"/>\n</div> -->\n\n<!-- <div class=\"status\">\n  <div class=\"status-icon\">\n    <span>Box Type</span>\n    <img src=\"https://odn-grafana-image-bucket.s3.ap-northeast-2.amazonaws.com/marker/connected-box.png\"></img>\n  </div>\n\n  <div class=\"status-icon\">\n    <span>Buoy Type</span>\n    <img src=\"https://odn-grafana-image-bucket.s3.ap-northeast-2.amazonaws.com/marker/connected-buoy.png\"></img>\n  </div>\n\n  <div class=\"status-icon\">\n    <span>Portable Type</span>\n    <img src=\"https://odn-grafana-image-bucket.s3.ap-northeast-2.amazonaws.com/marker/connected-portable.png\"></img>\n  </div>\n</div> -->\n\n<div id=\"leaflet\"></div>\n\n<!-- https://code.ionicframework.com/ionicons/1.5.2/css/ionicons.min.css -->",
    "contentPartials": [],
    "defaultContent": "The query didn't return any results.",
    "editor": {
      "format": "auto",
      "language": "html"
    },
    "editors": ["styles", "afterRender"],
    "externalScripts": [
      {
        "id": "e9b0a66d-ff42-4f92-88f9-019c753fc6fb",
        "url": "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      }
    ],
    "externalStyles": [
      {
        "id": "e06476d6-990f-4dcc-b513-4855cacfb369",
        "url": "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      },
      {
        "id": "5d20a345-affa-425b-90e9-80a5b268fca8",
        "url": "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css"
      },
      {
        "id": "977eb293-2b44-4e25-9389-4e20167c8dc7",
        "url": "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"
      },
      {
        "id": "0d8878ba-837e-4293-a9b6-a77f35b7ca55",
        "url": "https://unpkg.com/leaflet-gesture-handling@1.2.2//dist/leaflet-gesture-handling.css"
      },
      {
        "id": "a5063f9b-b9ce-48ae-9b1e-a7806c4abf6e",
        "url": "https://unpkg.com/leaflet.awesome-markers@2.0.5/dist/leaflet.awesome-markers.css"
      },
      {
        "id": "7cd55fcf-b695-4053-8981-cbc3e0bb8dcf",
        "url": "https://unpkg.com/font-awesome@4.7.0/css/font-awesome.css"
      },
      {
        "id": "85121089-4fb9-4fed-96e8-d3d8ffce66a5",
        "url": "https://code.ionicframework.com/ionicons/1.5.2/css/ionicons.min.css"
      },
      {
        "id": "1b2031c2-ec48-403c-b577-09b2a7cf99ff",
        "url": "https://unpkg.com/@neos21/bootstrap3-glyphicons@1.0.0/dist/css/bootstrap3-glyphicons.css"
      }
    ],
    "helpers": "",
    "renderMode": "data",
    "styles": "* {\n  font-family: Open Sans;\n}\n\n#leaflet {\n  width: 100%;\n  // height: 80vh;\n  height: ${Height}px;\n  border-radius: 10px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  align-self: center;\n}\n\n.status {\n  position: absolute;\n  // display: flex;\n  z-index: 999;\n  width: 180px;\n  // height: 20%;\n  left: 30px;\n  bottom: 30px;\n  background-color: rgba(0, 0, 0, 0.7);\n  border-radius: 10px;\n  // align-items: flex-end;\n  justify-content: space-around;\n  flex-direction: column;\n\n  > span {\n    font-weight: bold;\n    color: white;\n  }\n\n  @media screen and (max-width: 50rem) {\n    width: 25%;\n    height: 8%;\n\n    > span {\n      font-weight: bold;\n      color: white;\n      font-size: 12px;\n    }\n  }\n}\n\n.status-icon {\n  display: flex;\n  align-items: center;\n  margin: 5px 3px 5px 10px;\n  justify-content: space-between;\n\n  > span {\n    display: flex;\n  }\n\n  > img {\n    width: 35px;\n    display: flex;\n  }\n}\n\n.marker-cluster span {\n  color: black;\n  font-weight: bold;\n}\n\n.marker-cluster-small {\n  background-color: rgb(255, 128, 0);\n}\n\n.marker-cluster-small div {\n  background-color: rgb(255, 239, 196);\n}\n\n.marker-cluster-medium {\n  background-color: rgb(255, 128, 0);\n}\n\n.marker-cluster-medium div {\n  background-color: rgb(255, 239, 196);\n}\n\n.marker-cluster-large {\n  background-color: rgb(255, 128, 0);\n}\n\n.marker-cluster-large div {\n  background-color: rgb(255, 239, 196);\n}\n\n.awesome-marker {\n\t-webkit-transition: -webkit-transform 0.3s ease-out, opacity 0.3s ease-in;\n\t-moz-transition: -moz-transform 0.3s ease-out, opacity 0.3s ease-in;\n\t-o-transition: -o-transform 0.3s ease-out, opacity 0.3s ease-in;\n\ttransition: transform 0.3s ease-out, opacity 0.3s ease-in;\n}\n\n.awesome-marker-shadow {\n\t-webkit-transition: -webkit-transform 0.3s ease-out, opacity 0.3s ease-in;\n\t-moz-transition: -moz-transform 0.3s ease-out, opacity 0.3s ease-in;\n\t-o-transition: -o-transform 0.3s ease-out, opacity 0.3s ease-in;\n\ttransition: transform 0.3s ease-out, opacity 0.3s ease-in;\n}",
    "wrap": true
  },
  "pluginVersion": "6.0.0",
  "targets": [
    {
      "columns": [],
      "datasource": {
        "type": "yesoreyeram-infinity-datasource",
        "uid": "ddytvfy4bnaiof"
      },
      "filterExpression": "",
      "filters": [],
      "format": "table",
      "global_query_id": "",
      "hide": false,
      "parser": "backend",
      "refId": "shadows",
      "root_selector": "",
      "source": "url",
      "type": "json",
      "url": "/devices/shadows",
      "url_options": {
        "data": "",
        "method": "GET",
        "params": [
          {
            "key": "range",
            "value": "[0,999]"
          }
        ]
      }
    },
    {
      "columns": [],
      "datasource": {
        "type": "yesoreyeram-infinity-datasource",
        "uid": "ddytvfy4bnaiof"
      },
      "filters": [],
      "format": "table",
      "global_query_id": "",
      "hide": true,
      "refId": "A",
      "root_selector": "",
      "source": "url",
      "type": "json",
      "url": "/devices/${Sensor}/shadows/location",
      "url_options": {
        "data": "",
        "method": "GET"
      }
    }
  ],
  "title": "",
  "transparent": true,
  "type": "marcusolsson-dynamictext-panel"
}
```

</details>

### map-logic-v2.js

> [!NOTE]
> 해당 코드는 HTML graphics 플러그인 사용에 대한 코드

<details>
<summary markdown="span">대시보드 프로비저닝 코드</summary>

- PC 패널 포지션, 사이즈 설정

  ```json
  "gridPos": {
    "h": 19,
    "w": 10,
    "x": 14,
    "y": 4
  },
  ```

- Mobile 패널 포지션, 사이즈 설정

  ```json
  "gridPos": {
    "h": 10,
    "w": 24,
    "x": 0,
    "y": 36
  },
  ```

```json
{
  "datasource": {
    "type": "yesoreyeram-infinity-datasource",
    "uid": "ddytvfy4bnaiof"
  },
  "fieldConfig": {
    "defaults": {
      "color": {
        "mode": "thresholds"
      },
      "mappings": [],
      "thresholds": {
        "mode": "absolute",
        "steps": [
          {
            "color": "green",
            "value": 0
          },
          {
            "color": "red",
            "value": 80
          }
        ]
      }
    },
    "overrides": []
  },
  "gridPos": {
    // PC, Mobile 환경에 맞는 수정 필요
    "h": 19,
    "w": 10,
    "x": 14,
    "y": 4
  },
  "id": 100,
  "interval": "5m",
  "options": {
    "SVGBaseFix": true,
    "add100Percentage": true,
    "calcsMutation": "none",
    "centerAlignContent": true,
    "codeData": "{\n  \"text\": \"Random text\"\n}",
    "css": "@import url(\"https://unpkg.com/leaflet@1.9.4/dist/leaflet.css\");\n@import url(\"https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css\");\n@import url(\"https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css\");\n@import url(\"https://unpkg.com/leaflet-gesture-handling@1.2.2/dist/leaflet-gesture-handling.css\");\n@import url(\"https://unpkg.com/leaflet.awesome-markers@2.0.5/dist/leaflet.awesome-markers.css\");\n@import url(\"https://unpkg.com/font-awesome@4.7.0/css/font-awesome.css\");\n@import url(\"https://code.ionicframework.com/ionicons/1.5.2/css/ionicons.min.css\");\n@import url(\"https://unpkg.com/@neos21/bootstrap3-glyphicons@1.0.0/dist/css/bootstrap3-glyphicons.css\");\n\n.marker-cluster span {\n  color: black !important;\n  font-weight: bold;\n}\n\n/* 클러스터 색상 보정 */\n.marker-cluster-small, .marker-cluster-medium, .marker-cluster-large {\n  background-color: rgb(255, 128, 0) !important;\n}\n\n.marker-cluster-small div, .marker-cluster-medium div, .marker-cluster-large div {\n  background-color: rgb(255, 239, 196) !important;\n}\n\n/* 5. 애니메이션 효과 */\n.awesome-marker, .awesome-marker-shadow {\n  transition: transform 0.3s ease-out, opacity 0.3s ease-in;\n}\n\n/* 6. 미디어 쿼리 */\n@media screen and (max-width: 50rem) {\n  .status {\n    width: 25%;\n    height: 8%;\n  }\n  .status span {\n    font-size: 12px;\n  }\n}",
    "dynamicData": false,
    "dynamicFieldDisplayValues": false,
    "dynamicHtmlGraphics": false,
    "dynamicProps": false,
    "html": "<div id=\"leaflet\"></div>",
    "onInit": "// Sets the text from customProperties\nconst htmlgraphicsText = htmlNode.getElementById('htmlgraphics-text');\n\nif (htmlgraphicsText) {\n  htmlgraphicsText.textContent = customProperties.text;\n\n  // Change the text color based on the theme\n  if (theme.isDark) {\n    htmlgraphicsText.style.color = 'green';\n  } else {\n    htmlgraphicsText.style.color = 'red';\n  }\n}\n",
    "onInitOnResize": false,
    "onRender": "const runMap = async () => {\n  if (!data?.series?.[0]) return;\n\n  const url = `https://cdn.jsdelivr.net/gh/odndevel/map-logic@main/dist/grafana/map-logic-v2.js`;\n  const { renderMap } = await import(url);\n\n  const mapElement = htmlNode.querySelector(\"#leaflet\");\n  if (!mapElement) return;\n\n  renderMap({\n    series: data.series[0], \n    grafana: {\n      replaceVariables: (str) => getTemplateSrv().replace(str),\n      locationService: {\n        partial: (params, replace = true) => {\n          const formattedParams = {};\n          for (const key in params) {\n            const cleanKey = key.replace('var-', '');\n            formattedParams[`var-${cleanKey}`] = params[key];\n          }\n          if (htmlGraphics.locationService?.partial) {\n            htmlGraphics.locationService.partial(formattedParams, replace);\n          }\n        }\n      }\n    },\n    element: mapElement\n  });\n};\n\nrunMap().catch(console.error);\nhtmlNode.addEventListener('panelupdate', runMap);",
    "overflow": "visible",
    "panelupdateOnMount": true,
    "reduceOptions": {
      "calcs": []
    },
    "renderOnMount": true,
    "rootCSS": "/* 1. 폰트 설정 */\n#leaflet * {\n  font-family: 'Open Sans', sans-serif;\n}\n\n/* 2. 지도 컨테이너 - 변수 문법 대신 calc나 고정값 사용 */\n#leaflet {\n  width: 100%;\n  /* JS에서 var-Height 변수를 넘겨준다면 아래와 같이 활용 가능 */\n  height: 600px; \n  border-radius: 10px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  align-self: center;\n}\n\n/* 3. 상태 표시창 */\n.status {\n  position: absolute;\n  z-index: 999;\n  width: 180px;\n  left: 30px;\n  bottom: 30px;\n  background-color: rgba(0, 0, 0, 0.7);\n  border-radius: 10px;\n  justify-content: space-around;\n  flex-direction: column;\n}\n\n.status span {\n  font-weight: bold;\n  color: white;\n}\n\n/* 4. 아이콘 및 마커 클러스터 스타일 */\n.status-icon {\n  display: flex;\n  align-items: center;\n  margin: 5px 3px 5px 10px;\n  justify-content: space-between;\n}\n\n.status-icon span {\n  display: flex;\n}\n\n.status-icon img {\n  width: 35px;\n  display: flex;\n}\n\n",
    "useGrafanaScrollbar": false
  },
  "pluginVersion": "2.2.3",
  "targets": [
    {
      "columns": [],
      "datasource": {
        "type": "yesoreyeram-infinity-datasource",
        "uid": "ddytvfy4bnaiof"
      },
      "filterExpression": "",
      "filters": [],
      "format": "table",
      "global_query_id": "",
      "parser": "backend",
      "refId": "shadows",
      "root_selector": "",
      "source": "url",
      "type": "json",
      "url": "/devices/shadows",
      "url_options": {
        "data": "",
        "method": "GET",
        "params": [
          {
            "key": "range",
            "value": "[0,999]"
          }
        ]
      }
    },
    {
      "columns": [],
      "datasource": {
        "type": "yesoreyeram-infinity-datasource",
        "uid": "ddytvfy4bnaiof"
      },
      "filters": [],
      "format": "table",
      "global_query_id": "",
      "hide": true,
      "parser": "simple",
      "refId": "A",
      "root_selector": "",
      "source": "url",
      "type": "json",
      "url": "/devices/${Sensor}/shadows/location",
      "url_options": {
        "data": "",
        "method": "GET"
      }
    }
  ],
  "title": "",
  "transparent": true,
  "type": "gapit-htmlgraphics-panel"
},
```

</details>

### Development

- 개발용(로컬) Grafana의 맵 패널 편집을 통해 진행
- 기존의 CDN URL -> localhost:5500으로 변경
  - VS Code의 Extension [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) 사용
  - VS Code Setting 수정 필요
    ```json
    {
      "liveServer.settings.headers": { "Access-Control-Allow-Origin": "*" }
    }
    ```
- 코드 수정 후 즉시 캐시 삭제/갱신
  [Purge jsDelivr CDN cache](https://www.jsdelivr.com/tools/purge) -> 해당 링크 사용
