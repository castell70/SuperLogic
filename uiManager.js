import { RouteCalculator } from './routeCalculator.js'; // Import RouteCalculator here to use it for fuel calculation
export class UIManager {
    constructor(dataStore, mapManager, appConstants) {
        this.dataStore = dataStore;
        this.mapManager = mapManager; // mapManager might be null initially, set by setter
        this.toast = new bootstrap.Toast(document.getElementById('notificationToast'));
        this.confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
        this.COSTO_KM = appConstants.COSTO_KM;
        this.AVERAGE_SPEED_KMH = appConstants.AVERAGE_SPEED_KMH;
        this.routeCalculator = new RouteCalculator(); // Initialize RouteCalculator
    }

    setMapManager(mapManager) {
        this.mapManager = mapManager;
    }

    showSection(sectionId) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`.nav-link[data-section="${sectionId}"]`).classList.add('active');

        document.querySelectorAll('.section').forEach(section => {
            section.style.display = 'none';
        });
        document.getElementById(sectionId).style.display = 'block';
        
        if(sectionId === 'rutas') {
            this.mapManager.initializeMap();
        }
    }

    showConfirmation(message, onConfirm, title = "Confirmación Requerida") {
        const messageEl = document.getElementById('confirmationModalMessage');
        const titleEl = document.getElementById('confirmationModalLabel');
        const confirmBtn = document.getElementById('confirmActionBtn');

        messageEl.innerHTML = message;
        titleEl.innerHTML = `<i class="fas fa-exclamation-triangle me-2"></i> ${title}`;

        // Remove old listeners to avoid multiple executions
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newConfirmBtn.addEventListener('click', () => {
            onConfirm();
            this.confirmationModal.hide();
        });

        this.confirmationModal.show();
    }

    showNotification(message, isError = false) {
        const toastEl = document.getElementById('notificationToast');
        const titleEl = document.getElementById('toastTitle');
        const messageEl = document.getElementById('toastMessage');
        const iconEl = toastEl.querySelector('.fas');

        toastEl.classList.remove('bg-danger', 'text-white', 'bg-success');
        if (isError) {
            toastEl.classList.add('bg-danger', 'text-white');
            titleEl.textContent = 'Error';
            iconEl.className = 'fas fa-exclamation-circle me-2';
        } else {
            toastEl.classList.add('bg-success', 'text-white');
            titleEl.textContent = 'Éxito';
            iconEl.className = 'fas fa-check-circle me-2';
        }

        messageEl.textContent = message;
        this.toast.show();
    }

    updateDashboard() {
        document.getElementById('totalCamiones').textContent = this.dataStore.getAll('camiones').length;
        document.getElementById('totalSucursales').textContent = this.dataStore.getAll('sucursales').length;
        document.getElementById('totalChoferes').textContent = this.dataStore.getAll('choferes').length;
        document.getElementById('totalRutasValidadas').textContent = this.dataStore.getAll('validatedRoutes').length;
        // Updated to count both 'Pendiente' and 'En Proceso' as pending for the dashboard
        document.getElementById('totalPedidosPendientes').textContent = this.dataStore.getAll('pedidos').filter(p => p.estado === 'Pendiente' || p.estado === 'En Proceso').length;
        // New: count delivered orders
        const entregadosCount = this.dataStore.getAll('pedidos').filter(p => p.estado === 'Entregado').length;
        // Ensure the element exists before updating to avoid errors on pages without the dashboard
        const entregadosEl = document.getElementById('totalPedidosEntregados');
        if (entregadosEl) entregadosEl.textContent = entregadosCount;
    }

    updateTable(type, onSaveCallback, onDeleteCallback, onDispatchCallback = null, onDeliverCallback = null) {
        const tbody = document.querySelector(`#${type}Table tbody`);
        if (!tbody) return;
        tbody.innerHTML = '';
        
        this.dataStore.getAll(type).forEach((item, index) => {
            const tr = document.createElement('tr');
            
            switch(type) {
                case 'camiones':
                    tr.innerHTML = `
                        <td><input type="text" class="form-control form-control-sm" value="${item.placa}" data-field="placa" data-original="${item.placa}"></td>
                        <td><input type="text" class="form-control form-control-sm" value="${item.marca}" data-field="marca" data-original="${item.marca}"></td>
                        <td><input type="number" class="form-control form-control-sm" value="${item.anioCompra}" data-field="anioCompra" data-original="${item.anioCompra}"></td>
                        <td><input type="number" class="form-control form-control-sm w-50 d-inline-block" value="${item.capacidad}" data-field="capacidad" data-original="${item.capacidad}"> Ton</td>
                        <td><input type="number" class="form-control form-control-sm w-50 d-inline-block" value="${item.capacidadTanque}" data-field="capacidadTanque" data-original="${item.capacidadTanque}"> gal</td>
                        <td>$<input type="number" step="0.01" class="form-control form-control-sm d-inline-block w-50" value="${item.costoCombustible}" data-field="costoCombustible" data-original="${item.costoCombustible}">/gal</td>
                        <td><input type="number" step="0.1" class="form-control form-control-sm w-50 d-inline-block" value="${item.kmPorGalon}" data-field="kmPorGalon" data-original="${item.kmPorGalon}"> km/gal</td>
                        <td>
                            <button class="btn btn-sm btn-success me-2 btn-save" style="display:none;" data-type="camiones" data-index="${index}">
                                <i class="fas fa-save"></i>
                            </button>
                            <button class="btn btn-sm btn-secondary me-2 btn-cancel" style="display:none;" data-type="camiones" data-index="${index}">
                                <i class="fas fa-times"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" data-type="camiones" data-action="delete" data-index="${index}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
                    break;
                case 'sucursales':
                    tr.innerHTML = `
                        <td><input type="text" class="form-control form-control-sm" value="${item.nombre}" data-field="nombre" data-original="${item.nombre}"></td>
                        <td><input type="number" step="any" class="form-control form-control-sm" value="${item.latitud}" data-field="latitud" data-original="${item.latitud}"></td>
                        <td><input type="number" step="any" class="form-control form-control-sm" value="${item.longitud}" data-field="longitud" data-original="${item.longitud}"></td>
                        <td><input type="number" class="form-control form-control-sm w-50 d-inline-block" value="${item.demanda}" data-field="demanda" data-original="${item.demanda}"> Ton</td>
                        <td>
                            <button class="btn btn-sm btn-success me-2 btn-save" style="display:none;" data-type="sucursales" data-index="${index}">
                                <i class="fas fa-save"></i>
                            </button>
                            <button class="btn btn-sm btn-secondary me-2 btn-cancel" style="display:none;" data-type="sucursales" data-index="${index}">
                                <i class="fas fa-times"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" data-type="sucursales" data-action="delete" data-index="${index}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
                    break;
                case 'choferes':
                    tr.innerHTML = `
                        <td><input type="text" class="form-control form-control-sm" value="${item.nombre}" data-field="nombre" data-original="${item.nombre}"></td>
                        <td><input type="text" class="form-control form-control-sm" value="${item.licencia}" data-field="licencia" data-original="${item.licencia}"></td>
                        <td>$<input type="number" step="0.01" class="form-control form-control-sm d-inline-block w-50" value="${item.salario !== undefined ? item.salario : ''}" data-field="salario" data-original="${item.salario !== undefined ? item.salario : ''}"></td>
                        <td><input type="text" class="form-control form-control-sm" value="${item.telefono}" data-field="telefono" data-original="${item.telefono}"></td>
                        <td>
                            <button class="btn btn-sm btn-success me-2 btn-save" style="display:none;" data-type="choferes" data-index="${index}">
                                <i class="fas fa-save"></i>
                            </button>
                            <button class="btn btn-sm btn-secondary me-2 btn-cancel" style="display:none;" data-type="choferes" data-index="${index}">
                                <i class="fas fa-times"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" data-type="choferes" data-action="delete" data-index="${index}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
                    break;
                case 'pedidos':
                    let statusClass = '';
                    switch(item.estado) {
                        case 'Pendiente':
                            statusClass = 'bg-warning text-dark';
                            break;
                        case 'En Proceso':
                            statusClass = 'bg-info text-white';
                            break;
                        case 'Despachado':
                            statusClass = 'bg-primary text-white';
                            break;
                        case 'Entregado':
                            statusClass = 'bg-success text-white';
                            break;
                        default:
                            statusClass = 'bg-secondary';
                    }

                    tr.innerHTML = `
                        <td>${item.sucursal.nombre}</td>
                        <td>${item.cantidad}</td>
                        <td>${item.fechaEnvio}</td>
                        <td>${item.fechaDespacho || 'N/A'}</td>
                        <td><span class="badge ${statusClass}">${item.estado}</span></td>
                        <td>
                            <button class="btn btn-sm btn-danger me-2" data-type="pedidos" data-action="delete" data-index="${index}">
                                <i class="fas fa-trash"></i>
                            </button>
                            ${item.estado === 'En Proceso' ? 
                                `<button class="btn btn-sm btn-primary me-2" data-type="pedidos" data-action="dispatch" data-index="${index}">
                                    <i class="fas fa-check-circle"></i> Despachado
                                </button>` : ''}
                            ${item.estado === 'Despachado' ? 
                                `<button class="btn btn-sm btn-success" data-type="pedidos" data-action="delivered" data-index="${index}">
                                    <i class="fas fa-truck"></i> Entregado
                                </button>` : ''}
                        </td>
                    `;
                    break;
                case 'validatedRoutes':
                    tr.innerHTML = `
                        <td>${item.camion.placa}</td>
                        <td>${item.sucursales[0].nombre}</td>
                        <td>${item.distanciaTotal ? item.distanciaTotal.toFixed(2) : 'N/A'}</td>
                        <td>${item.cargaTotal ? item.cargaTotal.toFixed(2) : 'N/A'}</td>
                        <td>${item.costoCombustible ? item.costoCombustible.toFixed(2) : 'N/A'}</td>
                        <td>${item.costoTotal ? item.costoTotal.toFixed(2) : 'N/A'}</td>
                        <td>${item.fechaValidacion || 'N/A'}</td>
                        <td><span class="badge bg-success">${item.status}</span></td>
                        <td>
                            <button class="btn btn-sm btn-danger" data-type="validatedRoutes" data-action="delete" data-index="${index}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
                    break;
            }
            tbody.appendChild(tr);

            if (type === 'camiones' || type === 'sucursales' || type === 'choferes') {
                const row = tbody.lastElementChild;
                const inputs = row.querySelectorAll('input');
                const saveBtn = row.querySelector('.btn-save');
                const cancelBtn = row.querySelector('.btn-cancel');

                inputs.forEach(input => {
                    input.addEventListener('input', () => {
                        const hasChanges = Array.from(inputs).some(inp => 
                            inp.value !== inp.dataset.original
                        );
                        saveBtn.style.display = hasChanges ? 'inline-block' : 'none';
                        cancelBtn.style.display = hasChanges ? 'inline-block' : 'none';
                    });
                });

                saveBtn.addEventListener('click', () => {
                    const updatedData = {};
                    inputs.forEach(input => {
                        if (input.type === 'number') {
                            updatedData[input.dataset.field] = parseFloat(input.value);
                        } else {
                            updatedData[input.dataset.field] = input.value;
                        }
                    });
                    onSaveCallback(type, index, updatedData);
                    // Re-render the table to show updated data and reset buttons
                    this.updateTable(type, onSaveCallback, onDeleteCallback, onDispatchCallback);
                });

                cancelBtn.addEventListener('click', () => {
                    inputs.forEach(input => {
                        input.value = input.dataset.original;
                    });
                    saveBtn.style.display = 'none';
                    cancelBtn.style.display = 'none';
                });
            }

            // Attach listeners for delete buttons
            tr.querySelectorAll('.btn-danger[data-action="delete"]').forEach(button => {
                button.addEventListener('click', (e) => {
                    const index = parseInt(e.currentTarget.dataset.index);
                    onDeleteCallback(type, index);
                });
            });
            
            // Dispatch (Despachado) button
            tr.querySelectorAll('.btn-primary[data-action="dispatch"]').forEach(button => {
                button.addEventListener('click', (e) => {
                    const index = parseInt(e.currentTarget.dataset.index);
                    if (onDispatchCallback) {
                        onDispatchCallback(index);
                    }
                });
            });

            // Deliver (Entregado) button
            tr.querySelectorAll('.btn-success[data-action="delivered"]').forEach(button => {
                button.addEventListener('click', (e) => {
                    const index = parseInt(e.currentTarget.dataset.index);
                    if (onDeliverCallback) {
                        onDeliverCallback(index);
                    }
                });
            });
        });
        this.updateDashboard();
    }

    displayOptimalRouteInfo(routes) {
        const container = document.getElementById('rutasCalculadas');
        container.innerHTML = '';

        if (routes.length === 0) {
            container.innerHTML = '<p>No se pudieron calcular rutas óptimas con los datos actuales.</p>';
            return;
        }

        routes.forEach((route, index) => {
            const div = document.createElement('div');
            div.className = 'route-info mb-3';
            
            let content = `
                <h4>Ruta Optima ${index + 1}</h4>
                <p>Camión: ${route.camion.placa}</p>
                <p>Distancia total: ${route.distanciaTotal.toFixed(2)} km</p>
                <p>Carga total: ${route.cargaTotal.toFixed(2)} Ton</p>
                <p>Sucursales: ${route.sucursales.map(s => s.nombre).join(' → ')}</p>
            `;

            if(route.requiereCombustible) {
                content += `<p class="route-warning">⚠️ Esta ruta requiere reabastecimiento de combustible</p>`;
            }

            div.innerHTML = content;
            container.appendChild(div);
        });
    }

    updatePedidoSucursalSelector(sucursales) {
        const selectSucursalPedido = document.getElementById('selectSucursalPedido');
        
        selectSucursalPedido.innerHTML = '<option value="">Seleccione una sucursal</option>';
        sucursales.forEach(sucursal => {
            selectSucursalPedido.innerHTML += `<option value="${sucursal.nombre}">${sucursal.nombre}</option>`;
        });
    }

    updateSelectors(camiones, pendingPedidos, choferes = []) {
        const selectCamion = document.getElementById('selectCamion');
        const selectPedidoRuta = document.getElementById('selectPedidoRuta');
        const selectChofer = document.getElementById('selectChofer');
        
        selectCamion.innerHTML = '<option value="">Seleccione un camión</option>';
        // Keep the placeholder option, preserve multi-select behavior
        selectPedidoRuta.innerHTML = '<option value="">Seleccione uno o más pedidos</option>';
        if (selectChofer) selectChofer.innerHTML = '<option value="">Seleccione un chofer</option>';
        
        // Only include camiones disponibles (undefined or true means available)
        camiones.filter(c => c.disponible !== false).forEach(camion => {
            selectCamion.innerHTML += `<option value="${camion.placa}">${camion.placa} - ${camion.marca} (${camion.capacidad} Ton)</option>`;
        });
        
        // Populate the pedido selector with only 'Pendiente' orders (allow selecting multiple)
        const filteredPedidos = pendingPedidos.filter(p => p.estado === 'Pendiente');
        filteredPedidos.forEach((pedido) => {
            const originalIndex = this.dataStore.getAll('pedidos').findIndex(p => p === pedido);
            selectPedidoRuta.innerHTML += `<option value="${originalIndex}">${pedido.sucursal.nombre} (${pedido.cantidad} Ton) - ${pedido.fechaEnvio} [${pedido.estado}]</option>`;
        });

        // Populate chofer selector with name and salary displayed; use licencia as value
        // Only include choferes disponibles
        if (selectChofer && Array.isArray(choferes)) {
            choferes.filter(ch => ch.disponible !== false).forEach(chofer => {
                selectChofer.innerHTML += `<option value="${chofer.licencia}">${chofer.nombre} — $${parseFloat(chofer.salario || 0).toFixed(2)}</option>`;
            });
        }
    }

    // New method to calculate and set fuel in the input field
    calculateAndSetFuel(selectedPedidoIndex, selectedCamionPlaca) {
        const cantidadCombustibleInput = document.getElementById('cantidadCombustible');
        // If multi-select, selectedPedidoIndex might be an empty string or single string; fetch selected options
        const selectPedido = document.getElementById('selectPedidoRuta');
        const selectedOptions = Array.from(selectPedido ? selectPedido.selectedOptions : []).map(o => o.value).filter(v => v !== '');

        if (selectedOptions.length === 0 || selectedCamionPlaca === '') {
            cantidadCombustibleInput.value = '';
            return;
        }

        const camion = this.dataStore.getAll('camiones').find(c => c.placa === selectedCamionPlaca);
        if (!camion || camion.kmPorGalon <= 0) {
            cantidadCombustibleInput.value = '';
            return;
        }

        // Build sucursales array and total carga
        const pedidos = selectedOptions.map(idx => this.dataStore.getAll('pedidos')[idx]).filter(Boolean);
        if (pedidos.length === 0) {
            cantidadCombustibleInput.value = '';
            return;
        }

        const sucursales = pedidos.map(p => p.sucursal);
        const totalCarga = pedidos.reduce((s, p) => s + parseFloat(p.cantidad), 0);

        // Use the new multi-stop calculator when multiple pedidos are selected
        let tempRoute;
        if (sucursales.length > 1) {
            tempRoute = this.routeCalculator.calculateMultiStopRoute(sucursales, camion, totalCarga);
        } else {
            tempRoute = this.routeCalculator.calculateSingleRouteWithCosts(sucursales[0], camion, pedidos[0].cantidad);
        }

        let combustibleNecesario = tempRoute.distanciaTotal / parseFloat(camion.kmPorGalon);
        combustibleNecesario = Math.ceil(combustibleNecesario * 1.10); // Add 10% and round up
        cantidadCombustibleInput.value = combustibleNecesario.toFixed(0); // Display as integer
    }

    displaySingleRouteInfo(route, allCamiones, selectedPedidos, currentFuel, chofer = null) {
        const container = document.getElementById('rutaDetalles');
        
        // route may represent multiple pedidos; selectedPedidos can be an array
        const combustibleNecesario = route.combustibleNecesario; 
        const combustibleDisponible = currentFuel;
        const costoCombustible = combustibleNecesario * parseFloat(route.camion.costoCombustible);
        const costoFleteOperativo = route.distanciaTotal * this.COSTO_KM;

        // Determine "Otros Costos" - if a chofer is selected, add 10% of their salary
        let otrosCostosVal = 0;
        if (chofer && chofer.salario !== undefined && !isNaN(parseFloat(chofer.salario))) {
            otrosCostosVal = parseFloat(chofer.salario) * 0.10; // 10% del salario del chofer
        } else if (route.otrosCostos !== undefined) {
            otrosCostosVal = parseFloat(route.otrosCostos) || 0;
        }

        const costoTotal = costoFleteOperativo + costoCombustible + otrosCostosVal;
        const tiempoEstimadoHoras = route.distanciaTotal / this.AVERAGE_SPEED_KMH;
        const tiempoEstimado = `${Math.floor(tiempoEstimadoHoras)}h ${Math.round((tiempoEstimadoHoras % 1) * 60)}min`;

        route.costoCombustible = costoCombustible;
        route.costoTotal = costoTotal;
        route.combustibleNecesarioDisplay = combustibleNecesario;
        route.combustibleDisponible = combustibleDisponible;
        route.tiempoEstimado = tiempoEstimado;
        route.otrosCostos = otrosCostosVal;

        // Build pedidos summary (single or multiple)
        let pedidosHtml = '';
        if (Array.isArray(selectedPedidos)) {
            pedidosHtml = selectedPedidos.map(p => `<li>${p.sucursal.nombre} — ${p.cantidad} Ton — ${p.fechaEnvio}</li>`).join('');
            pedidosHtml = `<p><strong>Pedidos incluidos:</strong></p><ul>${pedidosHtml}</ul>`;
        } else {
            pedidosHtml = `<p><strong>Pedido:</strong> ${selectedPedidos.sucursal.nombre} (${selectedPedidos.cantidad} Ton)</p>`;
        }

        // Build cost breakdown popup content (without repeating the total beside it)
        const costoCombustibleVal = costoCombustible || 0;
        const costoFleteOperativoVal = costoFleteOperativo || 0;
        const costoTotalVal = costoTotal || (costoCombustibleVal + costoFleteOperativoVal + otrosCostosVal);

        const breakdownPopup = `
            <div class="cost-breakdown" tabindex="0" aria-label="Desglose del costo del flete">
                <span style="font-weight:700; margin-left:8px; text-decoration:underline dotted; cursor:help;">(Ver desglose)</span>
                <div class="cost-breakdown-popup" role="tooltip">
                    <table>
                        <tr><th>Concepto</th><th style="text-align:right">Monto ($)</th></tr>
                        <tr><td>Costo Combustible</td><td style="text-align:right">$${costoCombustibleVal.toFixed(2)}</td></tr>
                        <tr><td>Costo Flete Operativo (km x $/km)</td><td style="text-align:right">$${costoFleteOperativoVal.toFixed(2)}</td></tr>
                        <tr><td>Otros Costos (10% Salario Chofer)</td><td style="text-align:right">$${otrosCostosVal.toFixed(2)}</td></tr>
                        <tr><th>Total</th><th style="text-align:right">$${costoTotalVal.toFixed(2)}</th></tr>
                    </table>
                </div>
            </div>
        `;

        // Chofer info block
        const choferHtml = chofer ? `<p><strong>Chofer Asignado:</strong> ${chofer.nombre} — Salario: $${parseFloat(chofer.salario || 0).toFixed(2)}</p>` : '';

        // Check if the provided fuel exceeds the needed fuel by 3 or more gallons
        let excesoMensajeHtml = '';
        if (typeof combustibleNecesario === 'number' && typeof combustibleDisponible === 'number') {
            const diferencia = combustibleDisponible - combustibleNecesario;
            if (diferencia >= 3) {
                excesoMensajeHtml = `<p class="text-info"><i class="fas fa-info-circle"></i> Nota: La cantidad de combustible ingresada excede lo esperado por ${diferencia.toFixed(0)} galones.</p>`;
            }
        }

        container.innerHTML = `
            <div class="route-details">
                <div class="row">
                    <div class="col-md-6">
                        ${pedidosHtml}
                        <p><strong>Camión Seleccionado:</strong> ${route.camion.placa} (${route.camion.marca})</p>
                        ${choferHtml}
                        <p><strong>Rendimiento:</strong> ${parseFloat(route.camion.kmPorGalon).toFixed(1)} km/gal</p>
                        <p><strong>Distancia:</strong> ${route.distanciaTotal.toFixed(2)} km</p>
                        <p><strong>Carga Requerida:</strong> ${route.cargaTotal.toFixed(2)} Ton</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Combustible Disponible:</strong> ${combustibleDisponible.toFixed(2)} gal</p>
                        <p><strong>Combustible Necesario:</strong> ${combustibleNecesario.toFixed(0)} gal</p>
                        ${excesoMensajeHtml}
                        <p><strong>Costo de Combustible:</strong> $${costoCombustibleVal.toFixed(2)}</p>
                        <p><strong>Costo Flete Operativo:</strong> $${costoFleteOperativoVal.toFixed(2)}</p>
                        <p><strong>Total Flete:</strong> $${costoTotalVal.toFixed(2)} ${breakdownPopup}</p>
                        <p><strong>Tiempo Estimado en Ruta:</strong> ${tiempoEstimado}</p>
                        ${combustibleNecesario > combustibleDisponible ? 
                            '<p class="text-warning"><i class="fas fa-exclamation-triangle"></i> El combustible disponible no es suficiente para completar la ruta</p>' : ''}
                        ${route.cargaTotal > route.camion.capacidad ?
                            `<p class="text-danger"><i class="fas fa-exclamation-triangle"></i> La carga total (${route.cargaTotal} Ton) excede la capacidad del camión (${route.camion.capacidad} Ton)</p>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    clearRouteDetails() {
        document.getElementById('rutaCalculada').style.display = 'none';
        document.getElementById('rutaDetalles').innerHTML = '';
        document.getElementById('rutasCalculadas').innerHTML = '';
    }

    updateValidatedRoutesList(onDeleteCallback) {
        const tbody = document.querySelector(`#rutasValidadasTable tbody`);
        tbody.innerHTML = '';
        
        this.dataStore.getAll('validatedRoutes').forEach((route, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${route.camion.placa}</td>
                <td>${route.sucursales[0].nombre}</td>
                <td>${route.distanciaTotal ? route.distanciaTotal.toFixed(2) : 'N/A'}</td>
                <td>${route.cargaTotal ? route.cargaTotal.toFixed(2) : 'N/A'}</td>
                <td>${route.costoCombustible ? route.costoCombustible.toFixed(2) : 'N/A'}</td>
                <td>${route.costoTotal ? route.costoTotal.toFixed(2) : 'N/A'}</td>
                <td>${route.fechaValidacion || 'N/A'}</td>
                <td><span class="badge bg-success">${route.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-danger" data-type="validatedRoutes" data-action="delete" data-index="${index}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('.btn-danger[data-type="validatedRoutes"]').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                onDeleteCallback('validatedRoutes', index);
            });
        });
    }
}