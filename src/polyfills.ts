/**
 * React Native / Hermes Global Polyfills
 *
 * 1. process.emitWarning:
 *    Hermes does not provide a complete Node.js process environment (only process.env).
 *    Node-targeted libraries (like Three.js or bundler tools) call process.emitWarning
 *    which throws a fatal TypeError: undefined is not a function in production Hermes builds.
 *
 * 2. FinalizationRegistry & WeakRef:
 *    Hermes on Android does not support FinalizationRegistry (or WeakRef) natively.
 *    Three.js WebGLGeometries and WebGLTextures use new FinalizationRegistry(...)
 *    and new WeakRef(...) for garbage collection tracking. Without this polyfill,
 *    WebGL initialization throws "Property 'FinalizationRegistry' doesn't exist".
 */

// 1. process.emitWarning
if (typeof process !== 'undefined' && typeof (process as any).emitWarning !== 'function') {
  (process as any).emitWarning = function emitWarning(warning: string | Error) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[process.emitWarning]', typeof warning === 'string' ? warning : warning?.message);
    }
  };
}

// 2. FinalizationRegistry
const globalScope = typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : window;

if (typeof (globalScope as any).FinalizationRegistry === 'undefined') {
  class FinalizationRegistryPolyfill {
    private cleanupCallback: (heldValue: any) => void;
    constructor(cleanupCallback: (heldValue: any) => void) {
      this.cleanupCallback = cleanupCallback;
    }
    register(_target: object, _heldValue: any, _unregisterToken?: object): void {
      // In engines without GC finalizers (like Hermes), automatic finalization is a no-op
    }
    unregister(_unregisterToken: object): boolean {
      return true;
    }
  }

  (globalScope as any).FinalizationRegistry = FinalizationRegistryPolyfill;
  if (typeof global !== 'undefined') {
    (global as any).FinalizationRegistry = FinalizationRegistryPolyfill;
  }
}

// 3. WeakRef
if (typeof (globalScope as any).WeakRef === 'undefined') {
  class WeakRefPolyfill<T extends object> {
    private target: T;
    constructor(target: T) {
      this.target = target;
    }
    deref(): T | undefined {
      return this.target;
    }
  }

  (globalScope as any).WeakRef = WeakRefPolyfill;
  if (typeof global !== 'undefined') {
    (global as any).WeakRef = WeakRefPolyfill;
  }
}
