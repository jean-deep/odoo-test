/**
 * app.js - Controlador principal de la interfaz y reactividad
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- ESTADO DE LA APLICACIÓN ---
  let appState = {
    currentClient: '',
    currentTable: '',
    currentView: 'panel-dashboard',
    tempSchemaFields: [], // Para construir nuevas tablas [{name, type, label}]
    sortConfig: { column: null, direction: 'asc' },
    searchQuery: '',
    consoleCollapsed: false
  };

  // --- SELECCIÓN DE ELEMENTOS DEL DOM ---
  const el = {
    clientSelect: document.getElementById('active-client-select'),
    mainClientDisplay: document.getElementById('main-client-display'),
    btnResetDatabase: document.getElementById('btn-reset-database'),
    
    // Navegación
    navItems: document.querySelectorAll('.nav-item'),
    panels: document.querySelectorAll('.panel'),
    
    // Dashboard
    dashboardTableTabs: document.getElementById('dashboard-table-tabs'),
    tableSummaryStats: document.getElementById('table-summary-stats'),
    tableSearch: document.getElementById('table-search'),
    btnAddRecord: document.getElementById('btn-add-record'),
    btnClearTable: document.getElementById('btn-clear-table'),
    dynamicTableHead: document.getElementById('dynamic-table-head'),
    dynamicTableBody: document.getElementById('dynamic-table-body'),
    
    // Modelador de Esquemas
    formCreateClient: document.getElementById('form-create-client'),
    newClientName: document.getElementById('new-client-name'),
    formCreateTable: document.getElementById('form-create-table'),
    newTableName: document.getElementById('new-table-name'),
    fieldNameInput: document.getElementById('field-name-input'),
    fieldTypeSelect: document.getElementById('field-type-select'),
    btnAddFieldToList: document.getElementById('btn-add-field-to-list'),
    schemaBuilderFieldsList: document.getElementById('schema-builder-fields-list'),
    
    // Generador de Datos
    generatorTargetTable: document.getElementById('generator-target-table'),
    generatorQuantity: document.getElementById('generator-quantity'),
    btnRunGeneration: document.getElementById('btn-run-generation'),
    generatorEndpointRoute: document.getElementById('generator-endpoint-route'),
    generatorSchemaDisplay: document.getElementById('generator-schema-display'),
    
    // Consola API
    apiConsole: document.getElementById('api-console'),
    consoleHeaderToggle: document.getElementById('console-header-toggle'),
    btnClearConsole: document.getElementById('btn-clear-console'),
    btnCollapseConsole: document.getElementById('btn-collapse-console'),
    consoleLogsContainer: document.getElementById('console-logs-container'),
    
    // Modal
    addRecordModal: document.getElementById('add-record-modal'),
    modalFormTitle: document.getElementById('modal-form-title'),
    btnClassModalClose: document.getElementById('btn-close-modal'),
    btnCancelModal: document.getElementById('btn-cancel-modal'),
    dynamicEntryForm: document.getElementById('dynamic-entry-form'),
    dynamicFormFieldsContainer: document.getElementById('dynamic-form-fields-container')
  };

  // --- INICIALIZACIÓN ---
  async function init() {
    setupEventListeners();
    setupApiConsole();
    await refreshClientSelector();
    
    // Carga inicial de datos
    if (appState.currentClient) {
      await selectClient(appState.currentClient);
    }
  }

  // --- CONFIGURACIÓN DE EVENTOS PRINCIPALES ---
  function setupEventListeners() {
    // Cambio de Cliente Activo
    el.clientSelect.addEventListener('change', async (e) => {
      await selectClient(e.target.value);
    });

    // Navegación de Paneles (SPA)
    el.navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetId = item.getAttribute('data-target');
        switchView(targetId);
      });
    });

    // Búsqueda en la tabla
    el.tableSearch.addEventListener('input', (e) => {
      appState.searchQuery = e.target.value.toLowerCase().trim();
      renderActiveTableData();
    });

    // Vaciar Tabla
    el.btnClearTable.addEventListener('click', async () => {
      if (!appState.currentClient || !appState.currentTable) return;
      if (confirm(`¿Estás seguro de que deseas vaciar todos los registros de "${appState.currentTable}"?`)) {
        try {
          await window.api.clearTableRecords(appState.currentClient, appState.currentTable);
          renderActiveTableData();
        } catch (err) {
          alert("Error al vaciar la tabla: " + err.message);
        }
      }
    });

    // Restablecer Base de Datos
    if (el.btnResetDatabase) {
      el.btnResetDatabase.addEventListener('click', async () => {
        if (confirm('¿Estás seguro de que deseas restablecer la Base de Datos a los valores por defecto? Se perderán todos los clientes y tablas creados.')) {
          try {
            await window.api.resetDatabase();
            alert('Base de Datos restablecida exitosamente.');
            window.location.reload();
          } catch (err) {
            alert('Error al restablecer la BD: ' + err.message);
          }
        }
      });
    }

    // --- ACCIONES DEL MODELADOR DE ESQUEMAS ---
    // Botón para agregar columna a la lista temporal
    el.btnAddFieldToList.addEventListener('click', () => {
      const name = el.fieldNameInput.value.trim();
      const type = el.fieldTypeSelect.value;

      if (!name) {
        alert("El nombre de la columna es requerido.");
        return;
      }
      
      const normalizedName = name.toLowerCase().replace(/\s+/g, ' ');
      
      // Validar duplicados
      if (appState.tempSchemaFields.some(f => f.name === normalizedName)) {
        alert("Ya existe una columna con ese nombre.");
        return;
      }

      appState.tempSchemaFields.push({
        name: normalizedName,
        type: type,
        label: name // Conserva la capitalización original como etiqueta visual
      });

      el.fieldNameInput.value = '';
      renderSchemaBuilderList();
    });

    // Evitar envío de formulario al presionar Enter en campo de columna
    el.fieldNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        el.btnAddFieldToList.click();
      }
    });

    // Formulario para Crear Cliente
    el.formCreateClient.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = el.newClientName.value.trim();
      try {
        await window.api.createClient(name);
        el.newClientName.value = '';
        await refreshClientSelector();
        // Auto-seleccionar nuevo cliente
        el.clientSelect.value = name;
        await selectClient(name);
        alert(`Cliente "${name}" creado exitosamente.`);
      } catch (err) {
        alert(err.message);
      }
    });

    // Formulario para Crear Tabla
    el.formCreateTable.addEventListener('submit', async (e) => {
      e.preventDefault();
      const tableName = el.newTableName.value.trim();
      
      if (!appState.currentClient) {
        alert("Por favor, selecciona un cliente primero en la barra lateral.");
        return;
      }
      if (appState.tempSchemaFields.length === 0) {
        alert("Debes agregar al menos una columna a la tabla.");
        return;
      }

      try {
        await window.api.createClientTable(appState.currentClient, tableName, appState.tempSchemaFields);
        alert(`Tabla "${tableName}" creada exitosamente para el cliente ${appState.currentClient}.`);
        
        // Limpiar formulario y estado temporal
        el.newTableName.value = '';
        appState.tempSchemaFields = [];
        renderSchemaBuilderList();
        
        // Refrescar y volver al dashboard con la nueva tabla seleccionada
        const normalizedTableName = tableName.trim().toLowerCase().replace(/\s+/g, '_');
        await selectClient(appState.currentClient, normalizedTableName);
        switchView('panel-dashboard');
      } catch (err) {
        alert(err.message);
      }
    });

    // --- ACCIONES DEL GENERADOR DE DATOS ---
    el.generatorTargetTable.addEventListener('change', (e) => {
      appState.currentTable = e.target.value;
      updateGeneratorInfo();
    });

    el.btnRunGeneration.addEventListener('click', async () => {
      if (!appState.currentClient || !appState.currentTable) {
        alert("Selecciona un cliente y una tabla válidos para generar datos.");
        return;
      }

      const quantity = parseInt(el.generatorQuantity.value, 10);
      if (isNaN(quantity) || quantity < 1 || quantity > 500) {
        alert("Ingresa una cantidad de generación válida entre 1 y 500.");
        return;
      }

      try {
        el.btnRunGeneration.disabled = true;
        el.btnRunGeneration.textContent = "Generando...";
        
        // Pasamos la función de generación inteligente como callback al api mock
        await window.api.bulkGenerateRecords(
          appState.currentClient, 
          appState.currentTable, 
          quantity, 
          window.generateMockRow
        );

        // Volver al dashboard y mostrar los nuevos datos
        renderActiveTableData();
        alert(`Se han generado exitosamente ${quantity} registros de prueba.`);
        switchView('panel-dashboard');
      } catch (err) {
        alert("Error al generar registros: " + err.message);
      } finally {
        el.btnRunGeneration.disabled = false;
        el.btnRunGeneration.textContent = "Generar de Forma Automática";
      }
    });

    // --- MANEJO DE MODAL (AGREGAR REGISTRO MANUALMENTE) ---
    el.btnAddRecord.addEventListener('click', () => {
      openAddRecordModal();
    });

    const closeModal = () => el.addRecordModal.classList.remove('active');
    el.btnClassModalClose.addEventListener('click', closeModal);
    el.btnCancelModal.addEventListener('click', closeModal);
    
    el.dynamicEntryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(el.dynamicEntryForm);
      const record = {};
      
      formData.forEach((value, key) => {
        record[key] = value;
      });

      try {
        await window.api.insertTableRecord(appState.currentClient, appState.currentTable, record);
        closeModal();
        renderActiveTableData();
      } catch (err) {
        alert("Error al guardar: " + err.message);
      }
    });
  }

  // --- NAVEGACIÓN ENTRE VISTAS ---
  function switchView(viewId) {
    appState.currentView = viewId;
    
    // Activa el botón del menú
    el.navItems.forEach(item => {
      if (item.getAttribute('data-target') === viewId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Activa el panel correspondiente
    el.panels.forEach(panel => {
      if (panel.id === viewId) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    // Refrescar vistas específicas al entrar
    if (viewId === 'panel-dashboard') {
      renderActiveTableData();
    } else if (viewId === 'panel-generator') {
      refreshGeneratorTablesDropdown();
    }
  }

  // --- CONTROLADOR DE LA CONSOLA DE RED ---
  function setupApiConsole() {
    // Suscribir los logs del api mock a nuestra consola
    window.api.subscribeToLogs((log) => {
      const logRow = document.createElement('div');
      logRow.className = 'console-log-row';
      
      // Determinamos el color según el status code
      let statusClass = 'status-2xx';
      if (log.status >= 400 && log.status < 500) statusClass = 'status-4xx';
      else if (log.status >= 500) statusClass = 'status-5xx';

      logRow.innerHTML = `
        <span class="log-time">[${log.timestamp}]</span>
        <span class="log-method ${log.method}">${log.method}</span>
        <span class="log-url">${log.url}</span>
        <span class="log-status ${statusClass}">${log.status}</span>
        <span class="log-duration">${log.duration}ms</span>
        ${log.payload ? `<span class="log-payload" title='Payload: ${log.payload}'>req_body</span>` : ''}
        ${log.response ? `<span class="log-payload" title='Response: ${log.response}'>res_body</span>` : ''}
      `;

      // Añadir al contenedor
      el.consoleLogsContainer.appendChild(logRow);
      
      // Auto scroll al fondo
      el.consoleLogsContainer.scrollTop = el.consoleLogsContainer.scrollHeight;
    });

    // Contraer / Expandir
    const toggleCollapse = () => {
      appState.consoleCollapsed = !appState.consoleCollapsed;
      if (appState.consoleCollapsed) {
        el.apiConsole.classList.add('collapsed');
        el.btnCollapseConsole.textContent = '▲';
      } else {
        el.apiConsole.classList.remove('collapsed');
        el.btnCollapseConsole.textContent = '▼';
      }
    };
    
    el.consoleHeaderToggle.addEventListener('click', (e) => {
      // Ignorar clics en botones de control individuales
      if (e.target.classList.contains('console-btn')) return;
      toggleCollapse();
    });
    
    el.btnCollapseConsole.addEventListener('click', toggleCollapse);

    // Limpiar Consola
    el.btnClearConsole.addEventListener('click', () => {
      el.consoleLogsContainer.innerHTML = `
        <div class="console-log-row" style="color: var(--text-dimmed); border: none;">
          <span class="log-time">--:--:--</span>
          <span style="font-style: italic;">Consola limpiada...</span>
        </div>
      `;
    });
  }

  // --- SELECCIONAR CLIENTE ACTIVO ---
  async function selectClient(clientId, selectedTableId = null) {
    if (!clientId) return;
    
    appState.currentClient = clientId;
    el.mainClientDisplay.textContent = `Cliente: ${clientId}`;
    
    // Obtener sus esquemas y tablas asociadas
    try {
      const tables = await window.api.getClientTables(clientId);
      const tableNames = Object.keys(tables);
      
      if (selectedTableId && tableNames.includes(selectedTableId)) {
        appState.currentTable = selectedTableId;
      } else if (tableNames.length > 0) {
        // Seleccionamos la primera tabla disponible por defecto
        appState.currentTable = tableNames[0];
      } else {
        appState.currentTable = '';
      }

      // Renderizar Tabs en el Dashboard
      renderDashboardTabs(tableNames);
      renderActiveTableData();
      
    } catch (err) {
      console.error(err);
      alert("Error al cargar tablas del cliente: " + err.message);
    }
  }

  // --- REFRESCAR EL SELECTOR DE CLIENTES ---
  async function refreshClientSelector() {
    try {
      const clients = await window.api.getClients();
      el.clientSelect.innerHTML = '';
      
      clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client;
        option.textContent = client;
        el.clientSelect.appendChild(option);
      });

      if (clients.length > 0 && !appState.currentClient) {
        appState.currentClient = clients[0];
      }
    } catch (err) {
      console.error(err);
    }
  }

  // --- RENDERIZAR PESTAÑAS DE TABLAS EN EL DASHBOARD ---
  function renderDashboardTabs(tableNames) {
    el.dashboardTableTabs.innerHTML = '';
    
    if (tableNames.length === 0) {
      el.dashboardTableTabs.innerHTML = `<span style="color: var(--text-dimmed); font-size: 0.9rem; padding: 0.5rem 0;">Este cliente no posee tablas creadas. Ve al Modelador de Esquemas para crear una.</span>`;
      return;
    }

    tableNames.forEach(tableName => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `tab-btn ${tableName === appState.currentTable ? 'active' : ''}`;
      // Mostramos un label más legible
      btn.textContent = tableName.replace(/_/g, ' ').toUpperCase();
      
      btn.addEventListener('click', () => {
        // Quitar activos anteriores
        el.dashboardTableTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        appState.currentTable = tableName;
        appState.sortConfig = { column: null, direction: 'asc' }; // Reiniciar ordenamiento
        renderActiveTableData();
      });

      el.dashboardTableTabs.appendChild(btn);
    });
  }

  // --- RENDERIZAR TABLA DE DATOS DINÁMICA ---
  async function renderActiveTableData() {
    if (!appState.currentClient || !appState.currentTable) {
      renderEmptyState("Sin Datos", "Este cliente no tiene tablas configuradas. Crea una en la sección de Esquemas.");
      el.tableSummaryStats.innerHTML = '';
      el.btnAddRecord.disabled = true;
      el.btnClearTable.disabled = true;
      return;
    }

    el.btnAddRecord.disabled = false;
    el.btnClearTable.disabled = false;

    try {
      const result = await window.api.getTableRecords(appState.currentClient, appState.currentTable);
      const fields = result.fields;
      let data = [...result.data];

      // 1. Calcular estadísticas y mostrarlas antes de filtrar
      renderStatsCards(fields, data);

      // 2. Aplicar Búsqueda (Filtrado Local en base a todas las columnas)
      if (appState.searchQuery) {
        data = data.filter(row => {
          return fields.some(field => {
            const val = row[field.name];
            if (val === undefined || val === null) return false;

            if (field.type === 'boolean') {
              const query = appState.searchQuery;
              if (val === true) {
                return ['si', 'sí', 'verdadero', 'true', 'v'].includes(query);
              } else {
                return ['no', 'falso', 'false', 'f'].includes(query);
              }
            }

            return String(val).toLowerCase().includes(appState.searchQuery);
          });
        });
      }

      // 3. Aplicar Ordenamiento
      if (appState.sortConfig.column) {
        const colName = appState.sortConfig.column;
        const dirMultiplier = appState.sortConfig.direction === 'asc' ? 1 : -1;
        
        // Detectar si el campo es de tipo numérico para ordenamiento matemático
        const targetField = fields.find(f => f.name === colName);
        const isNum = targetField && targetField.type === 'number';

        data.sort((a, b) => {
          let valA = a[colName];
          let valB = b[colName];
          
          if (valA === undefined || valA === null) valA = isNum ? 0 : '';
          if (valB === undefined || valB === null) valB = isNum ? 0 : '';

          if (isNum) {
            return (Number(valA) - Number(valB)) * dirMultiplier;
          } else {
            return String(valA).localeCompare(String(valB)) * dirMultiplier;
          }
        });
      }

      // 4. Renderizar Encabezados Dinámicos (Dynamic Headers)
      el.dynamicTableHead.innerHTML = '';
      const headTr = document.createElement('tr');
      
      fields.forEach(field => {
        const th = document.createElement('th');
        th.textContent = field.label || field.name;
        th.setAttribute('data-col', field.name);
        
        // Añadir indicador de ordenamiento
        if (appState.sortConfig.column === field.name) {
          th.className = appState.sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc';
        }

        // Listener de ordenamiento
        th.addEventListener('click', () => {
          if (appState.sortConfig.column === field.name) {
            appState.sortConfig.direction = appState.sortConfig.direction === 'asc' ? 'desc' : 'asc';
          } else {
            appState.sortConfig.column = field.name;
            appState.sortConfig.direction = 'asc';
          }
          renderActiveTableData();
        });

        headTr.appendChild(th);
      });

      // Añadir columna extra fija de Acciones (Eliminar)
      const thActions = document.createElement('th');
      thActions.textContent = 'Acciones';
      thActions.style.textAlign = 'right';
      thActions.style.cursor = 'default';
      headTr.appendChild(thActions);

      el.dynamicTableHead.appendChild(headTr);

      // 5. Renderizar Filas de Datos
      el.dynamicTableBody.innerHTML = '';
      if (data.length === 0) {
        const trEmpty = document.createElement('tr');
        trEmpty.innerHTML = `<td colspan="${fields.length + 1}" style="text-align: center; color: var(--text-dimmed); padding: 3rem;">Ningún registro coincide con los criterios de búsqueda.</td>`;
        el.dynamicTableBody.appendChild(trEmpty);
        return;
      }

      data.forEach(row => {
        const tr = document.createElement('tr');
        
        fields.forEach(field => {
          const td = document.createElement('td');
          const value = row[field.name];

          // Renderizado enriquecido según tipo de dato
          if (field.type === 'number') {
            td.style.fontFamily = varContainsPrice(field.name) ? 'var(--font-mono)' : 'inherit';
            td.textContent = formatValue(value, field.type, field.name);
          } else if (field.type === 'boolean') {
            td.innerHTML = value 
              ? `<span class="text-success" style="font-weight: 500;">✓ Sí</span>` 
              : `<span class="text-danger" style="font-weight: 500;">✗ No</span>`;
          } else {
            td.textContent = value !== undefined ? value : '--';
          }

          tr.appendChild(td);
        });

        // Celda de Acciones (Botón Eliminar)
        const tdActions = document.createElement('td');
        tdActions.style.textAlign = 'right';
        tdActions.innerHTML = `
          <button class="btn btn-danger btn-delete-row" data-id="${row.id}" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;">
            Eliminar
          </button>
        `;

        // Evento eliminar individual
        tdActions.querySelector('.btn-delete-row').addEventListener('click', async (e) => {
          e.stopPropagation();
          const rowId = e.target.getAttribute('data-id');
          if (confirm("¿Estás seguro de que deseas eliminar este registro?")) {
            try {
              await window.api.deleteTableRecord(appState.currentClient, appState.currentTable, rowId);
              renderActiveTableData();
            } catch (err) {
              alert("Error al eliminar: " + err.message);
            }
          }
        });

        tr.appendChild(tdActions);
        el.dynamicTableBody.appendChild(tr);
      });

    } catch (err) {
      console.error(err);
      renderEmptyState("Error", "Ocurrió un error al cargar la información: " + err.message);
    }
  }

  // --- DETERMINAR FORMATOS DE VALOR ---
  function varContainsPrice(name) {
    name = name.toLowerCase();
    return name.includes('precio') || name.includes('costo') || name.includes('valor') || name.includes('price');
  }

  function formatValue(val, type, fieldName) {
    if (val === undefined || val === null || val === '') return '--';
    if (type === 'number') {
      if (varContainsPrice(fieldName)) {
        return `$${Number(val).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      if (fieldName.toLowerCase().includes('rotacion') || fieldName.toLowerCase().includes('rotación') || fieldName.toLowerCase().includes('porcentaje')) {
        return `${val}%`;
      }
      return Number(val).toLocaleString('es-MX');
    }
    return val;
  }

  // --- CALCULAR Y RENDERIZAR TARJETAS DE ESTADÍSTICAS ---
  function renderStatsCards(fields, data) {
    el.tableSummaryStats.innerHTML = '';
    
    // Tarjeta 1: Total Registros (Fija)
    const cardTotal = createStatCard("Total Registros", data.length, 'accent-pink');
    el.tableSummaryStats.appendChild(cardTotal);

    // Identificar columnas numéricas para promedios y sumas analíticas
    const numberFields = fields.filter(f => f.type === 'number');
    
    // Máximo 2 tarjetas numéricas automáticas adicionales para no sobrecargar el diseño
    numberFields.slice(0, 2).forEach((field, index) => {
      let sum = 0;
      data.forEach(row => {
        const val = Number(row[field.name]);
        if (!isNaN(val)) sum += val;
      });
      
      const avg = data.length > 0 ? (sum / data.length) : 0;
      
      const isPrice = varContainsPrice(field.name);
      let formattedVal = '';
      let labelSuffix = '';

      if (isPrice) {
        formattedVal = `$${sum.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        labelSuffix = ` (Prom: $${avg.toFixed(2)})`;
      } else {
        formattedVal = sum.toLocaleString('es-MX');
        labelSuffix = ` (Prom: ${avg.toFixed(1)})`;
      }

      const cardColor = index === 0 ? 'accent-cyan' : '';
      const card = createStatCard(`Total ${field.label || field.name}${labelSuffix}`, formattedVal, cardColor);
      el.tableSummaryStats.appendChild(card);
    });
  }

  function createStatCard(title, value, accentClass = '') {
    const card = document.createElement('div');
    card.className = `summary-card ${accentClass}`;
    card.innerHTML = `
      <span class="summary-card-title">${title}</span>
      <span class="summary-card-value">${value}</span>
    `;
    return card;
  }

  // --- MOSTRAR ESTADO VACÍO ---
  function renderEmptyState(title, description) {
    el.dynamicTableHead.innerHTML = '';
    el.dynamicTableBody.innerHTML = `
      <tr>
        <td style="border: none; padding: 0;">
          <div class="empty-state">
            <div class="empty-state-icon">📂</div>
            <h3 style="font-size: 1.15rem; font-weight: 600; color: white;">${title}</h3>
            <p style="font-size: 0.85rem; max-width: 320px; line-height: 1.4;">${description}</p>
          </div>
        </td>
      </tr>
    `;
  }

  // --- INTERFAZ DEL MODELADOR: DIBUJAR COLUMNAS AGREGADAS ---
  function renderSchemaBuilderList() {
    el.schemaBuilderFieldsList.innerHTML = '';
    
    if (appState.tempSchemaFields.length === 0) {
      el.schemaBuilderFieldsList.innerHTML = `
        <div style="text-align: center; padding: 1.5rem; color: var(--text-dimmed); font-size: 0.85rem;">
          Aún no se han definido columnas personalizadas. Agrega al menos una arriba.
        </div>
      `;
      return;
    }

    appState.tempSchemaFields.forEach((field, index) => {
      const row = document.createElement('div');
      row.className = 'schema-field-row';
      row.innerHTML = `
        <div style="font-weight: 500; font-size: 0.95rem; color: white;">${field.label} <span style="font-size: 0.75rem; color: var(--text-dimmed); font-family: var(--font-mono);">(${field.name})</span></div>
        <div class="field-type" style="font-size: 0.8rem;">${field.type}</div>
        <button type="button" class="btn-remove-field" data-index="${index}">&times;</button>
      `;

      row.querySelector('.btn-remove-field').addEventListener('click', () => {
        appState.tempSchemaFields.splice(index, 1);
        renderSchemaBuilderList();
      });

      el.schemaBuilderFieldsList.appendChild(row);
    });
  }

  // --- INTERFAZ DEL GENERADOR: DIBUJAR DROPDOWN DE TABLAS ---
  function refreshGeneratorTablesDropdown() {
    if (!appState.currentClient) {
      el.generatorTargetTable.innerHTML = `<option value="">Selecciona Cliente Primero</option>`;
      return;
    }

    window.api.getClientTables(appState.currentClient).then(tables => {
      el.generatorTargetTable.innerHTML = '';
      const tableNames = Object.keys(tables);
      
      if (tableNames.length === 0) {
        el.generatorTargetTable.innerHTML = `<option value="">Sin tablas disponibles</option>`;
        el.generatorSchemaDisplay.innerHTML = '';
        el.generatorEndpointRoute.textContent = 'N/A';
        return;
      }

      tableNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name.replace(/_/g, ' ').toUpperCase();
        el.generatorTargetTable.appendChild(option);
      });

      // Si no hay tabla seleccionada o la seleccionada ya no existe, usamos la primera
      if (!appState.currentTable || !tables[appState.currentTable]) {
        appState.currentTable = tableNames[0];
      }

      el.generatorTargetTable.value = appState.currentTable;
      updateGeneratorInfo();
    }).catch(err => {
      console.error(err);
    });
  }

  // Actualizar detalles del esquema a generar en pantalla
  async function updateGeneratorInfo() {
    const activeTable = el.generatorTargetTable.value;
    if (!activeTable) return;
    
    el.generatorEndpointRoute.textContent = `/api/v1/${appState.currentClient}/${activeTable}/bulk-generate`;
    
    try {
      const records = await window.api.getTableRecords(appState.currentClient, activeTable);
      el.generatorSchemaDisplay.innerHTML = '';
      
      records.fields.forEach(field => {
        const pill = document.createElement('span');
        pill.className = 'field-pill';
        pill.innerHTML = `${field.label || field.name} <span class="field-type">${field.type}</span>`;
        el.generatorSchemaDisplay.appendChild(pill);
      });
    } catch(err) {
      console.error(err);
    }
  }

  // --- ABRIR MODAL DINÁMICO DE CREACIÓN MANUAL ---
  async function openAddRecordModal() {
    if (!appState.currentClient || !appState.currentTable) return;

    try {
      const schema = await window.api.getTableRecords(appState.currentClient, appState.currentTable);
      el.modalFormTitle.textContent = `Añadir a ${appState.currentTable.replace(/_/g, ' ')}`;
      el.dynamicFormFieldsContainer.innerHTML = '';

      schema.fields.forEach(field => {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        let inputHtml = '';
        if (field.type === 'number') {
          inputHtml = `<input type="number" step="any" name="${field.name}" id="input-f-${field.name}" class="form-control" placeholder="Ingresa un número" required>`;
        } else if (field.type === 'boolean') {
          inputHtml = `
            <div class="select-wrapper">
              <select name="${field.name}" id="input-f-${field.name}" class="custom-select" required>
                <option value="true">Sí (Verdadero)</option>
                <option value="false">No (Falso)</option>
              </select>
            </div>
          `;
        } else if (field.type === 'date') {
          inputHtml = `<input type="date" name="${field.name}" id="input-f-${field.name}" class="form-control" required>`;
        } else {
          inputHtml = `<input type="text" name="${field.name}" id="input-f-${field.name}" class="form-control" placeholder="Escribe el texto..." required>`;
        }

        group.innerHTML = `
          <label for="input-f-${field.name}">${field.label || field.name}</label>
          ${inputHtml}
        `;

        el.dynamicFormFieldsContainer.appendChild(group);
      });

      el.addRecordModal.classList.add('active');
    } catch (err) {
      alert("Error al abrir modal: " + err.message);
    }
  }

  // --- EJECUCIÓN INICIAL ---
  init();
});
