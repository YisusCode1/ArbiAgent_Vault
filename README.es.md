🌐 [English](README.md) | **Español**

# ArbiAgent — Bóveda DeFi con IA en Arbitrum

> Bóveda ERC-4626 en Arbitrum que combina rendimiento DeFi real (Aave V3)
> con decisiones de rebalanceo tomadas por IA, verificadas on-chain
> mediante firmas criptográficas (EIP-712).

Proyecto desarrollado para el Hackathon EthLima 2026,
categoría **AI - Blockchain**.

---

## Demo en vivo

- **Frontend**: https://arbi-agent-vault.vercel.app
- **Backend / API**: https://arbiagent-vault-ziq4.onrender.com

⚠️ El backend corre en un plan gratuito que se "duerme" tras un periodo
de inactividad: la primera petición después de estar inactivo puede
tardar hasta 50 segundos en responder mientras el servicio despierta.

---

## El problema

Gestionar manualmente el rendimiento en DeFi implica vigilar tasas
constantemente, mover fondos entre protocolos y reaccionar a los
cambios del mercado, algo poco práctico para la mayoría de los usuarios.

## Público objetivo

Personas que ya tienen stablecoins o ETH inactivos y quieren que generen
rendimiento, pero no quieren convertirse en gestores activos de DeFi
revisando tasas y protocolos todos los días. Buscan una experiencia de
"deposito y confío", con la posibilidad de verificar en cualquier momento,
on-chain, que el sistema actúa exactamente como dice.

## La solución

Una bóveda donde:

1. El usuario deposita un activo y recibe shares (estándar ERC-4626).
2. Un **agente de IA** analiza datos de mercado y decide cómo asignar el
   capital.
3. Esa decisión se **firma criptográficamente** fuera de la cadena y solo
   se ejecuta on-chain si la firma es válida: el contrato nunca confía a
   ciegas en quién llama a la función, solo en quién firmó.
4. Los fondos se depositan en **Aave V3** (Arbitrum) para generar
   rendimiento real.
5. El usuario puede retirar en cualquier momento; la bóveda recupera
   automáticamente la liquidez si los fondos están desplegados.

---

## Arquitectura

```
┌─────────────┐      Firma EIP-712       ┌──────────────────┐
│ Agente IA   │ ───────────────────────▶│ Contrato inteligente│
│  (Python)   │                          │  ArbiAgentVault    │
└─────────────┘                          │  (ERC-4626)         │
      ▲                                  └────────┬───────────┘
      │ datos de mercado                          │ supply/withdraw
      │                                            ▼
┌─────────────┐                          ┌──────────────────┐
│ API/Servidor│                          │   Pool de Aave V3  │
│  (FastAPI)  │                          │   (Arbitrum)        │
└─────────────┘                          └──────────────────┘
      ▲
      │ REST (protegido con API key interna)
┌─────────────┐
│  Frontend    │
│  (React)     │
└─────────────┘
```

Diagrama detallado (Mermaid, interactivo en GitHub): [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md)

**Por qué firmas y no solo un rol con permisos:** cualquiera puede enviar
la transacción de ejecución, pero el contrato solo la procesa si la firma
coincide con la clave privada del agente de IA. Esto permite verificar
criptográficamente, on-chain, que la señal realmente vino de la IA y no
fue falsificada ni alterada.

---

## Estructura del repositorio

```
ArbiAgent/
├── client/            # Frontend (React + Vite + TypeScript)
├── contracts/          # Contratos inteligentes (Foundry)
│   ├── src/             # ArbiAgentVault.sol
│   └── test/             # Tests de Foundry
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

El endpoint `/api/v1/rebalance` requiere un header `X-API-Key` que
coincida con `INTERNAL_API_KEY` (definida en `server/.env`). Los demás
endpoints son abiertos (solo lectura).

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

## Contrato desplegado

| Red | Dirección |
|---|---|
| Arbitrum Sepolia | [`0x6Ab1F75e863730de07b68fF87B67717d36cA0Df8`](https://sepolia.arbiscan.io/address/0x6Ab1F75e863730de07b68fF87B67717d36cA0Df8) |

Tx de despliegue: [`0x70fa62c8...df833802`](https://sepolia.arbiscan.io/tx/0x70fa62c8ca687b0c181447f0e807e0aa7e22a66e59e6268323eab5a0df833802)

Esta es la versión final desplegada para el hackathon, e incluye el
cooldown de rebalanceo on-chain y las correcciones identificadas por el
análisis estático (ver [Seguridad y pruebas](#seguridad-y-pruebas) más abajo).

---

## Seguridad y pruebas

- **12/12 tests unitarios pasando** con Foundry (`forge test -vv`), que
  cubren depósitos, ejecución de señales de IA, validación de firmas,
  protección contra reutilización de nonce, control de acceso de
  administración, cobro de comisión de desempeño, recuperación de
  liquidez just-in-time al retirar y el **cooldown de rebalanceo de 8
  horas** (probado explícitamente: bloquea justo después de ejecutar,
  sigue bloqueando un segundo antes de que termine y permite ejecutar
  exactamente cuando se cumple).
- **Análisis estático con [Slither](https://github.com/crytic/slither)**
  ejecutado sobre el contrato. Los hallazgos que aplicaban a nuestro
  código (valores de retorno ignorados, sombreado de variables locales y
  un evento faltante en un setter) fueron corregidos. Los hallazgos
  restantes son informativos (uso de timestamp en los `require`, que es el
  patrón esperado para deadlines y cooldowns) o pertenecen al código de
  librería auditado de OpenZeppelin. Reporte completo:
  [`docs/SLITHER_REPORT.txt`](docs/SLITHER_REPORT.txt)
- **Las direcciones de integración con Aave V3 se verificaron contra el
  registro oficial [`aave-address-book`](https://github.com/aave-dao/aave-address-book)**
  para Arbitrum Sepolia antes del despliegue (Pool, activo subyacente USDC
  y aToken).
- El endpoint `/api/v1/rebalance` del backend requiere una API key interna
  (fail-closed: si la clave no está configurada, el endpoint queda
  inutilizable), para reducir abusos/spam del pipeline de firma de la IA.
  Es una protección ligera adecuada al alcance del hackathon, no un
  sustituto de un sistema de autenticación de nivel producción: la clave
  viaja incluida en el build del frontend y no está pensada para ser
  secreta frente a un atacante decidido.

---

## Evidencia on-chain (prueba de punta a punta)

El flujo completo (depósito, firma EIP-712 del agente de IA, ejecución
on-chain y retiro con recuperación automática de liquidez desde Aave) se
ejecutó con transacciones reales en Arbitrum Sepolia contra el despliegue
actual
([`0x6Ab1F75e...A0Df8`](https://sepolia.arbiscan.io/address/0x6Ab1F75e863730de07b68fF87B67717d36cA0Df8)),
disparado desde el frontend en vivo:

| Paso | Qué demuestra | Transacción |
|---|---|---|
| 1. Depósito (12 USDC) | El usuario deposita USDC y recibe shares de la bóveda (ERC-4626) | [`0x7b9edfc1...bef6481`](https://sepolia.arbiscan.io/tx/0x7b9edfc1486833e769da82009b2a589b6ab6a8cea624ac2e90fbe24dfbef6481) |
| 2. Señal de IA ejecutada | La firma EIP-712 del agente de IA se verifica on-chain y la bóveda deposita 4.8 USDC en Aave V3 (`SignalExecuted`: supply 4,800,000, withdraw 0) | [`0x9849ff5f...a962dbb1`](https://sepolia.arbiscan.io/tx/0x9849ff5f2b33ff02926339a4185c0983e12705777393edfd071a07b2a962dbb1) |
| 3. Retiro con liquidez just-in-time | Se retiraron 30 USDC cuando solo había ~27.2 USDC líquidos: la bóveda recuperó los ~2.8 USDC faltantes desde Aave (aToken quemado) dentro de la misma transacción | [`0x6de83200...742d9a8`](https://sepolia.arbiscan.io/tx/0x6de832002ebad1376f9274dfcfef2bc297bf293a93303eb394bea22ab742d9a8) |

Las tres transacciones son verificables públicamente: cualquiera puede
inspeccionar los eventos emitidos (`SignalExecuted`, `Supply` de Aave) y
los movimientos de tokens directamente en Arbiscan.

Después del paso 2, la bóveda entra en su cooldown de rebalanceo de 8
horas: una segunda señal enviada de inmediato es rechazada on-chain con
`Cooldown activo`, que es el comportamiento esperado.

---

## Decisiones de diseño relevantes

- **ERC-4626**: estándar de la industria para bóvedas tokenizadas,
  compatible con cualquier herramienta o librería que ya sepa leerlo.
- **Un solo protocolo (Aave V3)**: decisión deliberada dado el tiempo del
  hackathon; una integración real y sólida con un protocolo vale más que
  una simulación superficial de varios. El agente de IA está diseñado para
  evaluar múltiples fuentes de rendimiento en el futuro, sin estar acoplado
  a un único protocolo.
- **Un solo modo de riesgo (Moderado) en este despliegue**: el contrato y
  el motor de decisión soportan los perfiles Conservador / Moderado /
  Agresivo, pero para este hackathon solo se despliega la bóveda Moderada
  (cooldown de 8 horas, exposición máxima a Aave del 80%). Conservador y
  Agresivo están en el roadmap como contratos de bóveda separados e
  independientes, cada uno con su propio pool de fondos aislado, cooldown y
  límites de exposición, en lugar de una única bóveda compartida con modo
  seleccionable.
- **Liquidez just-in-time**: la bóveda recupera automáticamente fondos de
  Aave al momento de retirar, de modo que el usuario nunca ve una
  transacción fallar solo porque el capital estaba "trabajando".
- **Comisión de desempeño**: 10% sobre las ganancias generadas (ajustable
  por el owner, con tope de 20%), pagada en shares de la propia bóveda a la
  tesorería del proyecto. La comisión se cobra de forma global en cada
  rebalanceo (sobre la ganancia reportada por la IA para toda la bóveda),
  no por usuario al momento de retirar: el valor de las shares de cada
  usuario ya refleja la comisión aplicada. `profit_generated` está
  actualmente fijado en `0` en el backend, a la espera de un cálculo
  on-chain verificado de la ganancia, por lo que esta ruta de código aún no
  está activa en este despliegue.
- **Verificación EIP-712**: cada señal de rebalanceo se firma fuera de la
  cadena y se verifica on-chain, evitando que el contrato dependa
  únicamente de un control de acceso basado en `msg.sender`.
- **Cooldown de rebalanceo on-chain**: un cooldown fijo de 8 horas entre
  llamadas a `executeSignal()` lo hace cumplir el propio contrato (no solo
  se muestra en la interfaz), compartido por toda la bóveda, no por
  usuario.

---

## Equipo y roles

| Rol | Responsable |
|---|---|
| Contratos inteligentes / Integración on-chain | Jesús Alfaro |
| Agente de IA / Middleware | Dante Olivas |
| Frontend / UX / Wallets | Geraldin Nuñez / Dante Olivas |
| Producto / API de backend | Dante Olivas / Jesús Alfaro |

---

## Nota sobre el modo demo

Este proyecto corre en **testnet (Arbitrum Sepolia)** con fondos de
prueba. No se manejan activos reales. Todas las operaciones mostradas en
la interfaz son verificables on-chain a través de Arbiscan, pero no tienen
valor monetario real.
