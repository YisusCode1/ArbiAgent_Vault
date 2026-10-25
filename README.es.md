🌐 [English](README.md) | **Español**

# ArbiAgent — Vaults DeFi con IA en Arbitrum

> Tres vaults ERC-4626 independientes en Arbitrum (Conservador,
> Moderado, Agresivo) que combinan rendimiento DeFi real (Aave V3)
> con decisiones de rebalanceo tomadas por una IA, verificadas
> on-chain mediante firmas criptográficas (EIP-712).

Proyecto desarrollado para el EthLima Hackathon 2026,
categoría **AI - Blockchain**.

---

## Demo en vivo

- **Frontend**: https://arbi-agent-vault.vercel.app
- **Backend / API**: https://arbiagent-vault-ziq4.onrender.com

⚠️ El backend corre en un plan gratuito que "se duerme" tras un periodo
de inactividad: la primera petición después de estar inactivo puede
tardar hasta 50 segundos mientras el servicio despierta.

---

## El problema

Gestionar a mano el rendimiento en DeFi implica vigilar tasas
constantemente, mover fondos entre protocolos y reaccionar a los
cambios del mercado, algo poco práctico para la mayoría de usuarios.

## Público objetivo

Alguien que ya tiene stablecoins o ETH sin usar y quiere que generen
rendimiento, pero no quiere convertirse en un gestor activo de DeFi que
revisa tasas y protocolos todos los días. Busca una experiencia de
"depositar y confiar", con la posibilidad de verificar en cualquier
momento, on-chain, que el sistema actúa exactamente como dice.

## La solución

Un conjunto de vaults, uno por perfil de riesgo, donde:

1. El usuario elige un modo de riesgo, deposita USDC en el vault de ese
   modo y recibe shares (estándar ERC-4626).
2. Un **agente de IA** analiza datos de mercado y decide cómo asignar el
   capital de ese vault, dentro de los límites de su modo de riesgo.
3. Esa decisión se **firma criptográficamente** off-chain y solo se
   ejecuta on-chain si la firma es válida: el contrato nunca confía
   ciegamente en quién llama a la función, solo en quién firmó.
4. Los fondos se despliegan en **Aave V3** (Arbitrum) para generar
   rendimiento real.
5. El usuario puede retirar en cualquier momento; el vault recupera la
   liquidez automáticamente si los fondos están desplegados.

---

## Modos de riesgo y vaults

Cada modo de riesgo es un contrato inteligente propio, con su propio
fondo, sus propias shares, su propio cooldown de rebalanceo y sus
propios límites de exposición. Los fondos **no se comparten entre
modos**: depositar en Moderado no pone dinero en Conservador ni en
Agresivo.

| Modo | Cooldown de rebalanceo | Contrato (Arbitrum Sepolia) |
|---|---|---|
| Conservador | 24 horas | [`0xc4e031259cA7d2390408F10608fAE03982a47F39`](https://sepolia.arbiscan.io/address/0xc4e031259cA7d2390408F10608fAE03982a47F39) |
| Moderado | 8 horas | [`0x6Ab1F75e863730de07b68fF87B67717d36cA0Df8`](https://sepolia.arbiscan.io/address/0x6Ab1F75e863730de07b68fF87B67717d36cA0Df8) |
| Agresivo | 2 horas | [`0x1D48956912c301C0Da67A10F3bC47BB2c8dEad0d`](https://sepolia.arbiscan.io/address/0x1D48956912c301C0Da67A10F3bC47BB2c8dEad0d) |

Mover una posición de un modo a otro significa retirar de un vault y
depositar en el otro (dos transacciones separadas, más la aprobación de
USDC). Nada impide tener posiciones en varios modos a la vez.

Dentro de un vault, la IA rebalancea **el vault completo**, no a cada
usuario por separado. Un rebalanceo solo mueve fondos entre "USDC sin
invertir" y "suministrado a Aave" dentro del contrato: nunca toca las
shares de nadie, y un retiro solo quema las shares de la wallet que lo
solicita.

---

## Arquitectura

```
┌─────────────┐      Firma EIP-712        ┌──────────────────────┐
│ Agente IA   │ ───────────────────────▶│  Vault del modo         │
│  (Python)   │   (dominio = ese vault)   │  elegido (ERC-4626)      │
└─────────────┘                          └──────────┬───────────┘
      ▲                                              │ supply/withdraw
      │ datos de mercado (de ese vault)              ▼
┌─────────────┐                          ┌──────────────────┐
│ API/Servidor│                          │   Pool de Aave V3  │
│  (FastAPI)  │                          │   (Arbitrum)        │
└─────────────┘                          └──────────────────┘
      ▲
      │ REST (protegido con API key interna)
┌─────────────┐
│  Frontend    │  un modo de riesgo global → un vault
│  (React)     │
└─────────────┘
```

Diagrama detallado (Mermaid, interactivo en GitHub): [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md)

**Por qué firmas y no solo un rol con permisos:** cualquiera puede
enviar la transacción de ejecución, pero el contrato solo la procesa si
la firma corresponde a la clave privada del agente de IA. Esto permite
verificar criptográficamente, on-chain, que la señal realmente vino de
la IA y no fue falsificada ni alterada.

**Una firma por vault:** el dominio EIP-712 incluye la dirección del
vault de destino (`verifyingContract`), por lo que una señal firmada
para un modo no puede reutilizarse en otro. La misma dirección del
agente de IA está autorizada (`aiAgent`) en los tres contratos. El
backend decide para qué vault firmar a partir del modo solicitado y
rechaza cualquier `vault_address` que no corresponda a ese modo.

---

## Estructura del repositorio

```
ArbiAgent/
├── client/            # Frontend (React + Vite + TypeScript)
├── contracts/          # Contratos inteligentes (Foundry)
│   ├── src/             # ArbiAgentVault.sol (Moderado),
│   │                    # ArbiAgentConservativeVault.sol,
│   │                    # ArbiAgentAggressiveVault.sol
│   ├── script/           # Un script de despliegue por vault
│   └── test/             # Tests de Foundry (por vault + aislamiento de modos)
├── server/              # Backend / agente de IA (Python)
├── docs/                 # Documentación de integración entre equipos
│   ├── ARQUITECTURA.md
│   ├── INTEGRACION_IA.md
│   ├── INTEGRACION_FRONTEND.md
│   └── SLITHER_REPORT.txt
└── compose.yml          # Orquestación de servicios con Docker
```

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Contratos inteligentes | Solidity ^0.8.20, Foundry, OpenZeppelin (ERC-4626, EIP-712) |
| Red | Arbitrum Sepolia (testnet) |
| Protocolo DeFi integrado | Aave V3 |
| Backend / Agente de IA | Python, FastAPI, Gemini |
| Frontend | React, TypeScript, Vite |
| Wallets | Wagmi, RainbowKit |
| Infraestructura | Docker Compose, Vercel (frontend), Render (backend) |

---

## Cómo ejecutar el proyecto

### Contratos inteligentes

```bash
cd contracts
forge install       # instala dependencias (OpenZeppelin, forge-std)
forge build
forge test -vv
```

### Backend / Servidor

```bash
cd server
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Variables necesarias en `server/.env` (ver `server/.env.example`):

| Variable | Para qué sirve |
|---|---|
| `AI_AGENT_ADDRESS` / `AI_AGENT_PRIVATE_KEY` | Agente que firma las señales (debe ser el `aiAgent` de los tres vaults) |
| `VAULT_CONTRACT_ADDRESS` | Vault Moderado |
| `VAULT_ADDRESS_CONSERVADOR` | Vault Conservador |
| `VAULT_ADDRESS_AGRESIVO` | Vault Agresivo |
| `INTERNAL_API_KEY` | Clave que se espera en el header `X-API-Key` de `/api/v1/rebalance` |
| `GEMINI_API_KEYS` | Pool de claves de Gemini (separadas por comas) |

Si el vault del modo solicitado no está configurado, `/api/v1/rebalance`
responde `503`; si la petición trae un `vault_address` que no coincide
con el modo, responde `400`. El resto de endpoints son abiertos (solo
lectura).

### Frontend

```bash
cd client
npm install
npm run dev
```

### Todo junto con Docker

```bash
docker compose up
```

---

## Contratos desplegados

| Modo | Red | Dirección |
|---|---|---|
| Moderado | Arbitrum Sepolia | [`0x6Ab1F75e863730de07b68fF87B67717d36cA0Df8`](https://sepolia.arbiscan.io/address/0x6Ab1F75e863730de07b68fF87B67717d36cA0Df8) |
| Conservador | Arbitrum Sepolia | [`0xc4e031259cA7d2390408F10608fAE03982a47F39`](https://sepolia.arbiscan.io/address/0xc4e031259cA7d2390408F10608fAE03982a47F39) |
| Agresivo | Arbitrum Sepolia | [`0x1D48956912c301C0Da67A10F3bC47BB2c8dEad0d`](https://sepolia.arbiscan.io/address/0x1D48956912c301C0Da67A10F3bC47BB2c8dEad0d) |

Tx de despliegue del Moderado: [`0x70fa62c8...df833802`](https://sepolia.arbiscan.io/tx/0x70fa62c8ca687b0c181447f0e807e0aa7e22a66e59e6268323eab5a0df833802)

El vault Moderado es la versión desplegada para la entrega del
hackathon, e incluye el cooldown de rebalanceo on-chain y las
correcciones identificadas por el análisis estático (ver
[Seguridad y pruebas](#seguridad-y-pruebas)). Los vaults Conservador y
Agresivo se desplegaron después, con la misma lógica y sus propios
parámetros de cooldown y exposición.

---

## Seguridad y pruebas

- **Tests unitarios con Foundry** (`forge test -vv`) para cada uno de
  los tres vaults, que cubren depósitos, ejecución de señales de IA,
  validación de firmas, protección contra repetición de nonce, control
  de acceso de administración, cobro de performance fee, recuperación
  de liquidez just-in-time en el retiro y el cooldown de rebalanceo
  (probado explícitamente: bloquea justo después de ejecutar, sigue
  bloqueando un segundo antes de que termine y funciona exactamente
  cuando se cumple). Una suite dedicada
  (`ArbiAgentModeIsolation.t.sol`) comprueba que los vaults están
  aislados entre sí.
- **Análisis estático con [Slither](https://github.com/crytic/slither)**
  ejecutado sobre el contrato Moderado; se corrigieron los hallazgos
  que aplicaban a nuestro propio código (valores de retorno sin usar,
  sombreado de variables locales, evento faltante en un setter). Los
  hallazgos restantes son informativos (uso de timestamp en `require`,
  patrón esperado para deadlines/cooldowns) o pertenecen a la librería
  auditada de OpenZeppelin. Reporte completo:
  [`docs/SLITHER_REPORT.txt`](docs/SLITHER_REPORT.txt)
- **Las direcciones de integración con Aave V3 se verificaron contra el
  registro oficial
  [`aave-address-book`](https://github.com/aave-dao/aave-address-book)**
  para Arbitrum Sepolia antes del despliegue (Pool, activo subyacente
  USDC y aToken).
- El endpoint `/api/v1/rebalance` del backend exige una API key interna
  (fail-closed: el endpoint queda inutilizable si la clave no está
  configurada), para reducir el abuso/spam del pipeline de firma de la
  IA. Es una protección ligera apropiada para el alcance del hackathon,
  no un sustituto de una autenticación de nivel producción: la clave
  viaja en el build del frontend y no está pensada para ser secreta
  frente a un atacante decidido.
- El backend nunca firma para una dirección de contrato arbitraria: el
  vault se deriva del modo solicitado en el lado del servidor.

---

## Evidencia on-chain (prueba de punta a punta)

El flujo completo (depósito, firma EIP-712 del agente de IA, ejecución
on-chain y retiro con recuperación automática de liquidez desde Aave)
se ejecutó con transacciones reales en Arbitrum Sepolia contra el vault
Moderado
([`0x6Ab1F75e...A0Df8`](https://sepolia.arbiscan.io/address/0x6Ab1F75e863730de07b68fF87B67717d36cA0Df8)),
disparado desde el frontend en vivo:

| Paso | Qué demuestra | Transacción |
|---|---|---|
| 1. Depósito (12 USDC) | El usuario deposita USDC y recibe shares del vault (ERC-4626) | [`0x7b9edfc1...bef6481`](https://sepolia.arbiscan.io/tx/0x7b9edfc1486833e769da82009b2a589b6ab6a8cea624ac2e90fbe24dfbef6481) |
| 2. Señal de IA ejecutada | La firma EIP-712 del agente de IA se verifica on-chain y el vault suministra 4.8 USDC a Aave V3 (`SignalExecuted`: supply 4,800,000, withdraw 0) | [`0x9849ff5f...a962dbb1`](https://sepolia.arbiscan.io/tx/0x9849ff5f2b33ff02926339a4185c0983e12705777393edfd071a07b2a962dbb1) |
| 3. Retiro con liquidez just-in-time | Se retiraron 30 USDC cuando solo había ~27.2 USDC líquidos: el vault recuperó los ~2.8 USDC faltantes de Aave (aToken quemado) dentro de la misma transacción | [`0x6de83200...742d9a8`](https://sepolia.arbiscan.io/tx/0x6de832002ebad1376f9274dfcfef2bc297bf293a93303eb394bea22ab742d9a8) |

Las tres transacciones son verificables públicamente: cualquiera puede
inspeccionar los eventos emitidos (`SignalExecuted`, `Supply` de Aave) y
los movimientos de tokens directamente en Arbiscan.

Tras el paso 2 el vault entra en su cooldown de rebalanceo de 8 horas:
una segunda señal enviada de inmediato es rechazada on-chain con
`Cooldown activo`, que es el comportamiento previsto.

---

## Decisiones de diseño relevantes

- **ERC-4626**: estándar de la industria para vaults tokenizados,
  compatible con cualquier herramienta o librería que ya sepa leerlo.
- **Un solo protocolo (Aave V3)**: decisión deliberada dado el tiempo
  del hackathon; una integración real y sólida con un protocolo vale
  más que una simulación superficial de varios. El agente de IA está
  diseñado para evaluar varias fuentes de rendimiento en el futuro, sin
  acoplarse a un solo protocolo.
- **Un vault independiente por modo de riesgo**: Conservador (cooldown
  de 24 h), Moderado (8 h) y Agresivo (2 h) son tres contratos
  separados, cada uno con su propio fondo aislado, shares, cooldown y
  límites de exposición, en lugar de un único vault compartido con modo
  seleccionable. Así los límites de riesgo de cada perfil los hace
  cumplir su propio contrato, y un error o un rebalanceo desfavorable
  en un modo no puede afectar los fondos de otro.
- **El modo es la elección de un vault, no un ajuste sobre tu dinero**:
  elegir un modo en la interfaz cambia el vault del que leen y al que
  envían transacciones las pestañas Vault, AI Strategy y Activity. No
  reconfigura una posición existente. Para cambiar de modo con fondos
  ya depositados, el usuario retira del vault actual y deposita en el
  nuevo. No hay ninguna restricción on-chain para hacerlo, y los
  contratos permiten tener posiciones en varios modos a la vez.
- **Liquidez just-in-time**: el vault recupera automáticamente fondos
  de Aave en el momento del retiro, de modo que el usuario nunca ve
  fallar una transacción solo porque el capital estaba "trabajando".
- **Performance fee**: 10% sobre las ganancias generadas (ajustable por
  el owner, con tope del 20%), pagado en shares del propio vault a la
  tesorería del proyecto. La comisión se cobra de forma global en cada
  rebalanceo (sobre la ganancia reportada por la IA para todo el
  vault), no por usuario al retirar: el valor de las shares de cada
  usuario ya refleja la comisión aplicada. Actualmente
  `profit_generated` está fijado en `0` en el backend, a la espera de
  un cálculo de ganancia on-chain verificado, por lo que esta ruta de
  código aún no está activa en este despliegue.
- **Verificación EIP-712**: cada señal de rebalanceo se firma off-chain
  y se verifica on-chain, evitando que el contrato dependa únicamente
  del control de acceso basado en `msg.sender`. El dominio incluye la
  dirección del vault, por lo que una firma solo es válida para el
  vault para el que se emitió.
- **Cooldown de rebalanceo on-chain**: un cooldown fijo entre llamadas
  a `executeSignal()` (24 h / 8 h / 2 h según el vault) lo hace cumplir
  el propio contrato (no solo se muestra en la interfaz) y es común a
  todo el vault, no por usuario.
- **Consulta de eventos por rangos de bloques**: el RPC público de
  Arbitrum Sepolia rechaza consultas `eth_getLogs` que abarcan más de
  10M de bloques, por lo que el frontend lee los eventos de depósito,
  retiro y rebalanceo por tramos, desde el bloque de despliegue de cada
  vault.
- **Rendimiento (PnL) mostrado**: se calcula como valor actual menos
  principal neto (depósitos menos retiros de la wallet conectada en ese
  vault). Por eso incluye el rendimiento que ya se retiró antes, y es
  una aproximación, no una contabilidad de ganancias realizadas y no
  realizadas.

---

## Equipo y roles

| Rol | Responsable |
|---|---|
| Contratos inteligentes / Integración on-chain | Jesús Alfaro |
| Agente de IA / Middleware | Dante Olivas |
| Frontend / UX / Wallets | Geraldin Nuñez / Dante Olivas |
| Producto / API de backend | Jesús Alfaro |

---

## Nota sobre el modo demo

Este proyecto se ejecuta en **testnet (Arbitrum Sepolia)** con fondos
de prueba. No se manejan activos reales. Todas las operaciones que
muestra la interfaz son verificables on-chain en Arbiscan, pero no
tienen valor monetario real.
