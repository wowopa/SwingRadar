import symbolMasterData from "@/data/config/symbol-master.json";
import symbolReplacementsData from "@/data/config/symbol-replacements.json";

import {
  buildMarketSymbol,
  buildSymbolSuggestion,
  buildTradingViewSymbol,
  createSymbolCatalog,
  getFeaturedSymbolItems,
  searchSymbolItems,
  type RawSymbolMasterItem,
  type RawSymbolReplacementItem
} from "@/lib/symbols/catalog";

export type {
  RawSymbolMasterItem,
  RawSymbolReplacementItem,
  SymbolMarket,
  SymbolMasterItem,
  SymbolMasterSuggestion,
  SymbolRegion,
  SymbolSearchStatus
} from "@/lib/symbols/catalog";

const catalog = createSymbolCatalog(
  symbolMasterData as RawSymbolMasterItem[],
  symbolReplacementsData as RawSymbolReplacementItem[]
);

export const symbolMaster = catalog.symbolMaster;
export const searchSymbols = catalog.searchSymbols;
export const getFeaturedSymbols = catalog.getFeaturedSymbols;
export const getReadySymbols = catalog.getReadySymbols;
export const resolveTicker = catalog.resolveTicker;
export const getSymbolByTicker = catalog.getSymbolByTicker;
export const getSymbolSuggestionByTicker = catalog.getSymbolSuggestionByTicker;
export const getAdjacentReadySymbols = catalog.getAdjacentReadySymbols;

export { buildMarketSymbol, buildSymbolSuggestion, buildTradingViewSymbol, getFeaturedSymbolItems, searchSymbolItems };
