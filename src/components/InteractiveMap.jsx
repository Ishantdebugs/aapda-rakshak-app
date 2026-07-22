import React, { useState, useEffect, useRef } from "react";
import { translations } from "../utils/translations";
import { 
  Plus, Minus, RefreshCw, MapPin, Shield, ShieldCheck, 
  Flame, Droplets, Activity, AlertTriangle, Navigation, WifiOff,
  ChevronDown, ChevronUp, ExternalLink, Heart, User, CloudRain, Wind, Thermometer
} from "lucide-react";

export default function InteractiveMap({ 
  language, 
  incidents, 
  responders, 
  camps, 
  activeSOS, 
  assignedIncidentId,
  role,
  offline,
  userLocation,
  locationPermission = "prompt",
  gpsAccuracy = null,
  locationError = null,
  requestGpsAccess,
  familyMembers = [],
  nearbyVolunteers = []
}) {
  const t = translations[language];

  // Map DOM Reference & Instances
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);         // static markers (incidents, camps, SOS, user, family)
  const circlesRef = useRef([]);         // circles (safe zones, SOS radius, GPS accuracy)
  const responderMarkersRef = useRef({}); // keyed by responder id for in-place setLatLng updates
  const routingPolylineRef = useRef(null);
  const hasCentredRef = useRef(false);
  const hasPagedToSOSRef = useRef(false);
  const hasFittedBoundsRef = useRef(null);
  const tileLayerRef = useRef(null);

  // Map loading states
  const [leafletLoaded, setLeafletLoaded] = useState(!!window.L);
  
  // Tactical SVG viewport fallback states
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  
  // Filtering states
  const [filterType, setFilterType] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  
  // Selected marker inspector details
  const [selectedEntity, setSelectedEntity] = useState(null);

  // GPS Portal Open State
  const [portalOpen, setPortalOpen] = useState(false);

  // Map Mode State (dark, satellite, terrain)
  const [mapMode, setMapMode] = useState("dark");

  // Himachal Pradesh IMD Weather & District state
  const HP_DISTRICTS = [
    { name: "Shimla (HQ)", lat: 31.1048, lng: 77.1734, alert: "orange", desc: "IMD Orange Alert: Heavy Rain & Landslide Prone" },
    { name: "Kangra (Dharamshala)", lat: 32.2190, lng: 76.3234, alert: "red", desc: "IMD Red Alert: Flash Flood Warning" },
    { name: "Kullu (Manali)", lat: 32.2432, lng: 77.1892, alert: "orange", desc: "IMD Orange Alert: Cloudburst Risk" },
    { name: "Mandi", lat: 31.7087, lng: 76.9320, alert: "yellow", desc: "IMD Yellow Watch: Thunderstorms" },
    { name: "Solan", lat: 30.9045, lng: 77.0967, alert: "yellow", desc: "IMD Yellow Watch: Moderate Rainfall" },
    { name: "Chamba", lat: 32.5534, lng: 76.1258, alert: "orange", desc: "IMD Orange Alert: Landslide Hazard" },
    { name: "Kinnaur", lat: 31.5373, lng: 78.2710, alert: "yellow", desc: "IMD Yellow Watch: High Altitude Rockfalls" },
    { name: "Lahaul & Spiti", lat: 32.5710, lng: 77.1740, alert: "green", desc: "IMD Green: Weather Normal" },
    { name: "Una", lat: 31.4685, lng: 76.2708, alert: "green", desc: "IMD Green: Clear Weather" },
    { name: "Bilaspur", lat: 31.3302, lng: 76.7562, alert: "yellow", desc: "IMD Yellow Watch: Isolated Heavy Spells" },
    { name: "Hamirpur", lat: 31.6862, lng: 76.5213, alert: "green", desc: "IMD Green: Weather Normal" },
    { name: "Sirmaur (Nahan)", lat: 30.5599, lng: 77.2955, alert: "yellow", desc: "IMD Yellow Watch: Thunderstorms" },
  ];
  const [selectedHpDistrict, setSelectedHpDistrict] = useState(HP_DISTRICTS[0]);

  // Road routing coordinates state
  const [roadRouteCoordinates, setRoadRouteCoordinates] = useState([]);

  // Weather States
  const [showWeather, setShowWeather] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);

  // SVG Fallback Dimensions
  const mapWidth = 800;
  const mapHeight = 500;

  // Filter calculations
  const filteredIncidents = incidents.filter(inc => {
    const matchesType = filterType === "all" || inc.category === filterType;
    const matchesSeverity = filterSeverity === "all" || inc.severity === filterSeverity;
    return matchesType && matchesSeverity && inc.status !== "resolved";
  });

  // Dynamic Leaflet Script & CSS Injection Loader
  useEffect(() => {
    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    // Inject Leaflet CSS
    const styleId = "leaflet-css-style";
    if (!document.getElementById(styleId)) {
      const link = document.createElement("link");
      link.id = styleId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Inject Leaflet JS Script
    const scriptId = "leaflet-js-script";
    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      const handleLoad = () => setLeafletLoaded(true);
      existingScript.addEventListener("load", handleLoad);
      return () => existingScript.removeEventListener("load", handleLoad);
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => {
      setLeafletLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  // ─── Weather Data Fetching ────────────────────────────────────────────────────
  useEffect(() => {
    if (!showWeather) return;

    const fetchWeather = async () => {
      setWeatherLoading(true);
      try {
        // Default to selected Himachal Pradesh district, or user position / map center
        let lat = selectedHpDistrict.lat;
        let lng = selectedHpDistrict.lng;
        
        if (userLocation) {
          lat = userLocation.lat;
          lng = userLocation.lng;
        } else if (mapInstanceRef.current) {
          const center = mapInstanceRef.current.getCenter();
          lat = center.lat;
          lng = center.lng;
        }

        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m,precipitation&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum&timezone=auto&forecast_days=5`);
        if (!res.ok) throw new Error("Failed to fetch weather");
        const data = await res.json();
        setWeatherData({ current: data.current, daily: data.daily });
      } catch (err) {
        console.error("Weather fetch error:", err);
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchWeather();
  }, [showWeather, userLocation, selectedHpDistrict]);

  // Safe zones registry
  const safeZones = [
    { id: "sz1", name: language === "hi" ? "सेंट्रल पार्क सेफ ज़ोन" : "Central Park Safe Zone", x: 250, y: 150, radius: 60, description: language === "hi" ? "बाढ़ मुक्त समतल क्षेत्र" : "Elevated flat terrain free of floods." },
    { id: "sz2", name: language === "hi" ? "उत्तर पहाड़ी शिविर" : "North Hill Camp", x: 620, y: 100, radius: 45, description: language === "hi" ? "भूकंप शरणार्थी शिविर" : "Earthquake high-ground refuge site." }
  ];

  // Helper variables for routing animations
  const assignedIncident = assignedIncidentId === "sos-distress"
    ? activeSOS
    : incidents.find(inc => inc.id === assignedIncidentId);
  const activeUserResponder = responders.find(r => r.id === "resp-self" || r.id === 1);

  // ─── Effect 1: Map Initialization ────────────────────────────────────────────
  // Runs once when Leaflet loads. Creates the map instance and zoom control.
  useEffect(() => {
    if (offline || !leafletLoaded || !mapRef.current) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      return;
    }
    if (mapInstanceRef.current) return; // already initialized

    const initialCenter = userLocation || { lat: 31.1048, lng: 77.1734 };
    mapInstanceRef.current = window.L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([initialCenter.lat, initialCenter.lng], 13.5);

    window.L.control.zoom({ position: 'bottomleft' }).addTo(mapInstanceRef.current);
  }, [leafletLoaded, offline]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Effect 2: Tile Layer ─────────────────────────────────────────────────────
  // Only re-runs when the map mode (dark / satellite / terrain) changes.
  // Swapping tiles does NOT clear any markers.
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletLoaded || offline) return;
    const map = mapInstanceRef.current;

    const tileUrls = {
      dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      terrain: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    };

    if (tileLayerRef.current) tileLayerRef.current.remove();
    tileLayerRef.current = window.L.tileLayer(tileUrls[mapMode], { maxZoom: 19 }).addTo(map);
  }, [mapMode, leafletLoaded, offline]);

  // ─── Effect 3: Static Markers & Circles ──────────────────────────────────────
  // Re-renders incidents, camps, SOS, safe zones, user dot, family, volunteers.
  // Responder markers are intentionally excluded here — managed separately below
  // so their movement animation never triggers a full marker wipe.
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletLoaded || offline) return;
    const map = mapInstanceRef.current;

    // Clear only static markers & circles (NOT responder markers)
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    circlesRef.current.forEach(c => c.remove());
    circlesRef.current = [];

    // ── User Live Position Dot ──
    if (userLocation) {
      const userIcon = window.L.divIcon({
        className: 'user-location-pulse-wrapper',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;">
            <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background-color: #3b82f6; opacity: 0.4; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: absolute; width: 14px; height: 14px; border-radius: 50%; background-color: #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.4);">
              <div style="width: 10px; height: 10px; border-radius: 50%; background-color: #3b82f6;"></div>
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      const userMarker = window.L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).addTo(map);
      const userAccuracy = window.L.circle([userLocation.lat, userLocation.lng], {
        radius: gpsAccuracy || 200,
        color: '#3b82f6', weight: 1, fillColor: '#3b82f6', fillOpacity: 0.05
      }).addTo(map);
      markersRef.current.push(userMarker);
      circlesRef.current.push(userAccuracy);
    }

    // ── Safe Zones ──
    safeZones.forEach(sz => {
      const szLat = sz.id === "sz1" ? 28.6120 : 28.6280;
      const szLng = sz.id === "sz1" ? 77.2100 : 77.1950;
      const safeCircle = window.L.circle([szLat, szLng], {
        radius: sz.id === "sz1" ? 500 : 400,
        color: '#22c55e', weight: 1.5, fillColor: '#22c55e', fillOpacity: 0.08
      }).addTo(map);
      safeCircle.on("click", () => setSelectedEntity({ type: "safe_zone", ...sz, lat: szLat, lng: szLng, coords: `${szLat.toFixed(4)}, ${szLng.toFixed(4)}` }));
      circlesRef.current.push(safeCircle);
    });

    // ── Active SOS Beacon ──
    if (activeSOS && activeSOS.status !== "resolved") {
      const sosLat = activeSOS.lat || 28.6139;
      const sosLng = activeSOS.lng || 77.2090;
      const sosCircle = window.L.circle([sosLat, sosLng], {
        radius: 600, color: '#dc2626', weight: 2.5, fillColor: '#dc2626', fillOpacity: 0.12
      }).addTo(map);
      const sosIcon = window.L.divIcon({
        className: 'sos-location-pulse-wrapper',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
            <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background-color: #dc2626; opacity: 0.45; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: absolute; width: 20px; height: 20px; border-radius: 50%; background-color: #ffffff; display: flex; align-items: center; justify-content: center; border: 2px solid #dc2626; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">
              <div style="width: 10px; height: 10px; border-radius: 50%; background-color: #dc2626;"></div>
            </div>
          </div>
        `,
        iconSize: [36, 36], iconAnchor: [18, 18]
      });
      const sosMarker = window.L.marker([sosLat, sosLng], { icon: sosIcon }).addTo(map);
      sosMarker.on("click", () => setSelectedEntity({
        type: "sos",
        name: language === "hi" ? "नागरिक एसओएस संकट" : "Active SOS Distress Call",
        description: t.sosDispatching, lat: sosLat, lng: sosLng,
        coords: `${sosLat.toFixed(4)}, ${sosLng.toFixed(4)}`
      }));
      circlesRef.current.push(sosCircle);
      markersRef.current.push(sosMarker);
      if (!hasPagedToSOSRef.current) {
        map.panTo([sosLat, sosLng]);
        hasPagedToSOSRef.current = true;
      }
    }
    if (!activeSOS || activeSOS.status === "resolved") hasPagedToSOSRef.current = false;

    // ── Incident Markers ──
    filteredIncidents.forEach(inc => {
      const incLat = inc.lat || 28.6139;
      const incLng = inc.lng || 77.2090;
      const isHigh = inc.severity === "high";
      const incIcon = window.L.divIcon({
        className: 'custom-incident-icon',
        html: `<div style="background-color: ${isHigh ? '#dc2626' : '#ea580c'}; color: white; width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 13px; box-shadow: 0 2px 6px rgba(0,0,0,0.4); font-weight: bold;">⚠️</div>`,
        iconSize: [28, 28], iconAnchor: [14, 14]
      });
      const marker = window.L.marker([incLat, incLng], { icon: incIcon }).addTo(map);
      marker.on("click", () => setSelectedEntity({ type: "incident", ...inc, lat: incLat, lng: incLng, coords: `${incLat.toFixed(4)}, ${incLng.toFixed(4)}` }));
      markersRef.current.push(marker);
    });

    // ── Relief Camps ──
    camps.forEach(camp => {
      const campLat = camp.lat || 28.6120;
      const campLng = camp.lng || 77.2100;
      const isFull = (camp.bedsOccupied / camp.beds) >= 0.9;
      const campIcon = window.L.divIcon({
        className: 'custom-camp-icon',
        html: `<div style="background-color: ${isFull ? '#ea580c' : '#2563eb'}; color: white; width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 13px; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">⛺</div>`,
        iconSize: [28, 28], iconAnchor: [14, 14]
      });
      const marker = window.L.marker([campLat, campLng], { icon: campIcon }).addTo(map);
      marker.on("click", () => setSelectedEntity({ type: "camp", ...camp, lat: campLat, lng: campLng, coords: `${campLat.toFixed(4)}, ${campLng.toFixed(4)}` }));
      markersRef.current.push(marker);
    });

    // ── Family Members (Citizen only) ──
    if (role === "citizen" && familyMembers && familyMembers.length > 0) {
      familyMembers.forEach(member => {
        if (member.relation === "Self" || !member.lat) return;
        const isSafe = member.status === "safe";
        const initial = member.name.charAt(0);
        const famIcon = window.L.divIcon({
          className: 'custom-family-icon',
          html: `<div style="background-color: ${isSafe ? '#10b981' : '#f97316'}; color: white; width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.4); text-transform: uppercase;">${initial}</div>`,
          iconSize: [28, 28], iconAnchor: [14, 14]
        });
        const marker = window.L.marker([member.lat, member.lng], { icon: famIcon }).addTo(map);
        marker.on("click", () => setSelectedEntity({
          type: "family_member",
          name: `${member.name} (${member.relation})`,
          description: `Status: ${member.status.toUpperCase()} (Updated at ${member.time})`,
          coords: `${member.lat.toFixed(4)}, ${member.lng.toFixed(4)}`,
          lat: member.lat, lng: member.lng
        }));
        markersRef.current.push(marker);
      });
    }

    // ── Nearby Volunteers (Citizen only) ──
    if (role === "citizen" && nearbyVolunteers && nearbyVolunteers.length > 0) {
      nearbyVolunteers.forEach(vol => {
        if (!vol.lat) return;
        const volIcon = window.L.divIcon({
          className: 'custom-volunteer-icon',
          html: `<div style="background-color: #2563eb; color: white; width: 26px; height: 26px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">🙋🏽‍♂️</div>`,
          iconSize: [26, 26], iconAnchor: [13, 13]
        });
        const marker = window.L.marker([vol.lat, vol.lng], { icon: volIcon }).addTo(map);
        marker.on("click", () => setSelectedEntity({
          type: "local_volunteer",
          name: `${vol.name} (Volunteer)`,
          description: `Services: ${vol.service}\nSupplies: ${vol.supplies}`,
          phone: vol.phone,
          coords: `${vol.lat.toFixed(4)}, ${vol.lng.toFixed(4)}`,
          lat: vol.lat, lng: vol.lng
        }));
        markersRef.current.push(marker);
      });
    }

  }, [leafletLoaded, offline, filteredIncidents, camps, activeSOS, filterType, filterSeverity, userLocation, gpsAccuracy, familyMembers, mapMode, nearbyVolunteers, role]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Effect 4: Responder Markers — in-place position updates ─────────────────
  // This effect NEVER removes/re-creates markers. Instead it:
  //  • Creates a marker the first time a responder is seen (keyed by id)
  //  • Calls setLatLng() to smoothly move the existing marker when position changes
  // This is what eliminates the flicker during routing animation.
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletLoaded || offline) return;
    const map = mapInstanceRef.current;
    const currentIds = new Set(responders.map(r => String(r.id)));

    // Remove markers for responders that no longer exist
    Object.keys(responderMarkersRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        responderMarkersRef.current[id].remove();
        delete responderMarkersRef.current[id];
      }
    });

    responders.forEach(resp => {
      const respLat = resp.lat || 28.6110;
      const respLng = resp.lng || 77.2012;
      const isBusy = resp.status === "busy";
      const idKey = String(resp.id);

      if (responderMarkersRef.current[idKey]) {
        // ✅ Marker already exists — just move it smoothly, no flicker
        responderMarkersRef.current[idKey].setLatLng([respLat, respLng]);
      } else {
        // First time: create and store the marker
        const respIcon = window.L.divIcon({
          className: 'custom-resp-icon',
          html: `<div style="background-color: ${isBusy ? '#3b82f6' : '#10b981'}; color: white; width: 26px; height: 26px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">🚒</div>`,
          iconSize: [26, 26], iconAnchor: [13, 13]
        });
        const marker = window.L.marker([respLat, respLng], { icon: respIcon }).addTo(map);
        marker.on("click", () => setSelectedEntity({
          type: "responder", ...resp,
          lat: respLat, lng: respLng,
          coords: `${respLat.toFixed(4)}, ${respLng.toFixed(4)}`
        }));
        responderMarkersRef.current[idKey] = marker;
      }
    });
  }, [leafletLoaded, offline, responders]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Effect 5: Routing Polyline ───────────────────────────────────────────────
  // Only redraws the route line when coordinates or assignment changes.
  // All other marker updates are fully independent of this.
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletLoaded || offline) return;
    const map = mapInstanceRef.current;

    // Always remove the old polyline first
    if (routingPolylineRef.current) {
      routingPolylineRef.current.remove();
      routingPolylineRef.current = null;
    }

    if (!assignedIncidentId) {
      hasFittedBoundsRef.current = null;
      return;
    }

    // Responder routing to incident
    if (role === "responder" && assignedIncident && activeUserResponder) {
      const path = roadRouteCoordinates.length > 0
        ? roadRouteCoordinates
        : [[activeUserResponder.lat, activeUserResponder.lng], [assignedIncident.lat, assignedIncident.lng]];

      const polyline = window.L.polyline(path, {
        color: '#3b82f6', weight: 5, opacity: 0.85, dashArray: '10, 10'
      }).addTo(map);
      routingPolylineRef.current = polyline;

      // Fit bounds only once per new assignment
      if (hasFittedBoundsRef.current !== assignedIncident.id) {
        map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
        hasFittedBoundsRef.current = assignedIncident.id;
      }
    }

    // Citizen SOS dispatched routing line
    if (role === "citizen" && activeSOS && activeSOS.status === "dispatched" && activeUserResponder) {
      const path = roadRouteCoordinates.length > 0
        ? roadRouteCoordinates
        : [[activeUserResponder.lat, activeUserResponder.lng], [activeSOS.lat, activeSOS.lng]];

      const polyline = window.L.polyline(path, {
        color: '#10b981', weight: 5, opacity: 0.85, dashArray: '10, 10'
      }).addTo(map);
      routingPolylineRef.current = polyline;
    }
  }, [leafletLoaded, offline, assignedIncidentId, roadRouteCoordinates, role, activeSOS]); // eslint-disable-line react-hooks/exhaustive-deps

  // Smoothly center map when Geolocation loads first position
  useEffect(() => {
    if (mapInstanceRef.current && userLocation && !hasCentredRef.current) {
      mapInstanceRef.current.panTo([userLocation.lat, userLocation.lng]);
      hasCentredRef.current = true;
    }
  }, [userLocation, leafletLoaded]);

  // Fetch real road route geometry from OSRM API
  useEffect(() => {
    if (offline || !leafletLoaded) {
      setRoadRouteCoordinates([]);
      return;
    }

    let startLat = null;
    let startLng = null;
    let endLat = null;
    let endLng = null;

    if (role === "responder" && assignedIncident && activeUserResponder) {
      startLat = activeUserResponder.lat || 28.6110;
      startLng = activeUserResponder.lng || 77.2012;
      endLat = assignedIncident.lat || 28.6139;
      endLng = assignedIncident.lng || 77.2090;
    } else if (role === "citizen" && activeSOS && activeSOS.status === "dispatched" && activeUserResponder) {
      startLat = activeUserResponder.lat || 28.6110;
      startLng = activeUserResponder.lng || 77.2012;
      endLat = activeSOS.lat || 28.6139;
      endLng = activeSOS.lng || 77.2090;
    }

    if (startLat && startLng && endLat && endLng) {
      const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
      
      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (data.routes && data.routes[0] && data.routes[0].geometry) {
            const coords = data.routes[0].geometry.coordinates.map(pt => [pt[1], pt[0]]);
            setRoadRouteCoordinates(coords);
          } else {
            setRoadRouteCoordinates([]);
          }
        })
        .catch(err => {
          console.warn("OSRM routing request failed, using straight line fallback.", err);
          setRoadRouteCoordinates([]);
        });
    } else {
      setRoadRouteCoordinates([]);
    }
  }, [assignedIncidentId, activeSOS, offline, leafletLoaded, responders, role]);

  // Fallback map zoom triggers
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.75));
  const handleResetMap = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setSelectedEntity(null);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col relative shadow-xl">
      {/* Dynamic Keyframes Animation Injection */}
      <style>{`
        @keyframes ping {
          0% { transform: scale(1); opacity: 0.8; }
          70%, 100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>

      {/* Map Control Header */}
      <div className="bg-slate-50 dark:bg-slate-950/80 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-red-500 animate-pulse" />
          <span className="text-sm font-extrabold text-slate-900 dark:text-white">{t.mapTitle}</span>
          {offline ? (
            <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded bg-red-950 text-red-400 font-bold border border-red-900/50 uppercase">
              <WifiOff className="w-2.5 h-2.5" />
              Offline Fallback Grid
            </span>
          ) : (
            <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-900/50 uppercase">
              Live OpenStreetMap
            </span>
          )}
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-red-500 cursor-pointer touch-target"
          >
            <option value="all">{t.mapFilterAll}</option>
            <option value="flood">{t.mapFilterFloods}</option>
            <option value="fire">{t.mapFilterFires}</option>
            <option value="earthquake">{t.mapFilterEarthquakes}</option>
            <option value="medical">{language === "hi" ? "चिकित्सा आपातकाल" : "Medical"}</option>
          </select>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-red-500 cursor-pointer touch-target"
          >
            <option value="all">{t.mapFilterSeverityAll}</option>
            <option value="high">{language === "hi" ? "गंभीर (High)" : "High Severity Only"}</option>
          </select>

          {/* Map Mode Selector */}
          {!offline && (
            <>
              <select
                value={mapMode}
                onChange={(e) => setMapMode(e.target.value)}
                className="bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-red-500 cursor-pointer touch-target font-bold"
              >
                <option value="dark">🌐 {language === "hi" ? "डार्क मोड" : "Tactical Dark"}</option>
                <option value="satellite">📡 {language === "hi" ? "सैटेलाइट" : "Satellite view"}</option>
                <option value="terrain">⛰️ {language === "hi" ? "टेरेन" : "Terrain Map"}</option>
              </select>

              <button
                onClick={() => setShowWeather(!showWeather)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer touch-target ${showWeather ? "bg-blue-600/20 border-blue-500 text-blue-400 shadow-md shadow-blue-500/20" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300"}`}
              >
                <CloudRain className="w-3.5 h-3.5" />
                {language === "hi" ? "मौसम" : "Weather"}
              </button>
            </>
          )}

          {offline && (
            <>
              <div className="h-6 w-[1px] bg-slate-100 dark:bg-slate-800 mx-1"></div>
              {/* Zoom Buttons (Only for SVG offline tactical map) */}
              <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-0.5">
                <button
                  onClick={handleZoomOut}
                  title="Zoom Out"
                  className="p-1 hover:bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white rounded transition-colors touch-target cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] text-slate-500 dark:text-slate-500 font-mono w-8 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  title="Zoom In"
                  className="p-1 hover:bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white rounded transition-colors touch-target cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={handleResetMap}
                title="Reset Map View"
                className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:border-slate-300 dark:border-slate-700 rounded-lg transition-all cursor-pointer touch-target"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Canvas rendering container */}
      <div className="flex-1 bg-slate-50 dark:bg-slate-950 relative overflow-hidden select-none min-h-[350px] md:min-h-[420px]">
        
        {/* ONLINE STATE: LIVE OPENSTREETMAPS LEAFLET */}
        {!offline && leafletLoaded && (
          <>
            <div 
              ref={mapRef} 
              className="w-full h-full absolute inset-0 z-0"
            ></div>
            
            {/* GPS Recenter Control */}
            {userLocation && (
              <button
                onClick={() => {
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.panTo([userLocation.lat, userLocation.lng]);
                    mapInstanceRef.current.setZoom(14.5);
                  }
                }}
                title={language === "hi" ? "मेरी स्थिति पर केंद्रित करें" : "Recenter on My Location"}
                className="absolute top-4 right-4 bg-slate-50 dark:bg-slate-950/95 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-blue-450 hover:text-slate-900 dark:text-white transition-all cursor-pointer shadow-lg z-10 touch-target hover:border-blue-500 flex items-center justify-center"
              >
                <Navigation className="w-5 h-5" />
              </button>
            )}

            {/* GPS Signal Status Portal Widget */}
            <div className="absolute top-16 right-4 z-10">
              <div className="bg-slate-50 dark:bg-slate-950/95 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg transition-all overflow-hidden max-w-[260px] w-[200px] md:w-[240px]">
                
                {/* Header Pill */}
                <button
                  onClick={() => setPortalOpen(!portalOpen)}
                  className="flex items-center gap-2 px-3 py-2 text-[10px] font-extrabold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white cursor-pointer w-full text-left focus:outline-none"
                >
                  <span className={`w-2 h-2 rounded-full ${
                    locationPermission === "granted" ? "bg-emerald-500 animate-pulse" :
                    locationPermission === "denied" ? "bg-red-500" : "bg-amber-500"
                  }`}></span>
                  <span className="flex-1 uppercase tracking-wider">
                    GPS: {locationPermission === "granted" ? "LIVE LOCK" : locationPermission.toUpperCase()}
                  </span>
                  {portalOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-500 dark:text-slate-500" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-500" />
                  )}
                </button>

                {/* Collapsible Details Body */}
                {portalOpen && (
                  <div className="p-3 border-t border-slate-300 dark:border-slate-900 bg-slate-50 dark:bg-slate-950/50 space-y-2 text-[10px] text-slate-500 dark:text-slate-450 font-mono">
                    <div className="flex justify-between border-b border-slate-300 dark:border-slate-900/60 pb-1">
                      <span>Signal Lock:</span>
                      <span className={locationPermission === "granted" ? "text-emerald-400" : "text-red-400"}>
                        {locationPermission === "granted" ? "STABLE" : "STANDBY"}
                      </span>
                    </div>
                    {userLocation ? (
                      <>
                        <div className="flex justify-between border-b border-slate-300 dark:border-slate-900/60 pb-1">
                          <span>Latitude:</span>
                          <span className="text-slate-900 dark:text-white">{userLocation.lat.toFixed(5)}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-300 dark:border-slate-900/60 pb-1">
                          <span>Longitude:</span>
                          <span className="text-slate-900 dark:text-white">{userLocation.lng.toFixed(5)}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-300 dark:border-slate-900/60 pb-1">
                          <span>Accuracy:</span>
                          <span className="text-slate-900 dark:text-white">±{gpsAccuracy ? gpsAccuracy.toFixed(1) : "15"}m</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-red-400 leading-normal mb-1">
                        {locationPermission === "denied" ? (
                          <div className="space-y-1 text-slate-700 dark:text-slate-300 font-sans">
                            <p className="text-red-400 font-bold font-mono text-[9px] uppercase">Permission Denied</p>
                            <p className="leading-relaxed text-[9px]">Click the padlock/settings icon in your browser address bar next to the URL and change Location to "Allow" to restore live tracking.</p>
                          </div>
                        ) : (
                          locationError || "No GPS coordinates lock. Grant browser access."
                        )}
                      </div>
                    )}
                    
                    <button
                      onClick={requestGpsAccess}
                      className="w-full mt-1 py-1 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 hover:border-blue-500 text-blue-400 hover:text-white rounded-lg transition-all font-sans font-bold cursor-pointer text-center text-[9px] uppercase tracking-widest"
                    >
                      Refresh Signal
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Weather & IMD Early Warning Overlay Portal */}
            {showWeather && (
              <div className="absolute top-16 left-4 z-10 animate-fadeIn">
                <div className="bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md border border-blue-900/50 rounded-xl shadow-2xl transition-all overflow-hidden p-3 w-[220px]">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <CloudRain className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-[10px] font-extrabold text-blue-900 dark:text-blue-100 uppercase tracking-wider font-display">
                        IMD HP Weather Hub
                      </span>
                    </div>
                    <span className="text-[8px] font-mono font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">
                      IMD Shimla
                    </span>
                  </div>

                  {/* HP District Selector */}
                  <div className="mb-2">
                    <label className="text-[9px] text-slate-500 dark:text-slate-400 font-bold block mb-1">
                      {language === "hi" ? "हिमाचल जिला चुनें:" : "Select HP District:"}
                    </label>
                    <select
                      value={selectedHpDistrict.name}
                      onChange={(e) => {
                        const found = HP_DISTRICTS.find(d => d.name === e.target.value);
                        if (found) {
                          setSelectedHpDistrict(found);
                          if (mapInstanceRef.current) {
                            mapInstanceRef.current.panTo([found.lat, found.lng]);
                            mapInstanceRef.current.setZoom(12);
                          }
                        }
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-[10px] text-slate-900 dark:text-white rounded px-2 py-1 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {HP_DISTRICTS.map(d => (
                        <option key={d.name} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* IMD Alert Badge */}
                  <div className={`p-1.5 rounded-lg border mb-2.5 text-[9px] font-bold ${
                    selectedHpDistrict.alert === "red" ? "bg-red-950/80 border-red-600 text-red-300 animate-pulse" :
                    selectedHpDistrict.alert === "orange" ? "bg-orange-950/80 border-orange-600 text-orange-300" :
                    selectedHpDistrict.alert === "yellow" ? "bg-amber-950/80 border-amber-600 text-amber-300" :
                    "bg-emerald-950/80 border-emerald-600 text-emerald-300"
                  }`}>
                    {selectedHpDistrict.desc}
                  </div>

                  {weatherLoading ? (
                    <div className="flex justify-center p-3">
                      <div className="w-4 h-4 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
                  ) : weatherData ? (
                    <div className="space-y-3">
                      <div className="space-y-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1.5"><Thermometer className="w-3 h-3 text-red-400" /> Temp:</span>
                          <span className="font-bold text-slate-900 dark:text-white text-sm">{weatherData.current.temperature_2m}°C</span>
                        </div>
                        <div className="flex justify-between items-center bg-white dark:bg-slate-900/50 p-1 rounded">
                          <span className="flex items-center gap-1.5"><Wind className="w-3 h-3 text-emerald-400" /> Wind:</span>
                          <span className="font-bold text-slate-900 dark:text-white">{weatherData.current.wind_speed_10m} km/h</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1.5"><Droplets className="w-3 h-3 text-blue-400" /> Precip:</span>
                          <span className="font-bold text-blue-200">{weatherData.current.precipitation} mm</span>
                        </div>
                      </div>

                      {/* 5-Day Forecast */}
                      {weatherData.daily && (
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80">
                          <span className="text-[9px] font-extrabold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-2 block">
                            {language === "hi" ? "5-दिन का पूर्वानुमान" : "5-Day Forecast"}
                          </span>
                          <div className="space-y-1.5">
                            {weatherData.daily.time.slice(0, 5).map((time, index) => {
                              const date = new Date(time);
                              const dayName = date.toLocaleDateString(language === "hi" ? "hi-IN" : "en-US", { weekday: "short" });
                              return (
                                <div key={time} className="flex justify-between items-center text-[9px] font-mono">
                                  <span className="text-slate-500 dark:text-slate-400 w-8">{index === 0 ? (language === "hi" ? "आज" : "Tdy") : dayName}</span>
                                  <span className="text-slate-900 dark:text-white font-bold">{Math.round(weatherData.daily.temperature_2m_max[index])}° / {Math.round(weatherData.daily.temperature_2m_min[index])}°</span>
                                  <span className="text-blue-400 text-right w-12">{weatherData.daily.precipitation_sum[index]}mm</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-red-400 text-[9px]">Data unavailable</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* LOADING OPENSTREETMAP COVER SCREEN */}
        {!offline && !leafletLoaded && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
            <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-800 border-t-blue-500 rounded-full animate-spin mb-3"></div>
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">
              {language === "hi" ? "ओपनस्ट्रीटमैप लोड हो रहा है..." : "Initializing OpenStreetMap Engine..."}
            </p>
          </div>
        )}

        {/* OFFLINE STATE: MOCK TACTICAL SVG VIEWPORT FALLBACK */}
        {offline && (
          <div 
            className="w-full h-full absolute inset-0 z-0 flex items-center justify-center cursor-grab active:cursor-grabbing bg-slate-50 dark:bg-slate-950"
            onMouseDown={(e) => {
              const startX = e.clientX - panX;
              const startY = e.clientY - panY;
              
              const handleMouseMove = (moveEvent) => {
                setPanX(moveEvent.clientX - startX);
                setPanY(moveEvent.clientY - startY);
              };

              const handleMouseUp = () => {
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);
              };

              document.addEventListener("mousemove", handleMouseMove);
              document.addEventListener("mouseup", handleMouseUp);
            }}
          >
            {/* SVG Tactical Vector Viewport */}
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${mapWidth} ${mapHeight}`}
              className="transition-transform duration-100 ease-out select-none"
              style={{
                transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                transformOrigin: "center"
              }}
            >
              {/* Dark Military Grid Pattern */}
              <defs>
                <pattern id="tactical-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                  <circle cx="0" cy="0" r="1.5" fill="#334155" />
                </pattern>
              </defs>
              <rect width={mapWidth} height={mapHeight} fill="url(#tactical-grid)" />
              
              {/* Safe Zone Rings */}
              {safeZones.map(sz => (
                <g key={sz.id} className="cursor-pointer group" onClick={() => setSelectedEntity({ type: "safe_zone", ...sz, coords: "Simulated Vector Grid" })}>
                  <circle
                    cx={sz.x}
                    cy={sz.y}
                    r={sz.radius}
                    fill="#22c55e"
                    fillOpacity="0.08"
                    stroke="#22c55e"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <circle cx={sz.x} cy={sz.y} r="4" fill="#22c55e" />
                  <text
                    x={sz.x}
                    y={sz.y - sz.radius - 6}
                    textAnchor="middle"
                    fill="#4ade80"
                    fontSize="9"
                    fontWeight="bold"
                    className="font-mono uppercase tracking-wider"
                  >
                    {sz.name}
                  </text>
                </g>
              ))}

              {/* Incidents (Hazard Triangles) */}
              {filteredIncidents.map(inc => {
                // Approximate coordinate offset map to grid coordinates
                const incX = 350 + ((inc.lng || 77.2090) - 77.2090) * 12000;
                const incY = 250 - ((inc.lat || 28.6139) - 28.6139) * 12000;
                const isHigh = inc.severity === "high";

                return (
                  <g 
                    key={inc.id} 
                    className="cursor-pointer"
                    onClick={() => setSelectedEntity({ type: "incident", ...inc, coords: "Simulated Vector Grid" })}
                  >
                    <polygon
                      points={`${incX},${incY - 12} ${incX - 10},${incY + 8} ${incX + 10},${incY + 8}`}
                      fill={isHigh ? "#dc2626" : "#ea580c"}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    <text x={incX} y={incY + 5} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">!</text>
                    <text
                      x={incX}
                      y={incY - 16}
                      textAnchor="middle"
                      fill="#ef4444"
                      fontSize="9"
                      fontWeight="bold"
                      className="font-mono bg-slate-50 dark:bg-slate-950"
                    >
                      {inc.title}
                    </text>
                  </g>
                );
              })}

              {/* Camp Shelters */}
              {camps.map(camp => {
                const campX = 420 + ((camp.lng || 77.2100) - 77.2100) * 12000;
                const campY = 220 - ((camp.lat || 28.6120) - 28.6120) * 12000;
                const isFull = (camp.bedsOccupied / camp.beds) >= 0.9;

                return (
                  <g 
                    key={camp.id} 
                    className="cursor-pointer"
                    onClick={() => setSelectedEntity({ type: "camp", ...camp, coords: "Simulated Vector Grid" })}
                  >
                    <rect
                      x={campX - 10}
                      y={campY - 10}
                      width="20"
                      height="20"
                      rx="4"
                      fill={isFull ? "#ea580c" : "#2563eb"}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    <text x={campX} y={campY + 4} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">C</text>
                  </g>
                );
              })}

              {/* Responder coordinates */}
              {responders.map(resp => {
                const rX = 280 + ((resp.lng || 77.2012) - 77.2012) * 12000;
                const rY = 290 - ((resp.lat || 28.6110) - 28.6110) * 12000;
                const isBusy = resp.status === "busy";

                return (
                  <g 
                    key={resp.id} 
                    className="cursor-pointer"
                    onClick={() => setSelectedEntity({ type: "responder", ...resp, coords: "Simulated Vector Grid" })}
                  >
                    <circle
                      cx={rX}
                      cy={rY}
                      r="9"
                      fill={isBusy ? "#3b82f6" : "#10b981"}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    <text x={rX} y={rY + 3} fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">R</text>
                  </g>
                );
              })}

              {/* Active SOS Beacon (Offline Mode) */}
              {activeSOS && activeSOS.status !== "resolved" && (() => {
                const sosX = 400;
                const sosY = 200;
                return (
                  <g className="cursor-pointer" onClick={() => setSelectedEntity({ type: "sos", name: "SOS Beacon", description: t.sosDispatching, coords: "Simulated Vector Grid" })}>
                    <circle
                      cx={sosX}
                      cy={sosY}
                      r="40"
                      fill="#dc2626"
                      fillOpacity="0.1"
                      stroke="#dc2626"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                    <circle cx={sosX} cy={sosY} r="7" fill="#dc2626" stroke="#ffffff" strokeWidth="1.5" />
                    <text x={sosX} y={sosY - 12} fill="#ef4444" fontSize="10" fontWeight="extrabold" textAnchor="middle" className="animate-pulse">CRITICAL SOS</text>
                  </g>
                );
              })()}

              {/* User Live Node (Offline Fallback) */}
              {userLocation && (() => {
                const userX = 300;
                const userY = 250;
                return (
                  <g>
                    <circle cx={userX} cy={userY} r="14" fill="#3b82f6" fillOpacity="0.15" stroke="#3b82f6" strokeWidth="1" />
                    <circle cx={userX} cy={userY} r="6" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />
                    <text x={userX} y={userY - 14} fill="#60a5fa" fontSize="9" fontWeight="bold" textAnchor="middle">YOU (LIVE)</text>
                  </g>
                );
              })()}

              {/* Assigned routing line */}
              {role === "responder" && assignedIncident && (() => {
                const rX = 280;
                const rY = 290;
                const destX = 400;
                const destY = 200;

                return (
                  <line
                    x1={rX}
                    y1={rY}
                    x2={destX}
                    y2={destY}
                    stroke="#3b82f6"
                    strokeWidth="3"
                    strokeDasharray="6 6"
                    className="animate-pulse"
                  />
                );
              })()}
            </svg>

            {/* Offline Grid Navigation controls HUD */}
            <div className="absolute bottom-3 left-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg text-[9px] text-slate-500 dark:text-slate-500 font-mono pointer-events-none select-none z-10">
              PAN: DRAG | ZOOM: CONTROLS
            </div>
          </div>
        )}

        {/* Map Legend Overlay */}
        <div className="absolute bottom-3 left-3 z-10">
          <div className="bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg transition-all overflow-hidden max-w-[200px] backdrop-blur-md">
            <button
              onClick={() => setLegendOpen(!legendOpen)}
              className="flex items-center justify-between w-full px-3 py-2 text-[10px] font-extrabold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white cursor-pointer focus:outline-none pointer-events-auto"
            >
              <span className="uppercase tracking-wider font-display">
                {language === "hi" ? "मानचित्र संकेत" : "TACTICAL LEGEND"}
              </span>
              {legendOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-500" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5 text-slate-500 dark:text-slate-500" />
              )}
            </button>
            {legendOpen && (
              <div className="px-3 pb-3 space-y-1.5 border-t border-slate-200 dark:border-slate-800/80 pt-2 pointer-events-auto text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 block flex-shrink-0"></span>
                  <span className="text-slate-700 dark:text-slate-300 leading-tight">{t.mapLegendIncident}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block flex-shrink-0"></span>
                  <span className="text-slate-700 dark:text-slate-300 leading-tight">{t.mapLegendSafe}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-blue-600 block flex-shrink-0"></span>
                  <span className="text-slate-700 dark:text-slate-300 leading-tight">{t.mapLegendCamp}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-450 block flex-shrink-0"></span>
                  <span className="text-slate-700 dark:text-slate-300 leading-tight">{t.mapLegendResponder}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Selected Entity HUD Inspector overlay card */}
        {selectedEntity && (
          <div className="absolute bottom-3 right-3 bg-slate-50 dark:bg-slate-950/95 border border-red-500/35 p-4 rounded-xl text-xs backdrop-blur-md max-w-sm w-[260px] md:w-[320px] shadow-2xl animate-fadeIn z-15">
            <div className="flex justify-between items-start mb-2 border-b border-slate-200 dark:border-slate-800 pb-1.5">
              <span className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5 font-display">
                {selectedEntity.type === "incident" && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                {selectedEntity.type === "safe_zone" && <Shield className="w-3.5 h-3.5 text-emerald-500" />}
                {selectedEntity.type === "camp" && <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />}
                {selectedEntity.type === "sos" && <Navigation className="w-3.5 h-3.5 text-red-500 animate-pulse" />}
                {selectedEntity.type === "responder" && <Activity className="w-3.5 h-3.5 text-emerald-450" />}
                {selectedEntity.type === "family_member" && <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-550" />}
                {selectedEntity.type === "local_volunteer" && <User className="w-3.5 h-3.5 text-blue-450 fill-blue-500/20" />}
                {selectedEntity.type.replace("_", " ")}
              </span>
              <button
                onClick={() => setSelectedEntity(null)}
                className="text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:text-white px-1.5 py-0.5 rounded hover:bg-white dark:bg-slate-900 font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {selectedEntity.title || selectedEntity.name}
              </h4>
              
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                {selectedEntity.description}
              </p>

              {selectedEntity.type === "incident" && (
                <div className="grid grid-cols-2 gap-2 text-[10px] bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800/80">
                  <div>
                    <span className="text-slate-500 dark:text-slate-500 block">Severity:</span>
                    <span className={`font-bold uppercase ${selectedEntity.severity === "high" ? "text-red-500" : "text-amber-500"}`}>
                      {selectedEntity.severity}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-500 block">Status:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 capitalize">{selectedEntity.status}</span>
                  </div>
                </div>
              )}

              {selectedEntity.photo && (
                <div className="mt-2 rounded-lg overflow-hidden border border-slate-855 max-h-[130px] flex bg-white dark:bg-slate-900 shadow-inner">
                  <img src={selectedEntity.photo} alt="Incident evidence" className="object-cover w-full h-[130px]" />
                </div>
              )}

              {selectedEntity.type === "camp" && (
                <div className="space-y-2 text-[10px] bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800/80">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-500">{t.adminCampsBeds}:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {selectedEntity.bedsOccupied} / {selectedEntity.beds}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-1.5 rounded-full ${selectedEntity.bedsOccupied / selectedEntity.beds >= 0.9 ? "bg-red-600" : "bg-blue-600"}`} 
                      style={{ width: `${(selectedEntity.bedsOccupied / selectedEntity.beds) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-500">Water Supply:</span>
                    <span className="font-bold text-emerald-450">92%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-500">Food Rations:</span>
                    <span className="font-bold text-amber-500">45%</span>
                  </div>
                </div>
              )}

              {selectedEntity.type === "responder" && (
                <div className="grid grid-cols-2 gap-2 text-[10px] bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800/80">
                  <div>
                    <span className="text-slate-500 dark:text-slate-500 block">Duty Status:</span>
                    <span className={`font-bold capitalize ${selectedEntity.status === "available" ? "text-emerald-400" : "text-blue-400"}`}>
                      {selectedEntity.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-500 block">Equipment:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{selectedEntity.type || "First Aid / Radio"}</span>
                  </div>
                </div>
              )}

              {selectedEntity.type === "local_volunteer" && (
                <div className="space-y-1.5 text-[10px] bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/80">
                  <div className="flex justify-between items-center pb-1.5 border-b border-slate-200 dark:border-slate-800/80">
                    <span className="text-slate-500 dark:text-slate-500 font-medium">Contact Phone:</span>
                    <a href={`tel:${selectedEntity.phone}`} className="font-extrabold text-emerald-400 hover:text-emerald-355 transition-colors font-mono">
                      {selectedEntity.phone}
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-500 block">Services:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedEntity.description.split('\n')[0].replace('Services: ', '')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-500 block">Supplies Offered:</span>
                    <span className="font-bold text-slate-350">{selectedEntity.description.split('\n')[1]?.replace('Supplies: ', '') || 'None'}</span>
                  </div>
                </div>
              )}

              {selectedEntity.coords && (
                <div className="text-[10px] text-slate-500 dark:text-slate-500 font-mono mt-1 text-right">
                  GPS: {selectedEntity.coords}
                </div>
              )}

              {/* Google Maps External Routing Action Link */}
              {(selectedEntity.lat || (selectedEntity.coords && selectedEntity.coords !== "Simulated Vector Grid")) && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation ? `${userLocation.lat},${userLocation.lng}` : '28.6139,77.2090'}&destination=${selectedEntity.lat || selectedEntity.coords.split(',')[0].trim()},${selectedEntity.lng || selectedEntity.coords.split(',')[1].trim()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-md cursor-pointer hover:shadow-blue-500/20 text-center font-sans no-underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {language === "hi" ? "गूगल मैप्स पर निर्देश" : "Google Maps Directions"}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
