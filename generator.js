/**
 * generator.js - Algoritmo inteligente de generación de datos de prueba
 */

const PRODUCTOS = [
  "Laptop Pro 15\"", "Teclado Mecánico RGB", "Mouse Inalámbrico", 
  "Monitor Gaming 27\"", "Servidor Rack 2U", "Router Fibra Óptica", 
  "Cámara Seguridad WiFi", "Disco Duro SSD 1TB", "Cable HDMI 4K 2m", 
  "Adaptador USB-C Hub", "Batería Respaldo UPS", "Procesador Ryzen 7",
  "Tarjeta Madre ATX", "Módulo RAM DDR5 16GB", "Disipador Refrigeración Líquida",
  "Audífonos Studio Pro", "Micrófono Condensador", "Soporte Brazo Monitor",
  "Switch Gigabit 8 Puertos", "Gabinete ATX Glass"
];

const DESCRIPCIONES = [
  "Componente electrónico de alta precisión", "Dispositivo de conectividad y alto rendimiento",
  "Unidad de almacenamiento rápido para servidores", "Estructura metálica reforzada con protección",
  "Accesorio periférico con conexión Bluetooth 5.0", "Equipo de red administrable de última generación",
  "Fuente de alimentación certificada 80 Plus Gold", "Sensor de proximidad industrial calibrado",
  "Módulo integrado para procesamiento de datos masivos", "Kit de herramientas para ensamble y mantenimiento"
];

const DISTRIBUCIONES = [
  "Pasillo A - Estante 4", "Zona Norte - Almacén Central", "Zona Sur - Despacho",
  "Pasillo B - Nivel 2", "Zona Este - Recepción de Carga", "Bodega de Tránsito",
  "Estación de Control 1", "Zona Oeste - Material Especial", "Pasillo C - Estante 1",
  "Zona Centro - Control de Calidad"
];

const DETALLES = [
  "Resistencia Cerámica 10k Ω", "Capacitor Electrolítico 470uF", "Transistor NPN BC547",
  "Diodo Rectificador 1N4007", "Circuito Integrado NE555", "Optoacoplador 4N25",
  "Fusible Térmico 2A", "Relevador Electromecánico 5V", "Potenciómetro Lineal 10k",
  "Display LED 7 Segmentos"
];

const ESTADOS = [
  "Disponible", "Agotado", "Bajo Stock", "En Tránsito", "Retenido"
];

/**
 * Genera un registro ficticio adaptado a los nombres y tipos de las columnas de un esquema
 * @param {Array} fields - Arreglo de campos del esquema {name, type, label}
 * @returns {Object} - Objeto con datos generados
 */
function generateMockRow(fields) {
  const row = {};
  
  // Guardamos los valores generados para poder hacer relaciones inteligentes en la misma fila
  // (por ejemplo: capacidad actual <= máxima capacidad)
  let maxCapacityValue = null;

  // Primero identificamos y generamos campos numéricos clave como capacidad máxima
  fields.forEach(field => {
    const name = field.name.toLowerCase().trim();
    if (field.type === 'number') {
      if (name.includes('maxima') || name.includes('máxima') || name.includes('limit') || name.includes('total')) {
        maxCapacityValue = Math.floor(Math.random() * 8 + 1) * 100; // 100, 200, ..., 800
      }
    }
  });

  fields.forEach(field => {
    const name = field.name.toLowerCase().trim();
    
    if (field.type === 'number') {
      // 1. Campos de precio/costo
      if (name.includes('precio') || name.includes('costo') || name.includes('valor') || name.includes('price')) {
        row[field.name] = parseFloat((Math.random() * 250 + 4.99).toFixed(2));
      } 
      // 2. Campos de stock/cantidad
      else if (name.includes('cantidad') || name.includes('stock') || name.includes('existencias') || name.includes('quantity')) {
        row[field.name] = Math.floor(Math.random() * 200);
      } 
      // 3. Campos de rotación/porcentaje
      else if (name.includes('rotacion') || name.includes('rotación') || name.includes('porcentaje') || name.includes('ratio')) {
        row[field.name] = Math.floor(Math.random() * 95) + 5; // 5% a 99%
      } 
      // 4. Capacidad Máxima (ya precalculada arriba)
      else if (name.includes('maxima') || name.includes('máxima')) {
        row[field.name] = maxCapacityValue || 500;
      }
      // 5. Capacidad Actual (debe ser menor o igual a capacidad máxima)
      else if (name.includes('actual') || name.includes('nivel') || name.includes('current')) {
        const limit = maxCapacityValue || 500;
        row[field.name] = Math.floor(Math.random() * (limit - 5)) + 5;
      }
      // 6. Capacidad genérica
      else if (name.includes('capacidad')) {
        row[field.name] = parseFloat((Math.random() * 15 + 0.5).toFixed(1)); // Ej: 1.5 m³
      }
      // 7. Números genéricos
      else {
        row[field.name] = Math.floor(Math.random() * 100) + 1;
      }
    } 
    else if (field.type === 'text') {
      // 1. Nombres de producto
      if (name === 'nombre' || name === 'name' || name === 'producto' || name === 'articulo' || name === 'artículo') {
        row[field.name] = PRODUCTOS[Math.floor(Math.random() * PRODUCTOS.length)];
      } 
      // 2. Detalles electrónicos / códigos
      else if (name === 'detalle' || name === 'detalles' || name === 'código' || name === 'codigo' || name === 'ref') {
        row[field.name] = DETALLES[Math.floor(Math.random() * DETALLES.length)];
      }
      // 3. Descripciones
      else if (name.includes('descripcion') || name.includes('descripción') || name.includes('details') || name.includes('info')) {
        row[field.name] = DESCRIPCIONES[Math.floor(Math.random() * DESCRIPCIONES.length)];
      } 
      // 4. Distribución / Zonas
      else if (name.includes('distribucion') || name.includes('distribución') || name.includes('zona') || name.includes('ubicacion') || name.includes('ubicación')) {
        row[field.name] = DISTRIBUCIONES[Math.floor(Math.random() * DISTRIBUCIONES.length)];
      } 
      // 5. Estados
      else if (name.includes('estado') || name.includes('status')) {
        row[field.name] = ESTADOS[Math.floor(Math.random() * ESTADOS.length)];
      }
      // 6. Texto genérico
      else {
        row[field.name] = `Reg. ${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      }
    } 
    else if (field.type === 'boolean') {
      row[field.name] = Math.random() > 0.3;
    } 
    else if (field.type === 'date') {
      const start = new Date(2025, 0, 1);
      const end = new Date();
      const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
      row[field.name] = date.toISOString().split('T')[0];
    }
    else {
      row[field.name] = "Valor de prueba";
    }
  });

  return row;
}

// Exponer de forma global para usar en app.js
window.generateMockRow = generateMockRow;
console.log("Mock generator module loaded successfully.");
