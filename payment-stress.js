import http from 'k6/http';
import { check, sleep } from 'k6';

// Stress Test PROGRESIVO - Encuentra el límite exacto de capacidad
export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-arrival-rate',
      
      // Configuración de tasa de llegada (peticiones por segundo)
      startRate: 10,     // Empieza con 10 peticiones/segundo (sabemos que funciona)
      timeUnit: '1s',    // Por segundo
      
      // Pre-asignar VUs (usuarios virtuales)
      preAllocatedVUs: 50,   // VUs iniciales
      maxVUs: 500,           // Máximo de VUs que puede crear
      
      stages: [
        // SUBIDA LINEAL Y CONSTANTE - Fácil de identificar el punto de quiebre
        { duration: '4m', target: 200 },    // 10 → 200 req/s en 4min (aumento de 47.5 req/s por minuto)
      ],
    },
  },
  
  // Thresholds deshabilitados para no abortar - queremos ver todo el rango
  thresholds: {
    // Sin thresholds - solo observaremos las métricas
  },
  
  insecureSkipTLSVerify: true,
};

// Configuración
const BASE_URL = 'https://localhost:8090';
const CLUSTER_ID = '66666666-6666-6666-6666-666666666666';
const TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ4M0FXclpVSjdxV0RnTkJaUU1aaExENHg1MkRFaFkwVHNCZmxuQkJJdVhJIn0.eyJleHAiOjE3NzMyNjcxNjUsImlhdCI6MTc3MzI2Njg2NSwianRpIjoib25ydHJvOjZmNWE5NzNiLTQ4NTItZDQyYi05NGNjLTJlOTkyM2I3NzE2YyIsImlzcyI6Imh0dHBzOi8va2V5Y2xvYWs6ODQ0My9yZWFsbXMvRkhhYVMiLCJhdWQiOlsicmVhbG0tbWFuYWdlbWVudCIsImFjY291bnQiXSwic3ViIjoiZDE0NTlhZTgtZjMzMC00NWRlLWJmZmEtZjc4MWNhMjU1OThkIiwidHlwIjoiQmVhcmVyIiwiYXpwIjoiZnJvbnRlbmQiLCJzaWQiOiJNT0VqamRLaXNUSUhKNTdaYzZIZWM3aWciLCJhY3IiOiIxIiwiYWxsb3dlZC1vcmlnaW5zIjpbImh0dHA6Ly9sb2NhbGhvc3Q6NDIwMC8iXSwicmVhbG1fYWNjZXNzIjp7InJvbGVzIjpbIm9mZmxpbmVfYWNjZXNzIiwidW1hX2F1dGhvcml6YXRpb24iLCJkZWZhdWx0LXJvbGVzLWZoYWFzIl19LCJyZXNvdXJjZV9hY2Nlc3MiOnsicmVhbG0tbWFuYWdlbWVudCI6eyJyb2xlcyI6WyJtYW5hZ2UtdXNlcnMiLCJ2aWV3LXVzZXJzIiwidmlldy1jbGllbnRzIiwibWFuYWdlLWNsaWVudHMiLCJxdWVyeS1jbGllbnRzIiwicXVlcnktZ3JvdXBzIiwicXVlcnktdXNlcnMiXX0sImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInNjb3BlIjoiZW1haWwgcHJvZmlsZSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJuYW1lIjoiU3VwZXIgQWRtaW5pc3RyYXRvciBTYWZlZ2F0ZSIsInByZWZlcnJlZF91c2VybmFtZSI6InNhZmVnYXRlLXN1cGVyLWFkbWluIiwiZ2l2ZW5fbmFtZSI6IlN1cGVyIEFkbWluaXN0cmF0b3IiLCJmYW1pbHlfbmFtZSI6IlNhZmVnYXRlIiwiZW1haWwiOiJzdXBlci1hZG1pbkBzYWZlZ2F0ZS5vcmcifQ.NbvRbJKZ8hObO4f4NZjH6bWhZFLn2rNYp7VgglRI_KPW59_eMRjK1DzhZfZT5jr0P057mcrVH1zg8B_9SDBymgxrO5AeTivTDXeGPJisleSpRet9hQ-eV9kYiOJvfa2nhhGq7VvlB91us0oTYsvBw1Vc7Q1Ds2yYfJ3ZjC4ck1wmB-8WQ73ZPvzvbZ5aByFBIQZN6mbWFqSntI2QgkusjJ7SbXe3JjV3yK2IReEVtKqIzw_xXRsQp8mhjDHeUmHTJVukr1TgU7ME8T9VCUae9haWJIh935X5C7t_1bhSzdi5ljtBo9F2OAz2OfLld8b-QVhP6lrfE8g2bWnOo2FEnw';

const headers = {
  'accept': 'application/json',
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

export default function () {
  const keyName = `cvvkey_stress_${__VU}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
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
  
  check(createKeyResponse, {
    'Clave creada': (r) => r.status === 200,
  });
  
  if (createKeyResponse.status !== 200) {
    return;
  }
  
  sleep(0.3);
  
  // PASO 2: Activar clave
  const activatePayload = JSON.stringify({
    statusReason: 'Key is ready for use'
  });
  
  const activateResponse = http.put(
    `${BASE_URL}/keyManagement/activate?name=${keyName}&cluster=${CLUSTER_ID}`,
    activatePayload,
    { headers }
  );
  
  check(activateResponse, {
    'Clave activada': (r) => r.status === 200,
  });
  
  if (activateResponse.status !== 200) {
    return;
  }
  
  sleep(0.3);
  
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
  
  check(cvvResponse, {
    'CVV generado': (r) => r.status === 200,
  });
}