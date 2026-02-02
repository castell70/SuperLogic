// Importar módulos
import { DataStore } from './dataStore.js';
import { RouteCalculator } from './routeCalculator.js';
import { MapManager } from './mapManager.js';
import { UIManager } from './uiManager.js';
import { FormHandler } from './formHandler.js';

class App {
    constructor() {
        // Define app-wide constants first
        this.CONSTANTS = {
            COSTO_KM: 0.50, // Example: $0.50 per kilometer
            AVERAGE_SPEED_KMH: 50 // Average speed for time estimation
        };

        this.dataStore = new DataStore();
        this.routeCalculator = new RouteCalculator();
        this.uiManager = new UIManager(this.dataStore, null, this.CONSTANTS); // Pass dataStore and constants, mapManager will be set after init
        this.mapManager = new MapManager(this.uiManager); // Pass uiManager to MapManager
        this.uiManager.setMapManager(this.mapManager); // Set mapManager in uiManager after it's initialized
        
        this.formHandler = new FormHandler(this.dataStore, this.uiManager); // Pass dataStore and uiManager

        this.currentRoute = null; // Holds the route currently being calculated/validated

        this.initializeApplication();
    }

    async initializeApplication() {
        await this.loadInitialData(); // Load data before anything else
        this.initializeEventListeners();
        this.initializeForms();
        this.initializeTables();
        
        // Show dashboard initially
        this.uiManager.showSection('dashboard');
        this.uiManager.updateDashboard();
        this.uiManager.updateValidatedRoutesList(this.handleDelete.bind(this));
        this.updateRouteRelatedUI(); // Ensure selectors are populated after data load
    }

    async loadInitialData() {
        try {
            const response = await fetch('./superlogic_data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.dataStore.setData(data);
            this.uiManager.showNotification('Datos iniciales cargados exitosamente.', false); // Changed to explicitly success
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.uiManager.showNotification(`Error al cargar datos iniciales: ${error.message}. La aplicación iniciará con datos vacíos.`, true);
        }
    }

    initializeEventListeners() {
        // Navegación
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.uiManager.showSection(e.target.dataset.section);
                // Specific updates needed when sections are shown
                if (e.target.dataset.section === 'rutas') {
                    this.updateRouteRelatedUI();
                    this.updateFuelInput(); // Initial call to populate fuel field if selectors have default values
                } else if (e.target.dataset.section === 'pedidos') {
                    this.uiManager.updatePedidoSucursalSelector(this.dataStore.getAll('sucursales'));
                    // Update the pedidos table with the new dispatch callback
                    this.uiManager.updateTable('pedidos', null, this.handleDelete.bind(this), this.handleMarkAsDispatched.bind(this)); 
                }
            });
        });

        // Help button
        document.getElementById('helpBtn').addEventListener('click', function() {
            var helpModal = new bootstrap.Modal(document.getElementById('helpModal'));
            helpModal.show();
        });

        // Calculation and validation buttons
        document.getElementById('calcularRutas').addEventListener('click', () => this.calculateRoutes());
        document.getElementById('rutaForm').addEventListener('submit', (e) => this.handleRutaSubmit(e));
        document.getElementById('validarRuta').addEventListener('click', () => this.validarRuta());
        
        // Herramientas section
        document.getElementById('downloadDataBtn').addEventListener('click', () => this.handleDownloadData());
        document.getElementById('uploadDataInput').addEventListener('change', () => this.handleUploadData());
        document.getElementById('uploadDataBtn').addEventListener('click', () => this.handleUploadData());
        document.getElementById('resetAppBtn').addEventListener('click', () => this.handleResetApp());

        // Report generation
        document.getElementById('generateCamionesReportBtn').addEventListener('click', () => this.handleGenerateCamionesReport());

        // New event listeners for fuel calculation
        document.getElementById('selectPedidoRuta').addEventListener('change', () => this.updateFuelInput());
        document.getElementById('selectCamion').addEventListener('change', () => this.updateFuelInput());
    }

    initializeForms() {
        // Delegate form submission to FormHandler
        this.formHandler.initializeForm('camionForm', 'camiones', this.handleDataAdd.bind(this));
        this.formHandler.initializeForm('sucursalForm', 'sucursales', this.handleDataAdd.bind(this));
        this.formHandler.initializeForm('choferForm', 'choferes', this.handleDataAdd.bind(this));
        this.formHandler.initializeForm('pedidoForm', 'pedidos', this.handleDataAdd.bind(this));
    }

    initializeTables() {
        // Initialize tables with inline editing and deletion callbacks
        this.uiManager.updateTable('camiones', this.handleInlineSave.bind(this), this.handleDelete.bind(this));
        this.uiManager.updateTable('sucursales', this.handleInlineSave.bind(this), this.handleDelete.bind(this));
        this.uiManager.updateTable('choferes', this.handleInlineSave.bind(this), this.handleDelete.bind(this));
        // Pass the new dispatch callback for pedidos table
        this.uiManager.updateTable('pedidos', null, this.handleDelete.bind(this), this.handleMarkAsDispatched.bind(this)); 
        this.uiManager.updateValidatedRoutesList(this.handleDelete.bind(this)); // Validaded routes has only delete
    }

    handleDataAdd(type, data) {
        this.dataStore.add(type, data);
        // Ensure the correct callbacks are passed for each table type
        let saveCb = (type === 'camiones' || type === 'sucursales' || type === 'choferes') ? this.handleInlineSave.bind(this) : null;
        let deleteCb = this.handleDelete.bind(this);
        let dispatchCb = (type === 'pedidos') ? this.handleMarkAsDispatched.bind(this) : null;

        this.uiManager.updateTable(type, saveCb, deleteCb, dispatchCb);
        this.uiManager.updateDashboard();
        this.updateRouteRelatedUI(); // Update selectors/dashboard elements that depend on new data
    }

    handleInlineSave(type, index, updatedData) {
        const item = this.dataStore.getAll(type)[index];
        if (item) {
            Object.assign(item, updatedData);
            this.uiManager.showNotification('Registro actualizado exitosamente', false); // Changed to explicitly success
            this.uiManager.updateTable(type, this.handleInlineSave.bind(this), this.handleDelete.bind(this));
            this.uiManager.updateDashboard();
        } else {
            this.uiManager.showNotification('Error al actualizar: Item no encontrado', true);
        }
    }

    handleDelete(type, index) {
        this.uiManager.showConfirmation(
            '¿Está seguro que desea eliminar este registro? Esta acción no se puede deshacer.',
            () => {
                try {
                    if (type === 'validatedRoutes') {
                        this.dataStore.removeValidatedRoute(index);
                        this.uiManager.updateValidatedRoutesList(this.handleDelete.bind(this));
                    } else {
                        this.dataStore.remove(type, index);
                        // Re-render table with correct callbacks
                        let saveCb = (type === 'camiones' || type === 'sucursales' || type === 'choferes') ? this.handleInlineSave.bind(this) : null;
                        let dispatchCb = (type === 'pedidos') ? this.handleMarkAsDispatched.bind(this) : null;
                        this.uiManager.updateTable(type, saveCb, this.handleDelete.bind(this), dispatchCb);
                    }
                    this.uiManager.updateDashboard();
                    this.updateRouteRelatedUI(); // Refresh selectors if an item relevant to routes was deleted
                    this.uiManager.showNotification('Registro eliminado exitosamente', false);
                } catch (error) {
                    this.uiManager.showNotification(`Error al eliminar: ${error.message}`, true);
                }
            },
            "Eliminar Registro"
        );
    }

    handleMarkAsDispatched(index) {
        // As per instruction, removing the blocking confirm dialog
        // The success message will now be shown directly in the toast.
        try {
            this.dataStore.updatePedidoStatus(index, 'Despachado');
            this.uiManager.updateTable('pedidos', null, this.handleDelete.bind(this), this.handleMarkAsDispatched.bind(this));
            this.uiManager.updateDashboard();
            this.updateRouteRelatedUI(); // Update pending orders selector
            this.uiManager.showNotification('Pedido marcado como "Despachado" exitosamente.', false); // Changed to explicitly success
        } catch (error) {
            this.uiManager.showNotification(`Error al marcar pedido como despachado: ${error.message}`, true);
        }
    }

    updateRouteRelatedUI() {
        const camiones = this.dataStore.getAll('camiones');
        // Filter for only 'Pendiente' orders
        const pendingPedidos = this.dataStore.getAll('pedidos').filter(p => p.estado === 'Pendiente' || p.estado === 'En Proceso');
        this.uiManager.updateSelectors(camiones, pendingPedidos);
    }

    updateFuelInput() {
        const selectedPedidoIndex = document.getElementById('selectPedidoRuta').value;
        const selectedCamionPlaca = document.getElementById('selectCamion').value;
        this.uiManager.calculateAndSetFuel(selectedPedidoIndex, selectedCamionPlaca);
    }

    async calculateRoutes() {
        const sucursales = this.dataStore.getAll('sucursales');
        const camiones = this.dataStore.getAll('camiones');
        
        if(sucursales.length === 0 || camiones.length === 0) {
            this.uiManager.showNotification('Debe registrar al menos una sucursal y un camión para calcular rutas', true);
            return;
        }

        const routes = this.routeCalculator.calculateOptimalRoutes(sucursales, camiones);
        await this.mapManager.displayRoutes(routes); // Await for OSRM distances to be updated
        this.uiManager.displayOptimalRouteInfo(routes);
        this.uiManager.showNotification('Rutas óptimas calculadas y mostradas en el mapa.', false); // Changed to explicitly success
    }

    async handleRutaSubmit(e) {
        e.preventDefault();
        try {
            const selectedOptions = Array.from(document.getElementById('selectPedidoRuta').selectedOptions)
                                        .map(opt => opt.value)
                                        .filter(v => v !== '');
            const camionPlaca = document.getElementById('selectCamion').value;
            const cantidadCombustible = parseFloat(document.getElementById('cantidadCombustible').value);
            
            if (selectedOptions.length === 0 || !camionPlaca) {
                this.uiManager.showNotification('Por favor, seleccione al menos un pedido y un camión válidos.', true);
                return;
            }

            // Resolve pedido objects and ensure none are already 'Despachado'
            const pedidos = selectedOptions.map(idx => this.dataStore.getAll('pedidos')[idx]);
            if (pedidos.some(p => !p)) {
                this.uiManager.showNotification('Uno o más pedidos seleccionados no son válidos.', true);
                return;
            }
            if (pedidos.some(p => p.estado === 'Despachado')) {
                this.uiManager.showNotification('Uno o más pedidos seleccionados ya han sido despachados.', true);
                return;
            }

            const totalCantidad = pedidos.reduce((s, p) => s + parseFloat(p.cantidad), 0);

            const camion = this.dataStore.getAll('camiones').find(c => c.placa === camionPlaca);
            if (!camion) {
                this.uiManager.showNotification('Camión seleccionado no encontrado.', true);
                return;
            }

            if (totalCantidad > camion.capacidad) {
                this.uiManager.showNotification(`La suma de pedidos (${totalCantidad} Ton) excede la capacidad del camión (${camion.capacidad} Ton).`, true);
                return;
            }

            const tempCamion = { ...camion, combustibleActual: cantidadCombustible };
            // Use new multi-pedido route calculation
            this.currentRoute = this.routeCalculator.calculateMultiStopRoute(pedidos.map(p => p.sucursal), tempCamion, totalCantidad);
            this.currentRoute.pedidoIndices = selectedOptions.map(v => parseInt(v, 10));
            
            await this.mapManager.displaySingleRoute(this.currentRoute);

            // Calculate adjusted combustible necesario based on the actual OSRM distance
            const combustibleNecesarioRaw = this.currentRoute.distanciaTotal / parseFloat(this.currentRoute.camion.kmPorGalon);
            this.currentRoute.combustibleNecesario = Math.ceil(combustibleNecesarioRaw * 1.10); // Store adjusted value

            this.uiManager.displaySingleRouteInfo(
                this.currentRoute,
                this.dataStore.getAll('camiones'),
                pedidos, // pass array of pedidos for UI
                cantidadCombustible,
                this.recalculateSingleRoute.bind(this)
            );
            
            document.getElementById('rutaCalculada').style.display = 'block';
            this.uiManager.showNotification('Ruta calculada exitosamente', false);
        } catch (error) {
            console.error(error);
            this.uiManager.showNotification(`Error al calcular ruta: ${error.message}`, true);
        }
    }

    async recalculateSingleRoute(newCamionPlaca) {
        if (!this.currentRoute) return;

        const nuevoCamion = this.dataStore.getAll('camiones').find(c => c.placa === newCamionPlaca);
        if (nuevoCamion) {
            // Use the currently available fuel from the currentRoute object, which was taken from the input field
            const originalCantidadCombustible = this.currentRoute.camion.combustibleActual; 
            const originalPedido = this.dataStore.getAll('pedidos')[this.currentRoute.pedidoIndex];

            const tempNewCamion = { ...nuevoCamion, combustibleActual: originalCantidadCombustible };
            this.currentRoute = this.routeCalculator.calculateSingleRouteWithCosts(originalPedido.sucursal, tempNewCamion, originalPedido.cantidad);
            this.currentRoute.pedidoIndex = originalPedido.pedidoIndex; 
            
            await this.mapManager.displaySingleRoute(this.currentRoute);

            // Recalculate adjusted combustible necesario for the new truck
            const combustibleNecesarioRaw = this.currentRoute.distanciaTotal / parseFloat(this.currentRoute.camion.kmPorGalon);
            this.currentRoute.combustibleNecesario = Math.ceil(combustibleNecesarioRaw * 1.10); // Store adjusted value
            
            this.uiManager.displaySingleRouteInfo(
                this.currentRoute,
                this.dataStore.getAll('camiones'),
                originalPedido,
                originalCantidadCombustible,
                this.recalculateSingleRoute.bind(this)
            );
            this.uiManager.showNotification('Ruta recalculada con el nuevo camión.', false); // Changed to explicitly success
        } else {
            this.uiManager.showNotification('Seleccione un camión válido para recalcular.', true);
        }
    }

    validarRuta() {
        try {
            if (!this.currentRoute) throw new Error('No hay ruta para validar');
            
            if (this.currentRoute.costoTotal === undefined || this.currentRoute.costoCombustible === undefined) {
                this.uiManager.showNotification('La ruta no tiene todos los costos calculados. Recalcule la ruta primero.', true);
                return;
            }

            const combustibleNecesario = this.currentRoute.combustibleNecesario;
            const combustibleDisponible = this.currentRoute.combustibleDisponible || 0;

            // Determine pedido indices involved in the current route (support single or multiple)
            const pedidoIndices = this.currentRoute.pedidoIndices && Array.isArray(this.currentRoute.pedidoIndices)
                ? this.currentRoute.pedidoIndices
                : (this.currentRoute.pedidoIndex !== undefined ? [this.currentRoute.pedidoIndex] : []);

            // Collect pedidos objects for validation checks
            const pedidos = pedidoIndices.map(i => this.dataStore.getAll('pedidos')[i]).filter(Boolean);

            let warnings = [];
            if (combustibleNecesario > combustibleDisponible) {
                warnings.push("El combustible disponible no es suficiente para esta ruta.");
            }

            // Check capacity against total carga in the route
            const cargaTotal = this.currentRoute.cargaTotal !== undefined
                ? parseFloat(this.currentRoute.cargaTotal)
                : pedidos.reduce((s, p) => s + (parseFloat(p.cantidad) || 0), 0);

            if (cargaTotal > this.currentRoute.camion.capacidad) {
                warnings.push(`La carga total (${cargaTotal} Ton) excede la capacidad del camión (${this.currentRoute.camion.capacidad} Ton).`);
            }

            const executeValidation = () => {
                this.currentRoute.status = 'Validada';
                // Ensure route stores involved pedido indices for traceability
                this.currentRoute.pedidoIndices = pedidoIndices;
                this.dataStore.addValidatedRoute(this.currentRoute);
                
                // Mark all involved pedidos as 'En Proceso'
                pedidoIndices.forEach(idx => {
                    if (this.dataStore.getAll('pedidos')[idx]) {
                        this.dataStore.updatePedidoStatus(idx, 'En Proceso');
                    }
                });

                // Refresh pedidos table with proper callbacks
                this.uiManager.updateTable('pedidos', null, this.handleDelete.bind(this), this.handleMarkAsDispatched.bind(this));

                this.currentRoute = null;
                this.uiManager.clearRouteDetails();
                this.mapManager.clearMap();
                
                this.uiManager.updateValidatedRoutesList(this.handleDelete.bind(this));
                this.uiManager.updateDashboard();
                this.updateRouteRelatedUI();
                this.uiManager.showNotification('Ruta validada exitosamente y pedidos marcados como "En Proceso".', false);
            };

            if (warnings.length > 0) {
                const message = `<strong>Advertencias encontradas:</strong><ul>${warnings.map(w => `<li>${w}</li>`).join('')}</ul>¿Desea validar la ruta de todos modos?`;
                this.uiManager.showConfirmation(message, executeValidation, "Advertencia de Validación");
            } else {
                executeValidation();
            }

        } catch (error) {
            this.uiManager.showNotification(`Error al validar ruta: ${error.message}`, true);
        }
    }

    handleDownloadData() {
        try {
            const data = this.dataStore.getData();
            const dataStr = JSON.stringify(data, null, 2);

            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'superlogic_data.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.uiManager.showNotification('Datos descargados exitosamente.', false); // Changed to explicitly success
        } catch (error) {
            console.error('Error downloading data:', error);
            this.uiManager.showNotification(`Error al descargar datos: ${error.message}`, true);
        }
    }

    handleResetApp() {
        this.uiManager.showConfirmation(
            "¿Está seguro de que desea reiniciar la aplicación? Esta acción <strong>ELIMINARÁ PERMANENTEMENTE</strong> todos los camiones, sucursales, choferes, pedidos y rutas validadas. No se puede deshacer.",
            () => {
                try {
                    this.dataStore.clearAll();
                    this.initializeTables();
                    this.uiManager.updateDashboard();
                    this.updateRouteRelatedUI();
                    this.uiManager.showNotification('La aplicación ha sido reiniciada y todos los datos han sido borrados.', false);
                } catch (error) {
                    this.uiManager.showNotification(`Error al reiniciar la aplicación: ${error.message}`, true);
                }
            },
            "Reiniciar Aplicación"
        );
    }

    handleUploadData() {
        const fileInput = document.getElementById('uploadDataInput');
        const file = fileInput.files[0];

        if (!file) {
            this.uiManager.showNotification('Por favor, seleccione un archivo JSON para cargar.', true);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsedData = JSON.parse(e.target.result);
                this.dataStore.setData(parsedData);
                
                this.uiManager.updateTable('camiones', this.handleInlineSave.bind(this), this.handleDelete.bind(this));
                this.uiManager.updateTable('sucursales', this.handleInlineSave.bind(this), this.handleDelete.bind(this));
                this.uiManager.updateTable('choferes', this.handleInlineSave.bind(this), this.handleDelete.bind(this));
                // Ensure correct callbacks for pedidos table after upload
                this.uiManager.updateTable('pedidos', null, this.handleDelete.bind(this), this.handleMarkAsDispatched.bind(this));
                this.uiManager.updateValidatedRoutesList(this.handleDelete.bind(this));
                this.uiManager.updateDashboard();
                this.updateRouteRelatedUI();
                this.uiManager.showNotification('Datos cargados exitosamente.', false); // Changed to explicitly success
                fileInput.value = '';
            } catch (error) {
                console.error('Error loading data:', error);
                this.uiManager.showNotification(`Error al cargar datos: ${error.message}. Asegúrese de que el archivo es un JSON válido con la estructura esperada.`, true);
            }
        };
        reader.onerror = (error) => {
            console.error('FileReader error:', error);
            this.uiManager.showNotification('Error al leer el archivo.', true);
        };
        reader.readAsText(file);
    }

    handleGenerateCamionesReport() {
        try {
            const camiones = this.dataStore.getAll('camiones');
            if (camiones.length === 0) {
                this.uiManager.showNotification('No hay camiones registrados para generar un reporte.', true);
                return;
            }

            let csvContent = "Placa,Marca,Año,Capacidad (Ton),Capacidad Tanque (gal),Costo Combustible ($/gal),KM/Galón\n";

            camiones.forEach(camion => {
                const row = [
                    camion.placa,
                    camion.marca,
                    camion.anioCompra,
                    camion.capacidad,
                    camion.capacidadTanque,
                    camion.costoCombustible,
                    camion.kmPorGalon
                ].map(field => `"${field}"`).join(',');
                csvContent += row + "\n";
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'reporte_camiones.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.uiManager.showNotification('Reporte de camiones generado exitosamente.', false); // Changed to explicitly success

        } catch (error) {
            console.error('Error generating camiones report:', error);
            this.uiManager.showNotification(`Error al generar reporte de camiones: ${error.message}`, true);
        }
    }
}

// Inicializar la aplicación y exponerla globalmente
const app = new App();
window.app = app;