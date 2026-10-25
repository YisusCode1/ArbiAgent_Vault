# Arquitectura — ArbiAgent

Diagrama de la interacción entre los componentes principales del sistema.

📐 Ver en Figma: https://bit.ly/4cxNcvN

> El diagrama de Figma muestra un solo vault. La arquitectura actual tiene
> **tres vaults independientes** (uno por modo de riesgo); el flujo de abajo
> describe el sistema vigente.

## Los tres vaults

Cada modo de riesgo es un contrato propio, con su fondo, sus shares, su
cooldown y sus límites de exposición. Los fondos no se comparten entre modos.

| Modo | Cooldown | Contrato (Arbitrum Sepolia) |
|---|---|---|
| Conservador | 24 h | `0xc4e031259cA7d2390408F10608fAE03982a47F39` |
| Moderado | 8 h | `0x6Ab1F75e863730de07b68fF87B67717d36cA0Df8` |
| Agresivo | 2 h | `0x1D48956912c301C0Da67A10F3bC47BB2c8dEad0d` |

## Descripción del flujo

1. **Usuario** interactúa con el **frontend**, conectando su wallet vía Wagmi/RainbowKit, y elige un **modo de riesgo**. El modo es global en la interfaz: las pestañas Vault, AI Strategy y Activity apuntan al vault de ese modo.
2. El **frontend** hace dos cosas en paralelo:
   - Lee y escribe directamente al **smart contract del modo elegido** para depósitos, retiros y balances (ERC-4626 estándar). Los eventos se consultan por tramos de bloques, porque el RPC público limita cada consulta a 10M de bloques.
   - Consulta al **backend** (enviando el modo) para obtener la estrategia y recomendación actual de la IA.
3. El **agente de IA** (backend) lee datos de mercado de Aave V3 y el estado **del vault del modo elegido** (TVL y fracción invertida), decide la acción de rebalanceo y **firma esa decisión criptográficamente (EIP-712)**. El servidor deduce la dirección del vault a partir del modo, y rechaza (400) un `vault_address` que no corresponda. Si el vault del modo no está configurado, responde 503.
4. Esa señal firmada se envía al **smart contract** vía `executeSignal()`. El dominio EIP-712 incluye la dirección del vault (`verifyingContract`), así que la firma solo vale para el vault para el que se emitió. El contrato **verifica on-chain** que la firma corresponde al `aiAgent` autorizado, y que se cumplen el nonce, el deadline y el cooldown, antes de ejecutar cualquier acción. La misma dirección de agente está autorizada en los tres vaults.
5. El contrato interactúa con el **Pool de Aave V3** (protocolo externo, no propio) para depositar (`supply`) o retirar (`withdraw`) los fondos y generar rendimiento real.

## Qué mueve un rebalanceo y qué no

Un rebalanceo actúa sobre **todo el vault**, no sobre cada usuario. Solo cambia la fracción de fondos entre "USDC sin invertir" y "suministrado a Aave" dentro del contrato. No altera las shares de nadie, y un retiro solo quema las shares de quien lo solicita (el vault recupera liquidez de Aave si hace falta).

Cambiar de modo con fondos depositados implica retirar del vault actual y depositar en el nuevo; no hay restricción on-chain para ello.

## Por qué la verificación EIP-712 importa

El contrato nunca confía únicamente en `msg.sender` para autorizar una acción de rebalanceo — verifica criptográficamente que la señal fue firmada por la clave privada del agente de IA autorizado, permitiendo auditar on-chain que cada decisión ejecutada realmente provino del sistema de IA y no fue falsificada. Al incluir la dirección del vault en el dominio, una firma emitida para un modo tampoco puede reutilizarse en otro.