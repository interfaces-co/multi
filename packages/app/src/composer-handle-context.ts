import { createContext, useContext, type MutableRefObject } from "react";
import type { ComposerInputHandle } from "./components/chat/composer/composer-input";

export type ComposerHandleRef = MutableRefObject<ComposerInputHandle | null>;

export const ComposerHandleContext = createContext<ComposerHandleRef | null>(null);

export function useComposerHandleContext(): ComposerHandleRef | null {
  return useContext(ComposerHandleContext);
}
