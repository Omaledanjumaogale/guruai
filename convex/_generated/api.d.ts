/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agents from "../agents.js";
import type * as agentsInternal from "../agentsInternal.js";
import type * as agentsRun from "../agentsRun.js";
import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as authInternal from "../authInternal.js";
import type * as chats from "../chats.js";
import type * as codegen from "../codegen.js";
import type * as connectors from "../connectors.js";
import type * as email from "../email.js";
import type * as extractor from "../extractor.js";
import type * as extractorInternal from "../extractorInternal.js";
import type * as generations from "../generations.js";
import type * as har from "../har.js";
import type * as harInternal from "../harInternal.js";
import type * as http from "../http.js";
import type * as humanizer from "../humanizer.js";
import type * as keywords from "../keywords.js";
import type * as notes from "../notes.js";
import type * as settings from "../settings.js";
import type * as settingsMutations from "../settingsMutations.js";
import type * as transcript from "../transcript.js";
import type * as transcripts from "../transcripts.js";
import type * as usage from "../usage.js";
import type * as visuals from "../visuals.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agents: typeof agents;
  agentsInternal: typeof agentsInternal;
  agentsRun: typeof agentsRun;
  ai: typeof ai;
  auth: typeof auth;
  authInternal: typeof authInternal;
  chats: typeof chats;
  codegen: typeof codegen;
  connectors: typeof connectors;
  email: typeof email;
  extractor: typeof extractor;
  extractorInternal: typeof extractorInternal;
  generations: typeof generations;
  har: typeof har;
  harInternal: typeof harInternal;
  http: typeof http;
  humanizer: typeof humanizer;
  keywords: typeof keywords;
  notes: typeof notes;
  settings: typeof settings;
  settingsMutations: typeof settingsMutations;
  transcript: typeof transcript;
  transcripts: typeof transcripts;
  usage: typeof usage;
  visuals: typeof visuals;
  workspaces: typeof workspaces;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
