/**
 * Compatibility shim: shell UI imports readNativeApi/ensureNativeApi.
 * In c-t3, the equivalent is readLocalApi/ensureLocalApi from ~/localApi.
 */
export { readLocalApi as readNativeApi, ensureLocalApi as ensureNativeApi } from "./localApi";
export {
  ensureNativeEnvironmentApi,
  readNativeEnvironmentApi,
  readNativeRuntimeApi,
  type NativeRuntimeApi,
  type ReadNativeRuntimeApiOptions,
} from "./lib/native-runtime-api";
