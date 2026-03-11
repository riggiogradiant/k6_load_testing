import http from 'k6/http';
import { check, sleep } from 'k6';

// Test de carga realista de CVV (4 minutos)
// Simula un escenario de producción con usuarios concurrentes
export const options = {
  stages: [
    // Fase 1: Warm-up (calentamiento)
    { duration: '1m', target: 5 },     // Sube gradualmente a 5 usuarios
    
    // Fase 2: Carga normal (actividad regular)
    { duration: '1m30s', target: 10 }, // Sube y mantiene 10 usuarios
    
    // Fase 3: Pico de tráfico (hora punta)
    { duration: '1m', target: 20 },    // Pico: 20 usuarios simultáneos
    
    // Fase 4: Cool-down (bajada gradual)
    { duration: '30s', target: 0 },    // Baja a 0 usuarios
  ],
  
  thresholds: {
    // Tiempos de respuesta
    http_req_duration: [
      'p(95)<2000',    // 95% de peticiones < 2s (más tiempo por ser flujo completo)
      'p(99)<3000',    // 99% de peticiones < 3s
      'avg<1000',      // Promedio < 1s
    ],
    
    // Tasa de errores
    http_req_failed: ['rate<0.05'],  // Menos de 5% de errores
    
    // Verificaciones
    checks: ['rate>0.95'],           // 95% de checks exitosos
  },
  
  insecureSkipTLSVerify: true,
};

// Configuración
const BASE_URL = 'https://localhost:8090';
const CLUSTER_ID = '66666666-6666-6666-6666-666666666666';
const TOKEN = 'token';

const headers = {
  'accept': 'application/json',
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

export default function () {
  // Nombre único para cada petición (evita colisiones)
  const keyName = `cvvkey_${__VU}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  // PASO 1: Generar clave CVV
  const createKeyPayload = JSON.stringify({
    type: 'CVV_KEY',
    keyLength: 'L_128',
    keyAlgorithm: 'DES',
    cryptoperiodExpirationDate: '2025-12-31T23:59:59Z'
  });
  
  const createKeyResponse = http.post(
    `${BASE_URL}/payment/generateKey?clusterId=${CLUSTER_ID}&keyName=${keyName}`,
    createKeyPayload,
    { headers }
  );
  
  const createKeyOk = check(createKeyResponse, {
    '1. Clave creada': (r) => r.status === 200,
    '1. Tiempo clave < 1s': (r) => r.timings.duration < 1000,
  });
  
  if (!createKeyOk) {
    console.log(`✗ [VU${__VU}] Error creando clave: ${createKeyResponse.status} - ${createKeyResponse.body.substring(0, 100)}`);
    return; // Abortar esta iteración
  }
  
  sleep(0.5); // Pausa breve entre pasos
  
  
  // PASO 2: Activar clave
  const activatePayload = JSON.stringify({
    statusReason: 'Key is ready for use'
  });
  
  const activateResponse = http.put(
    `${BASE_URL}/keyManagement/activate?name=${keyName}&cluster=${CLUSTER_ID}`,
    activatePayload,
    { headers }
  );
  
  const activateOk = check(activateResponse, {
    '2. Clave activada': (r) => r.status === 200,
    '2. Tiempo activación < 1s': (r) => r.timings.duration < 1000,
  });
  
  if (!activateOk) {
    console.log(`✗ [VU${__VU}] Error activando clave: ${activateResponse.status} - ${activateResponse.body.substring(0, 100)}`);
    return;
  }
  
  sleep(0.5);
  
  
  // PASO 3: Generar CVV
  const cvvPayload = JSON.stringify({
    cvvKeyId: keyName,
    pan: '4123456789012345',
    expirationDate: '8701',
    serviceCode: '101'
  });
  
  const cvvResponse = http.post(
    `${BASE_URL}/payment/generateCvv?clusterId=${CLUSTER_ID}`,
    cvvPayload,
    { headers }
  );
  
  const cvvOk = check(cvvResponse, {
    '3. CVV generado': (r) => r.status === 200,
    '3. Tiempo CVV < 1s': (r) => r.timings.duration < 1000,
  });
  
  // Solo mostrar errores (no saturar logs)
  if (!cvvOk) {
    console.log(`✗ [VU${__VU}] Error generando CVV: ${cvvResponse.status} - ${cvvResponse.body.substring(0, 100)}`);
  }
  
  // Pausa variable entre 2-5 segundos (comportamiento humano realista)
  // Usuarios reales no hacen flujos completos con intervalos exactos
  sleep(Math.random() * 3 + 2);
}
