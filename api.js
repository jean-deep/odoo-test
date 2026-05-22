/**
 * MockDatabase - Simulación del Motor de Base de Datos y Endpoints Dinámicos
 */

class MockDatabase {
  constructor() {
    this.storageKey = 'dynamic_api_db';
    this.logsKey = 'dynamic_api_logs';
    this.listeners = [];
    this.initializeDB();
  }

  initializeDB() {
    const savedData = localStorage.getItem(this.storageKey);
    if (savedData) {
      try {
        this.db = JSON.parse(savedData);
      } catch (e) {
        console.error("Error al cargar la BD, usando semillas.", e);
        this.db = this.getSeeds();
      }
    } else {
      this.db = this.getSeeds();
      this.save();
    }
  }

  getSeeds() {
    return {
      clients: {
        "Minmax": {
          tables: {
            "inventario": {
              fields: [
                { name: "nombre", type: "text", label: "Nombre" },
                { name: "precio", type: "number", label: "Precio" },
                { name: "cantidad", type: "number", label: "Cantidad" }
              ],
              data: [
                { id: "row_1", nombre: "Audífonos Inalámbricos", precio: 59.99, cantidad: 120 },
                { id: "row_2", nombre: "Teclado Mecánico RGB", precio: 89.90, cantidad: 45 },
                { id: "row_3", nombre: "Mouse Gamer Ergonómico", precio: 34.50, cantidad: 75 }
              ]
            }
          }
        },
        "metakon": {
          tables: {
            "inventario_promise": {
              fields: [
                { name: "nombre", type: "text", label: "Nombre" },
                { name: "descripcion", type: "text", label: "Descripción" },
                { name: "maxima capacidad", type: "number", label: "Máxima Capacidad" },
                { name: "capacidad actual", type: "number", label: "Capacidad Actual" },
                { name: "distribución", type: "text", label: "Distribución" }
              ],
              data: [
                { id: "row_p1", nombre: "Caja de Componentes A", descripcion: "Microcontroladores y transistores", "maxima capacidad": 500, "capacidad actual": 420, distribución: "Zona Norte" },
                { id: "row_p2", nombre: "Gabinete Metálico Slim", descripcion: "Estructuras para servidores de red", "maxima capacidad": 50, "capacidad actual": 12, distribución: "Zona Centro" }
              ]
            },
            "inventario_ending": {
              fields: [
                { name: "detalle", type: "text", label: "Detalle" },
                { name: "stock", type: "number", label: "Stock" },
                { name: "rotación", type: "number", label: "Rotación (%)" },
                { name: "capacidad", type: "number", label: "Capacidad (m³)" }
              ],
              data: [
                { id: "row_e1", detalle: "Resistencia Cerámica 10k", stock: 1500, rotación: 85, capacidad: 1.2 },
                { id: "row_e2", detalle: "Placas Fenólicas 10x10", stock: 350, rotación: 40, capacidad: 0.5 }
              ]
            }
          }
        }
      }
    };
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.db));
  }

  generateUniqueId(prefix = 'row') {
    const timestamp = Date.now();
    const randomVal = Math.floor(Math.random() * 1000000000);
    if (!MockDatabase.idCounter) {
      MockDatabase.idCounter = 0;
    }
    MockDatabase.idCounter++;
    
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}_${crypto.randomUUID()}`;
    }
    
    return `${prefix}_${timestamp}_${randomVal}_${MockDatabase.idCounter}`;
  }

  // Suscribirse a logs de la API
  subscribeToLogs(callback) {
    this.listeners.push(callback);
  }

  logRequest(method, url, status, payload = null, response = null) {
    const timestamp = new Date().toLocaleTimeString();
    const duration = Math.floor(Math.random() * 80) + 20; // simula latencia de red entre 20ms y 100ms
    const logEntry = {
      timestamp,
      method,
      url,
      status,
      duration,
      payload: payload ? JSON.stringify(payload) : null,
      response: response ? JSON.stringify(response) : null
    };

    console.log(`[API MOCK] ${method} ${url} -> ${status} (${duration}ms)`);
    this.listeners.forEach(cb => cb(logEntry));
  }

  // --- API SIMULADA (Retorna promesas para simular llamadas asíncronas) ---

  async delay(ms = 250) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // GET /api/v1/clients
  async getClients() {
    await this.delay();
    const clients = Object.keys(this.db.clients);
    this.logRequest('GET', '/api/v1/clients', 200, null, clients);
    return clients;
  }

  // POST /api/v1/clients
  async createClient(clientId) {
    await this.delay();
    clientId = clientId.trim();
    if (!clientId) {
      this.logRequest('POST', '/api/v1/clients', 400, { error: 'Nombre de cliente inválido' });
      throw new Error('Nombre de cliente no puede estar vacío');
    }
    if (this.db.clients[clientId]) {
      this.logRequest('POST', '/api/v1/clients', 409, { error: 'Cliente ya existe' });
      throw new Error('El cliente ya existe en el sistema');
    }

    this.db.clients[clientId] = { tables: {} };
    this.save();
    this.logRequest('POST', '/api/v1/clients', 201, { clientId }, { success: true });
    return { success: true, clientId };
  }

  // GET /api/v1/:client/tables
  async getClientTables(clientId) {
    await this.delay();
    if (!this.db.clients[clientId]) {
      this.logRequest('GET', `/api/v1/${clientId}/tables`, 404);
      throw new Error(`Cliente "${clientId}" no encontrado`);
    }
    const schemas = {};
    const tables = this.db.clients[clientId].tables;
    for (const tableName in tables) {
      schemas[tableName] = {
        fields: tables[tableName].fields
      };
    }
    this.logRequest('GET', `/api/v1/${clientId}/tables`, 200, null, schemas);
    return schemas;
  }

  // POST /api/v1/:client/tables
  async createClientTable(clientId, tableName, fields) {
    await this.delay();
    if (!this.db.clients[clientId]) {
      this.logRequest('POST', `/api/v1/${clientId}/tables`, 404);
      throw new Error(`Cliente "${clientId}" no encontrado`);
    }
    tableName = tableName.trim().toLowerCase().replace(/\s+/g, '_');
    if (!tableName) {
      this.logRequest('POST', `/api/v1/${clientId}/tables`, 400, { error: 'Nombre de tabla inválido' });
      throw new Error('El nombre de la tabla no puede estar vacío');
    }
    if (this.db.clients[clientId].tables[tableName]) {
      this.logRequest('POST', `/api/v1/${clientId}/tables`, 409, { error: 'Tabla ya existe' });
      throw new Error('La tabla ya existe para este cliente');
    }

    this.db.clients[clientId].tables[tableName] = {
      fields: fields.map(f => ({
        name: f.name.toLowerCase().trim(),
        type: f.type || 'text',
        label: f.label || f.name
      })),
      data: []
    };

    this.save();
    this.logRequest('POST', `/api/v1/${clientId}/tables`, 201, { tableName, fields }, { success: true });
    return { success: true, tableName };
  }

  // GET /api/v1/:client/:table
  async getTableRecords(clientId, tableName) {
    await this.delay();
    const client = this.db.clients[clientId];
    if (!client || !client.tables[tableName]) {
      this.logRequest('GET', `/api/v1/${clientId}/${tableName}`, 404);
      throw new Error(`Endpoint /api/v1/${clientId}/${tableName} no encontrado`);
    }

    const result = {
      fields: client.tables[tableName].fields,
      data: client.tables[tableName].data
    };
    this.logRequest('GET', `/api/v1/${clientId}/${tableName}`, 200, null, result);
    return result;
  }

  // POST /api/v1/:client/:table
  async insertTableRecord(clientId, tableName, record) {
    await this.delay();
    const client = this.db.clients[clientId];
    if (!client || !client.tables[tableName]) {
      this.logRequest('POST', `/api/v1/${clientId}/${tableName}`, 404);
      throw new Error(`Endpoint /api/v1/${clientId}/${tableName} no encontrado`);
    }

    const fields = client.tables[tableName].fields;
    const newRecord = { id: this.generateUniqueId() };

    // Validar y mapear campos del record
    fields.forEach(field => {
      const val = record[field.name];
      if (field.type === 'number') {
        newRecord[field.name] = val !== undefined && val !== null && val !== '' ? Number(val) : 0;
      } else if (field.type === 'boolean') {
        newRecord[field.name] = val === true || val === 'true';
      } else {
        newRecord[field.name] = val !== undefined && val !== null ? String(val) : '';
      }
    });

    client.tables[tableName].data.push(newRecord);
    this.save();
    this.logRequest('POST', `/api/v1/${clientId}/${tableName}`, 201, record, newRecord);
    return newRecord;
  }

  // DELETE /api/v1/:client/:table/:id
  async deleteTableRecord(clientId, tableName, id) {
    await this.delay();
    const client = this.db.clients[clientId];
    if (!client || !client.tables[tableName]) {
      this.logRequest('DELETE', `/api/v1/${clientId}/${tableName}/${id}`, 404);
      throw new Error(`Endpoint /api/v1/${clientId}/${tableName} no encontrado`);
    }

    const initialLength = client.tables[tableName].data.length;
    client.tables[tableName].data = client.tables[tableName].data.filter(item => item.id !== id);

    if (client.tables[tableName].data.length === initialLength) {
      this.logRequest('DELETE', `/api/v1/${clientId}/${tableName}/${id}`, 404, null, { error: 'Record no encontrado' });
      throw new Error(`Registro con ID ${id} no encontrado`);
    }

    this.save();
    this.logRequest('DELETE', `/api/v1/${clientId}/${tableName}/${id}`, 200, null, { success: true });
    return { success: true };
  }

  // POST /api/v1/:client/:table/bulk-generate
  async bulkGenerateRecords(clientId, tableName, count, generatorFn) {
    await this.delay(500); // Dar un poco más de delay para la simulación de generación masiva
    const client = this.db.clients[clientId];
    if (!client || !client.tables[tableName]) {
      this.logRequest('POST', `/api/v1/${clientId}/${tableName}/bulk-generate`, 404);
      throw new Error(`Endpoint /api/v1/${clientId}/${tableName}/bulk-generate no encontrado`);
    }

    const fields = client.tables[tableName].fields;
    const generated = [];

    for (let i = 0; i < count; i++) {
      const generatedRecord = generatorFn(fields);
      generatedRecord.id = this.generateUniqueId();
      client.tables[tableName].data.push(generatedRecord);
      generated.push(generatedRecord);
    }

    this.save();
    this.logRequest('POST', `/api/v1/${clientId}/${tableName}/bulk-generate`, 201, { count }, { count_generated: generated.length });
    return { success: true, count: generated.length };
  }

  // POST /api/v1/:client/:table/clear
  async clearTableRecords(clientId, tableName) {
    await this.delay();
    const client = this.db.clients[clientId];
    if (!client || !client.tables[tableName]) {
      this.logRequest('POST', `/api/v1/${clientId}/${tableName}/clear`, 404);
      throw new Error(`Endpoint /api/v1/${clientId}/${tableName}/clear no encontrado`);
    }

    client.tables[tableName].data = [];
    this.save();
    this.logRequest('POST', `/api/v1/${clientId}/${tableName}/clear`, 200, null, { success: true });
    return { success: true };
  }

  // POST /api/v1/system/reset
  async resetDatabase() {
    await this.delay(200);
    this.db = this.getSeeds();
    this.save();
    this.logRequest('POST', '/api/v1/system/reset', 200, null, { success: true });
    return { success: true };
  }
}

// Inicializar la BD
window.api = new MockDatabase();
console.log("Mock Database initialized successfully.");
