import { useEffect, useState } from "react";
import { syncEngine, type SyncState } from "../sync/syncEngine";

export function useSync(): SyncState {
  const [state, setState] = useState<SyncState>(syncEngine.getState());
  useEffect(() => syncEngine.subscribe(setState), []);
  return state;
}
