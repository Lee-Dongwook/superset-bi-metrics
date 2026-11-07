import TypedRegistry from "../models/TypedRegistry";
import makeSingleton from "../utils/makeSingleton";
import type { Extensions } from "./types";

class ExtensionsRegistry extends TypedRegistry<Extensions> {
  name = "ExtensionsRegistry";
}

export const getExtensionsRegistry = makeSingleton(ExtensionsRegistry, {});
