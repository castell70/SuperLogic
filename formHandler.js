export class FormHandler {
    constructor(dataStore, uiManager) {
        this.dataStore = dataStore;
        this.uiManager = uiManager;
    }

    initializeForm(formId, type, onSubmitCallback) {
        const form = document.getElementById(formId);
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData.entries());
                
                try {
                    // Specific handling for 'pedidos' form before adding to dataStore
                    if (type === 'pedidos') {
                        const selectedSucursalName = data.sucursalNombre;
                        const sucursal = this.dataStore.getAll('sucursales').find(s => s.nombre === selectedSucursalName);
                        if (!sucursal) {
                            throw new Error('Sucursal seleccionada no encontrada.');
                        }
                        data.sucursal = sucursal;
                        data.cantidad = parseFloat(data.cantidad);
                        data.estado = 'Pendiente';
                        delete data.sucursalNombre;
                    } else if (type === 'camiones') {
                        data.anioCompra = parseFloat(data.anioCompra);
                        data.capacidad = parseFloat(data.capacidad);
                        data.capacidadTanque = parseFloat(data.capacidadTanque);
                        data.costoCombustible = parseFloat(data.costoCombustible);
                        data.kmPorGalon = parseFloat(data.kmPorGalon);
                    } else if (type === 'sucursales') {
                        data.latitud = parseFloat(data.latitud);
                        data.longitud = parseFloat(data.longitud);
                        data.demanda = parseFloat(data.demanda);
                    } else if (type === 'choferes') {
                        // Parse salario as number
                        data.salario = parseFloat(data.salario);
                    }
                    
                    onSubmitCallback(type, data); // Delegate adding to the main app logic
                    e.target.reset();
                    this.uiManager.showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} registrado exitosamente`);
                } catch (error) {
                    this.uiManager.showNotification(`Error al registrar ${type}: ${error.message}`, true);
                }
            });
        }
    }
}