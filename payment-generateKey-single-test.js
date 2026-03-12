import http from 'k6/http';
import { check } from 'k6';

// Test de una sola ejecución para medir tiempo de generateKey
export const options = {
  vus: 1,
  iterations: 1,
  insecureSkipTLSVerify: true,
};

// URL y parámetros
const BASE_URL = 'https://localhost:8090';
const CLUSTER_ID = '77777777-7777-7777-7777-777777777777';
const TOKEN = '';

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
  console.log('Ejecutando generateKey...');
  
  // Nombre único para la petición
  const keyName = `key_single_${Date.now()}`;
  const url = `${BASE_URL}/payment/generateKey?clusterId=${CLUSTER_ID}&keyName=${keyName}`;
  
  // Hacer la petición POST
  const response = http.post(url, payload, params);
  
  // Verificar resultado
  const isSuccess = check(response, {
    'status 200': (r) => r.status === 200,
    'tiene respuesta': (r) => r.body && r.body.length > 0,
  });
  
  // Mostrar resultado
  console.log('');
  console.log('════════════════════════════════════════════════════');
  console.log('         RESULTADO: Generate Key');
  console.log('════════════════════════════════════════════════════');
  console.log(`Status: ${response.status}`);
  console.log(`⏱️  Tiempo total: ${response.timings.duration.toFixed(2)}ms`);
  console.log(`   - Connecting: ${response.timings.connecting.toFixed(2)}ms`);
  console.log(`   - Sending: ${response.timings.sending.toFixed(2)}ms`);
  console.log(`   - Waiting: ${response.timings.waiting.toFixed(2)}ms`);
  console.log(`   - Receiving: ${response.timings.receiving.toFixed(2)}ms`);
  console.log(`Estado: ${isSuccess ? '✅ EXITOSO' : '❌ FALLIDO'}`);
  console.log('════════════════════════════════════════════════════');
  
  if (!isSuccess) {
    console.log(`Error: ${response.body}`);
  }
}
