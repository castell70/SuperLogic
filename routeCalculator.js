export class RouteCalculator {
    constructor() {
        // CONSUMO_PROMEDIO is removed as it will now be per-truck kmPorGalon
    }

    calculateOptimalRoutes(sucursales, camiones) {
        let routes = [];
        let sucursalesPendientes = [...sucursales];
        
        // Sort sucursales by demand (or proximity, or other heuristic) for a more "optimal" starting point
        // For simplicity, let's just use the order given for now or a basic sort.
        // A more advanced algorithm (like VRP) would be needed for true optimality.
        
        while(sucursalesPendientes.length > 0) {
            for(let camion of camiones) {
                if(sucursalesPendientes.length === 0) break;

                // Pass the camion object which now contains kmPorGalon
                let route = this.calculateSingleRouteForOptimization(sucursalesPendientes, camion);
                if (route.sucursales.length > 0) { // Only add route if it actually serves sucursales
                    routes.push(route);

                    // Remover sucursales ya atendidas
                    route.sucursales.forEach(sucursal => {
                        const index = sucursalesPendientes.findIndex(s => s.nombre === sucursal.nombre);
                        if(index !== -1) sucursalesPendientes.splice(index, 1);
                    });
                }
            }
            // Fallback to prevent infinite loop if some sucursales cannot be reached by any truck
            if (routes.length > 0 && routes.every(r => r.sucursales.length === 0)) {
                console.warn('No more optimal routes can be found for remaining sucursales with available trucks.');
                break;
            }
            if (sucursalesPendientes.length > 0 && routes.length === 0) { // If no routes were ever formed but sucursales remain
                console.warn('Could not assign all sucursales to trucks. Remaining:', sucursalesPendientes);
                break;
            }
        }

        return routes;
    }

    calculateSingleRouteForOptimization(sucursales, camion) {
        let route = {
            camion: camion,
            sucursales: [],
            distanciaTotal: 0,
            cargaTotal: 0,
            requiereCombustible: false
        };

        let capacidadRestante = parseFloat(camion.capacidad);
        let combustibleRestante = parseFloat(camion.capacidadTanque); // This is initial tank capacity, not current fuel
        let posicionActual = { latitud: 13.6894, longitud: -89.1872 }; // Depósito Central fixed coordinate

        // Filter sucursales that the truck can potentially handle by demand and try to add them
        const eligibleSucursales = sucursales.filter(s => parseFloat(s.demanda) <= capacidadRestante);

        // Simple greedy approach: try to add sucursales one by one if capacity and fuel allow
        for (const sucursal of eligibleSucursales) {
            const distanciaIda = this.calcularDistancia(
                posicionActual.latitud,
                posicionActual.longitud,
                parseFloat(sucursal.latitud),
                parseFloat(sucursal.longitud)
            );
            
            // Check if adding this sucursal is feasible with remaining capacity
            if(capacidadRestante >= parseFloat(sucursal.demanda)) {
                // Calculate fuel for round trip (to sucursal and back to depot from sucursal)
                // This is a simplification for initial route planning. For multiple stops,
                // it should calculate fuel from current point to next stop.
                // For optimization, we'll consider each sucursal individually from depot for fuel check.
                // A better approach for multi-stop is needed for truly optimal fuel usage on a single trip.
                const combustibleNecesarioIda = distanciaIda / parseFloat(camion.kmPorGalon);
                
                // For the purpose of 'optimal routes' that just assign sucursales,
                // let's ensure the truck can reach *this* sucursal from the depot and return.
                // This logic needs to be revisited for complex multi-stop routes.
                // Current implementation of 'optimalRoutes' is more about assigning sucursales to trucks
                // based on capacity and max fuel range, assuming individual trips.
                
                // For now, let's simplify: check if it can reach the sucursal. The `displayRoutes` will get actual OSRM dist.
                if(combustibleRestante >= combustibleNecesarioIda) {
                    route.sucursales.push(sucursal);
                    route.distanciaTotal += distanciaIda; // Accumulate straight-line distance, will be updated by OSRM
                    route.cargaTotal += parseFloat(sucursal.demanda);
                    capacidadRestante -= parseFloat(sucursal.demanda);
                    combustibleRestante -= combustibleNecesarioIda; // Simulate fuel usage
                    posicionActual = sucursal;
                } else {
                    // This sucursal is too far for the current fuel capacity of the truck
                    route.requiereCombustible = true;
                    // Don't add this sucursal if it means the truck can't reach it.
                    // Keep trying other sucursales.
                }
            }
        }
        
        // Add return distance to depot *if* any sucursals were added.
        if (route.sucursales.length > 0) {
            const distanciaRetorno = this.calcularDistancia(
                posicionActual.latitud,
                posicionActual.longitud,
                13.6894, // Depot lat
                -89.1872  // Depot lng
            );
            route.distanciaTotal += distanciaRetorno;
        }

        return route;
    }

    calculateSingleRouteWithCosts(sucursal, camion, cantidadPedido) {
        // Keep existing single-sucursal behavior for backward compatibility
        let route = {
            camion: {
                ...camion // Ensure kmPorGalon is included here
            },
            sucursales: [sucursal],
            distanciaTotal: 0,
            cargaTotal: parseFloat(cantidadPedido), // Carga ahora viene del pedido
            requiereCombustible: false
        };

        const depositoLat = 13.6894;
        const depositoLng = -89.1872;

        const distanciaIda = this.calcularDistancia(depositoLat, depositoLng, 
            parseFloat(sucursal.latitud), 
            parseFloat(sucursal.longitud));

        const distanciaRetorno = distanciaIda; // Assuming round trip back to depot
        route.distanciaTotal = distanciaIda + distanciaRetorno;

        const combustibleNecesario = route.distanciaTotal / parseFloat(camion.kmPorGalon);
        if (combustibleNecesario > parseFloat(camion.combustibleActual)) {
            route.requiereCombustible = true;
        }

        return route;
    }

    // New: Calculate a multi-stop route given an array of sucursales (order preserved)
    calculateMultiStopRoute(sucursalesArray, camion, cargaTotal) {
        const deposito = { latitud: 13.6894, longitud: -89.1872 };
        let route = {
            camion: { ...camion },
            sucursales: sucursalesArray,
            distanciaTotal: 0,
            cargaTotal: parseFloat(cargaTotal),
            requiereCombustible: false
        };

        // Sum straight-line distances sequentially depot -> first -> ... -> last -> depot
        let prev = deposito;
        let totalDist = 0;
        for (const sucursal of sucursalesArray) {
            const d = this.calcularDistancia(prev.latitud, prev.longitud, parseFloat(sucursal.latitud), parseFloat(sucursal.longitud));
            totalDist += d;
            prev = sucursal;
        }
        // Return to depot
        totalDist += this.calcularDistancia(prev.latitud, prev.longitud, deposito.latitud, deposito.longitud);

        route.distanciaTotal = totalDist;

        const combustibleNecesario = route.distanciaTotal / parseFloat(camion.kmPorGalon);
        if (combustibleNecesario > parseFloat(camion.combustibleActual)) {
            route.requiereCombustible = true;
        }

        return route;
    }

    calcularDistancia(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radio de la Tierra en km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    toRad(valor) {
        return valor * Math.PI / 180;
    }
}