export class DataStore {
    constructor() {
        // Datos actualizados con capacidad de tanque en galones (convertidos de litros)
        this.data = {
            camiones: [],
            sucursales: [],
            choferes: [],
            pedidos: [], // New array for pedidos (orders)
            validatedRoutes: [] // New array for validated routes
        };
    }

    add(type, item) {
        // Ensure numeric fields are parsed as numbers if needed, though form data comes as strings
        // And for `kmPorGalon`, ensure it's treated as a string too for consistency if not parsed immediately
        if (type === 'camiones') {
            item.anioCompra = parseFloat(item.anioCompra);
            item.capacidad = parseFloat(item.capacidad);
            item.capacidadTanque = parseFloat(item.capacidadTanque);
            item.costoCombustible = parseFloat(item.costoCombustible);
            item.kmPorGalon = parseFloat(item.kmPorGalon); // Parse the new field
        } else if (type === 'sucursales') {
            item.latitud = parseFloat(item.latitud);
            item.longitud = parseFloat(item.longitud);
            item.demanda = parseFloat(item.demanda);
        } else if (type === 'pedidos') {
            item.cantidad = parseFloat(item.cantidad); // Ensure quantity is a number
            // sucursal object is already passed from app.js
            // estado is already set in app.js
        }
        this.data[type].push(item);
    }

    remove(type, index) {
        this.data[type].splice(index, 1);
    }

    getAll(type) {
        return this.data[type];
    }

    // New methods for validated routes
    addValidatedRoute(route) {
        // Add the validation date to the route object
        route.fechaValidacion = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
        this.data.validatedRoutes.push(route);
    }

    removeValidatedRoute(index) {
        this.data.validatedRoutes.splice(index, 1);
    }

    // New method for updating pedido status
    updatePedidoStatus(index, newStatus) {
        if (this.data.pedidos[index]) {
            this.data.pedidos[index].estado = newStatus;
            // Set fechaDespacho if status is 'Despachado'
            if (newStatus === 'Despachado') {
                this.data.pedidos[index].fechaDespacho = new Date().toISOString().split('T')[0];
            }
        } else {
            console.error('Pedido not found at index:', index);
        }
    }

    // New methods for data management
    getData() {
        return this.data;
    }

    clearAll() {
        this.data = {
            camiones: [],
            sucursales: [],
            choferes: [],
            pedidos: [],
            validatedRoutes: []
        };
    }

    setData(newData) {
        // Basic validation to ensure newData has the expected structure
        if (newData && typeof newData === 'object' &&
            Array.isArray(newData.camiones) &&
            Array.isArray(newData.sucursales) &&
            Array.isArray(newData.choferes) &&
            Array.isArray(newData.pedidos) && // Validate new pedidos array
            Array.isArray(newData.validatedRoutes)) {
            this.data = newData;
        } else {
            throw new Error('Invalid data structure for loading. Expected camiones, sucursales, choferes, pedidos, and validatedRoutes arrays.');
        }
    }
}