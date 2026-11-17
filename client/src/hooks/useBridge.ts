import { useBridgeContext } from "../context/BridgeContext";

export const useBridge = () => {
  return useBridgeContext();
};