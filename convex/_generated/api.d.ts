/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as autoCreateDeveloperChat from "../autoCreateDeveloperChat.js";
import type * as conversations from "../conversations.js";
import type * as helpers from "../helpers.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as presence from "../presence.js";
import type * as reactions from "../reactions.js";
import type * as readReceipts from "../readReceipts.js";
import type * as syncCurrentUser from "../syncCurrentUser.js";
import type * as typing from "../typing.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  autoCreateDeveloperChat: typeof autoCreateDeveloperChat;
  conversations: typeof conversations;
  helpers: typeof helpers;
  http: typeof http;
  messages: typeof messages;
  presence: typeof presence;
  reactions: typeof reactions;
  readReceipts: typeof readReceipts;
  syncCurrentUser: typeof syncCurrentUser;
  typing: typeof typing;
  users: typeof users;
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
