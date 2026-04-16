/**
 * Compatibility shim: Glass components import readNativeApi/ensureNativeApi.
 * In c-t3, the equivalent is readLocalApi/ensureLocalApi from ~/localApi.
 */
export { readLocalApi as readNativeApi, ensureLocalApi as ensureNativeApi } from "./localApi";
export {
  ensureGlassEnvironmentApi,
  readGlassEnvironmentApi,
  readGlassRuntimeApi,
  type GlassRuntimeApi,
  type ReadGlassRuntimeApiOptions,
} from "./lib/glass-runtime-api";
