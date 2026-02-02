export class MapManager {
    constructor(uiManager) {
        this.map = null;
        this.markers = [];
        this.routes = [];
        this.routingControl = null;
        this.uiManager = uiManager; // Store uiManager
    }

    initializeMap() {
        if(this.map) return;

        // Centrar en El Salvador
        this.map = L.map('map').setView([13.7942, -88.8965], 8);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Agregar marcador del depósito central
        const deposito = [13.6894, -89.1872];
        L.marker(deposito)
            .bindPopup('<b>Depósito Central</b><br>San Salvador')
            .addTo(this.map);
    }

    async displayRoutes(routes) {
        this.clearMap();
        
        const bounds = [];
        const colors = ['#FF0000', '#00FF00', '#0000FF', '#FF00FF', '#00FFFF', '#FFFF00'];
        const deposito = [13.6894, -89.1872];

        for (let i = 0; i < routes.length; i++) {
            const route = routes[i];
            const color = colors[i % colors.length];

            bounds.push(deposito);
            
            for (const sucursal of route.sucursales) {
                const lat = parseFloat(sucursal.latitud);
                const lng = parseFloat(sucursal.longitud);
                bounds.push([lat, lng]);

                const marker = L.marker([lat, lng])
                    .bindPopup(`
                        <b>${sucursal.nombre}</b><br>
                        Demanda: ${sucursal.demanda} Ton
                    `)
                    .addTo(this.map);
                this.markers.push(marker);

                // Usar OSRM para obtener la ruta real por carretera
                try {
                    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${deposito[1]},${deposito[0]};${lng},${lat}?overview=full&geometries=geojson`);
                    const data = await response.json();
                    
                    if (data.routes && data.routes[0]) {
                        const routeGeometry = data.routes[0].geometry;
                        const polyline = L.geoJSON(routeGeometry, {
                            style: {
                                color: color,
                                weight: 3,
                                opacity: 0.8
                            }
                        }).addTo(this.map);
                        
                        this.routes.push(polyline);
                        
                        // Actualizar la distancia real
                        route.distanciaTotal = data.routes[0].distance / 1000; // Convertir metros a kilómetros
                    } else {
                        // Notify if OSRM response is valid but contains no routes
                        this.uiManager.showNotification(`No se pudo trazar la ruta para ${sucursal.nombre}.`, true);
                    }
                } catch (error) {
                    console.error('Error al obtener la ruta:', error);
                    this.uiManager.showNotification(`Error al conectar con el servicio de mapas para ${sucursal.nombre}.`, true);
                }
            }
        }

        if(bounds.length > 0) {
            this.map.fitBounds(bounds, {padding: [50, 50]});
        }
    }

    async displaySingleRoute(route) {
        this.clearMap();
        
        const deposito = [13.6894, -89.1872];
        // Add markers for all stops
        for (const sucursal of route.sucursales) {
            const lat = parseFloat(sucursal.latitud);
            const lng = parseFloat(sucursal.longitud);
            const marker = L.marker([lat, lng])
                .bindPopup(`
                    <b>${sucursal.nombre}</b><br>
                    Demanda: ${sucursal.demanda} Ton
                `)
                .addTo(this.map);
            this.markers.push(marker);
        }

        try {
            // Build OSRM coordinates string: depot;stop1;stop2;...;depot
            const coords = [];
            coords.push(`${deposito[1]},${deposito[0]}`);
            route.sucursales.forEach(s => coords.push(`${parseFloat(s.longitud)},${parseFloat(s.latitud)}`));
            coords.push(`${deposito[1]},${deposito[0]}`);
            const coordsStr = coords.join(';');

            const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`);
            const data = await response.json();

            if (data.routes && data.routes[0]) {
                const routeGeometry = data.routes[0].geometry;
                const polyline = L.geoJSON(routeGeometry, {
                    style: {
                        color: '#FF4500',
                        weight: 3,
                        opacity: 0.8
                    }
                }).addTo(this.map);
                
                this.routes.push(polyline);
                
                // Actualizar la distancia real (OSRM devuelve la distancia total en metros)
                route.distanciaTotal = data.routes[0].distance / 1000; // Convertir metros a kilómetros
                
                // Ajustar vista para todo el polyline
                this.map.fitBounds(polyline.getBounds(), {padding: [50, 50]});
            } else {
                this.uiManager.showNotification(`No se pudo trazar la ruta consolidada.`, true);
            }
        } catch (error) {
            console.error('Error al obtener la ruta:', error);
            this.uiManager.showNotification(`Error al conectar con el servicio de mapas para la ruta consolidada.`, true);
        }
    }

    clearMap() {
        this.markers.forEach(marker => marker.remove());
        this.routes.forEach(route => route.remove());
        if (this.routingControl) {
            this.map.removeControl(this.routingControl);
        }
        this.markers = [];
        this.routes = [];
    }
}