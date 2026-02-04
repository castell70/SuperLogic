export class DataStore {
    constructor() {
        // Datos actualizados con capacidad de tanque en galones (convertidos de litros)
        // Añadimos campos 'disponible' por defecto para camiones y choferes (true)
        this.data = {
            camiones: [],
            sucursales: [],
            choferes: [],
            pedidos: [], // New array for pedidos (orders)
            validatedRoutes: [] // New array for validated routes
        };
    }

    add(type, item) {
        if (type === 'camiones') {
            item.anioCompra = parseFloat(item.anioCompra);
            item.capacidad = parseFloat(item.capacidad);
            item.capacidadTanque = parseFloat(item.capacidadTanque);
            item.costoCombustible = parseFloat(item.costoCombustible);
            item.kmPorGalon = parseFloat(item.kmPorGalon);
            // Set disponibilidad por defecto si no existe
            if (item.disponible === undefined) item.disponible = true;
        } else if (type === 'sucursales') {
            item.latitud = parseFloat(item.latitud);
            item.longitud = parseFloat(item.longitud);
            item.demanda = parseFloat(item.demanda);
        } else if (type === 'pedidos') {
            item.cantidad = parseFloat(item.cantidad);
            // estado and fechaEnvio are set by caller
        } else if (type === 'choferes') {
            // Ensure salario is number and disponibilidad default
            if (item.salario !== undefined) item.salario = parseFloat(item.salario);
            if (item.disponible === undefined) item.disponible = true;
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
            // Set fechaEntrega if status is 'Entregado'
            if (newStatus === 'Entregado') {
                this.data.pedidos[index].fechaEntrega = new Date().toISOString().split('T')[0];
            }
        } else {
            console.error('Pedido not found at index:', index);
        }
    }

    // Methods to set disponibilidad for camiones y choferes
    setCamionDisponibilidad(placa, disponible) {
        const camion = this.data.camiones.find(c => c.placa === placa);
        if (camion) camion.disponible = !!disponible;
    }

    setChoferDisponibilidad(licencia, disponible) {
        const chofer = this.data.choferes.find(ch => ch.licencia === licencia);
        if (chofer) chofer.disponible = !!disponible;
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
            // Ensure camiones and choferes have disponible flag
            newData.camiones = newData.camiones.map(c => ({ disponible: true, ...c }));
            newData.choferes = newData.choferes.map(ch => ({ disponible: true, ...ch }));
            this.data = newData;
        } else {
            throw new Error('Invalid data structure for loading. Expected camiones, sucursales, choferes, pedidos, and validatedRoutes arrays.');
        }
    }
}