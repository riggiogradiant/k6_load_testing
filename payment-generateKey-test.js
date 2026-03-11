import http from 'k6/http';
import { check, sleep } from 'k6';

// Test de carga realista (4 minutos)
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
      'p(95)<1000',    // 95% de peticiones < 1s
      'p(99)<2000',    // 99% de peticiones < 2s
      'avg<500',       // Promedio < 500ms
    ],
    
    // Tasa de errores
    http_req_failed: ['rate<0.05'],  // Menos de 5% de errores
    
    // Verificaciones
    checks: ['rate>0.95'],           // 95% de checks exitosos
  },
  
  insecureSkipTLSVerify: true,
};

// URL y parámetros
const BASE_URL = 'https://localhost:8090';
const CLUSTER_ID = '66666666-6666-6666-6666-666666666666';

// Token de autorización (considera usar variables de entorno en producción)
const TOKEN = 'token';

// Payload de la petición
const payload = JSON.stringify({
  type: 'HMAC_KEY',
  keyLength: 'L_128',
  keyAlgorithm: 'SHA1',
  cryptoperiodExpirationDate: '2025-12-31T23:59:59Z'
});

// Headers de la petición
const params = {
  headers: {
    'accept': 'application/json',
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
};

export default function () {
  // Nombre único para cada petición (evita colisiones)
  const keyName = `key_${__VU}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const url = `${BASE_URL}/payment/generateKey?clusterId=${CLUSTER_ID}&keyName=${keyName}`;
  
  // Hacer la petición POST
  const response = http.post(url, payload, params);
  
  // Verificaciones detalladas
  const checkResult = check(response, {
    'status 200': (r) => r.status === 200,
    'status 2xx': (r) => r.status >= 200 && r.status < 300,
    'tiene respuesta': (r) => r.body && r.body.length > 0,
    'tiempo < 1s': (r) => r.timings.duration < 1000,
    'tiempo < 2s': (r) => r.timings.duration < 2000,
  });
  
  // Mostrar solo errores (no saturar logs)
  if (!checkResult || response.status !== 200) {
    console.log(`✗ [VU${__VU} iter${__ITER}] Status: ${response.status} | ` +
                `Tiempo: ${response.timings.duration.toFixed(0)}ms | ` +
                `Error: ${response.body.substring(0, 100)}`);
  }
  
  // Pausa variable entre 1-4 segundos (comportamiento humano realista)
  // Usuarios reales no hacen peticiones con intervalos exactos
  sleep(Math.random() * 3 + 1);
}
