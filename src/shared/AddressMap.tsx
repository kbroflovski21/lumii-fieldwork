import { useEffect, useRef } from "react";

export function AddressMap({ address }: { address: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mapRef.current) return;
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css"; link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    let map: any;
    const defaultCenter: [number, number] = [30.27, 120.13];
    setTimeout(() => {
      import("leaflet").then(async (L) => {
        if (!mapRef.current) return;
        map = L.map(mapRef.current, { zoomControl: true }).setView(defaultCenter, 14);
        L.tileLayer("https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}", {
          subdomains: ["1", "2", "3", "4"], attribution: "&copy; 高德地图"
        }).addTo(map);
        const icon = L.divIcon({
          html: '<div style="background:#0052CC;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.3)">📍</div>',
          className: "", iconSize: [28, 28], iconAnchor: [14, 28],
        });
        try {
          const res = await fetch(`https://restapi.amap.com/v3/geocode/geo?key=d8d4c4762c1646338864da06e3e2e574&address=${encodeURIComponent(address)}`);
          const data = await res.json();
          if (data.geocodes?.[0]?.location) {
            const [lng, lat] = data.geocodes[0].location.split(",").map(Number);
            map.setView([lat, lng], 16);
            L.marker([lat, lng], { icon }).addTo(map).bindPopup(`<b>${address}</b>`).openPopup();
            return;
          }
        } catch {}
        L.marker(defaultCenter, { icon }).addTo(map).bindPopup(`<b>${address}</b>`).openPopup();
      });
    }, 100);
    return () => { if (map) map.remove(); };
  }, [address]);
  return <div ref={mapRef} style={{ height: 240, borderRadius: 8, border: "1px solid var(--site-line, #DDD5CC)" }} />;
}
