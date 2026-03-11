import http from 'k6/http';
import { check, sleep } from 'k6';

// Test de carga realista de PIN (4 minutos)
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
  // Nombres únicos para cada petición (evita colisiones)
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const pinVerKeyName = `pinver_${__VU}_${timestamp}_${random}`;
  const pinEncKeyName = `pinenc_${__VU}_${timestamp}_${random}`;
  
  // PASO 1: Generar clave PIN_VER_KEY
  const pinVerPayload = JSON.stringify({
    type: 'PIN_VER_KEY',
    keyLength: 'L_128',
    keyAlgorithm: 'DES',
    cryptoperiodExpirationDate: '2025-12-31T23:59:59Z'
  });
  
  const pinVerResponse = http.post(
    `${BASE_URL}/payment/generateKey?clusterId=${CLUSTER_ID}&keyName=${pinVerKeyName}`,
    pinVerPayload,
    { headers }
  );
  
  const pinVerOk = check(pinVerResponse, {
    '1. PIN_VER_KEY creada': (r) => r.status === 200,
    '1. Tiempo PIN_VER < 1s': (r) => r.timings.duration < 1000,
  });
  
  if (!pinVerOk){
    console.log(`✗ [VU${__VU}] Error PIN_VER_KEY: ${pinVerResponse.status} - ${pinVerResponse.body.substring(0, 100)}`);
    return;
  }
  sleep(0.5);
  
  
  // PASO 2: Generar clave PIN_ENC_KEY
  const pinEncPayload = JSON.stringify({
    type: 'PIN_ENC_KEY',
    keyLength: 'L_128',
    keyAlgorithm: 'DES',
    cryptoperiodExpirationDate: '2025-12-31T23:59:59Z'
  });
  
  const pinEncResponse = http.post(
    `${BASE_URL}/payment/generateKey?clusterId=${CLUSTER_ID}&keyName=${pinEncKeyName}`,
    pinEncPayload,
    { headers }
  );
  
  const pinEncOk = check(pinEncResponse, {
    '2. PIN_ENC_KEY creada': (r) => r.status === 200,
    '2. Tiempo PIN_ENC < 1s': (r) => r.timings.duration < 1000,
  });
  
  if (!pinEncOk){
    console.log(`✗ [VU${__VU}] Error PIN_ENC_KEY: ${pinEncResponse.status} - ${pinEncResponse.body.substring(0, 100)}`);
    return;
  }
  sleep(0.5);
  
  
  // PASO 3: Activar PIN_VER_KEY
  const activatePayload = JSON.stringify({
    statusReason: 'Key is ready for use'
  });
  
  const activatePinVerResponse = http.put(
    `${BASE_URL}/keyManagement/activate?name=${pinVerKeyName}&cluster=${CLUSTER_ID}`,
    activatePayload,
    { headers }
  );
  
  const activatePinVerOk = check(activatePinVerResponse, {
    '3. PIN_VER_KEY activada': (r) => r.status === 200,
    '3. Tiempo activación VER < 1s': (r) => r.timings.duration < 1000,
  });
  
  if (!activatePinVerOk){
    console.log(`✗ [VU${__VU}] Error activando PIN_VER: ${activatePinVerResponse.status} - ${activatePinVerResponse.body.substring(0, 100)}`);
    return;
  }
  sleep(0.5);
  
  
  // PASO 4: Activar PIN_ENC_KEY
  const activatePinEncResponse = http.put(
    `${BASE_URL}/keyManagement/activate?name=${pinEncKeyName}&cluster=${CLUSTER_ID}`,
    activatePayload,
    { headers }
  );
  
  const activatePinEncOk = check(activatePinEncResponse, {
    '4. PIN_ENC_KEY activada': (r) => r.status === 200,
    '4. Tiempo activación ENC < 1s': (r) => r.timings.duration < 1000,
  });
  
  if (!activatePinEncOk) {
    console.log(`✗ [VU${__VU}] Error activando PIN_ENC: ${activatePinEncResponse.status} - ${activatePinEncResponse.body.substring(0, 100)}`);
    return;
  }
  sleep(0.5);
  
  
  // PASO 5: Generar PIN
  const pinPayload = JSON.stringify({
    pinVerKeyId: pinVerKeyName,
    pinEncKeyId: pinEncKeyName,
    pan: '4123456789012345',
    pinBlockFormat: 'ANSI',
    pinLength: '4',
    conversionTableName: 'CONV_TABLE_THALES_AES'
  });
  
  const pinResponse = http.post(
    `${BASE_URL}/payment/generatePin?clusterId=${CLUSTER_ID}`,
    pinPayload,
    { headers }
  );
  
  const pinOk = check(pinResponse, {
    '5. PIN generado': (r) => r.status === 200,
    '5. Tiempo PIN < 1s': (r) => r.timings.duration < 1000,
  });
  
  // Solo mostrar errores (no saturar logs)
  if (!pinOk) {
    console.log(`✗ [VU${__VU}] Error generando PIN: ${pinResponse.status} - ${pinResponse.body.substring(0, 100)}`);
  }
  
  // Pausa variable entre 2-5 segundos (comportamiento humano realista)
  // Usuarios reales no hacen flujos completos con intervalos exactos
  sleep(Math.random() * 3 + 2);
}
