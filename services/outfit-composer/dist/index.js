"use strict";
/**
 * Outfit Composer Service - Main Entry Point
 *
 * Exports all public APIs for external consumption.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOutfits = exports.saveComposedOutfit = exports.fetchOutfitRecipe = void 0;
__exportStar(require("./types"), exports);
__exportStar(require("./composer"), exports);
__exportStar(require("./scoring"), exports);
var sanity_client_1 = require("./sanity-client");
Object.defineProperty(exports, "fetchOutfitRecipe", { enumerable: true, get: function () { return sanity_client_1.fetchOutfitRecipe; } });
Object.defineProperty(exports, "saveComposedOutfit", { enumerable: true, get: function () { return sanity_client_1.saveComposedOutfit; } });
var claude_api_1 = require("./claude-api");
Object.defineProperty(exports, "generateOutfits", { enumerable: true, get: function () { return claude_api_1.generateOutfits; } });
//# sourceMappingURL=index.js.map