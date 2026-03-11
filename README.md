# K6 Load Testing - Payment API

Este proyecto contiene scripts de k6 para realizar pruebas de carga y medir métricas de rendimiento del API de pagos.

## Requisitos

- [k6](https://k6.io/) instalado en tu sistema

### Instalar k6

**Linux (Debian/Ubuntu):**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**macOS:**
```bash
brew install k6
```

**Windows:**
```powershell
winget install k6 --source winget
```

O descarga desde [k6.io/docs/getting-started/installation](https://k6.io/docs/getting-started/installation/)

## Scripts Disponibles

### payment-generateKey-test.js

Prueba de carga para el endpoint `POST /payment/generateKey` que genera claves HMAC.

**Características:**
- ✅ Ignorar verificación SSL (modo inseguro para localhost)
- ✅ Métricas detalladas de tiempo de respuesta
- ✅ Verificaciones automáticas de estado HTTP
- ✅ Escalado gradual de usuarios virtuales
- ✅ Umbrales de rendimiento configurables

## Uso

### Ejecutar el test básico

```bash
k6 run payment-generateKey-test.js
```

### Ejecutar con un solo usuario (smoke test)

```bash
k6 run --vus 1 --duration 30s payment-generateKey-test.js
```

### Ejecutar con configuración personalizada

```bash
k6 run --vus 50 --duration 2m payment-generateKey-test.js
```

### Ver resultados en tiempo real con salida detallada

```bash
k6 run --out json=results.json payment-generateKey-test.js
```

### Generar reporte HTML (requiere extensión)

```bash
k6 run --out json=results.json payment-generateKey-test.js
# Luego convertir con k6-reporter u otra herramienta
```

## Métricas Principales

El script mide las siguientes métricas:

- **http_req_duration**: Tiempo total de la petición
  - p(95): Percentil 95 (95% de peticiones completadas en este tiempo)
  - p(99): Percentil 99
  - avg: Promedio
  - min/max: Valores mínimo y máximo

- **http_req_failed**: Tasa de fallos de peticiones
- **http_req_waiting**: Tiempo esperando la respuesta del servidor (TTFB)
- **http_req_connecting**: Tiempo estableciendo conexión TCP
- **http_req_tls_handshaking**: Tiempo en handshake TLS/SSL
- **http_reqs**: Total de peticiones HTTP realizadas
- **iterations**: Número de iteraciones completadas

## Configuración del Script

Puedes modificar el script `payment-generateKey-test.js` para ajustar:

### Escenarios de Carga

```javascript
stages: [
  { duration: '30s', target: 10 },  // Sube a 10 usuarios en 30s
  { duration: '1m', target: 10 },   // Mantiene 10 usuarios por 1 minuto
  { duration: '30s', target: 0 },   // Baja a 0 usuarios en 30s
]
```

### Umbrales de Rendimiento

```javascript
thresholds: {
  http_req_duration: ['p(95)<500'],  // 95% < 500ms
  http_req_failed: ['rate<0.1'],     // < 10% errores
}
```

### Variables de Entorno

Para mayor seguridad, puedes usar variables de entorno para el token:

```javascript
const TOKEN = __ENV.AUTH_TOKEN || 'token-por-defecto';
```

Y ejecutar:
```bash
k6 run -e AUTH_TOKEN="tu-token-aqui" payment-generateKey-test.js
```

## Notas Importantes

⚠️ **Seguridad**: Este script usa `insecureSkipTLSVerify: true` para ignorar certificados SSL en localhost. **NO usar en producción sin certificados válidos**.

⚠️ **Token**: El token de autorización tiene fecha de expiración. Actualízalo antes de ejecutar las pruebas si ha expirado.

⚠️ **Carga**: Ajusta los valores de VUs (Virtual Users) según la capacidad de tu servidor para evitar sobrecarga no deseada.