"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var catch_error_1 = require("./diff/catch-error");
/**
 * The `option` object can potentially contain callback functions
 * that are called during various stages of our renderer. This is the
 * foundation on which all our addons like `preact/debug`, `preact/compat`,
 * and `preact/hooks` are based on. See the `Options` type in `internal.d.ts`
 * for a full list of available option hooks (most editors/IDEs allow you to
 * ctrl+click or cmd+click on mac the type definition below).
 * @type {import('./internal').Options}
 */
var options = {
    _catchError: catch_error_1._catchError
};
exports.default = options;
