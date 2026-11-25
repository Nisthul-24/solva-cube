/**
 * React Native / Hermes Global Polyfills
 *
 * Hermes does not provide a complete Node.js process environment (only process.env).
 * Node-targeted libraries (like Three.js or bundler tools) call process.emitWarning
 * which throws a fatal TypeError: undefined is not a function in production Hermes builds.
 */
if (typeof process !== 'undefined' && typeof (process as any).emitWarning !== 'function') {
  (process as any).emitWarning = function emitWarning(warning: string | Error) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[process.emitWarning]', typeof warning === 'string' ? warning : warning?.message);
    }
  };
}
