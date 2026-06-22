export type EndpointParamDefinition = {
  key: string;
  value?: string;
  source?: "text" | "variable" | "generated" | "choice";
};

export type EndpointDefinition = {
  group: string;
  name: string;
  method: string;
  path: string;
  params?: EndpointParamDefinition[];
  note?: string;
};

export const builtinEndpointCatalog: EndpointDefinition[] = [
  // * /app/ * //
  {
    group: "app",
    name: "init",
    method: "POST",
    path: "/app/init",
    params: [
      { key: "platform", value: "standalonewindows64", source: "choice" },
      { key: "key", value: "9KnJFxtTvLu2frXv" },
      { key: "game_net", value: "Unity", source: "choice" },
      { key: "play_platform", value: "Unity", source: "choice" },
      { key: "game_net_user_id", value: "_empty_", source: "choice" }
    ]
  },
  { group: "app", name: "publicStaticData", method: "POST", path: "/app/publicStaticData", params: [{ key: "dataType", value: "powerUpSettings" }] },
  // * /achievements/ * //
  { group: "achievements", name: "getDefinitions", method: "GET", path: "/achievements/getDefinitions", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }] },
  { group: "achievements", name: "getPlayerAchievements", method: "POST", path: "/achievements/getPlayerAchievements", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }] },
  // * /account/ * //
  {
    group: "account",
    name: "verify",
    method: "POST",
    path: "/account/verify",
    params: [
      { key: "guid", value: "{{guid}}", source: "variable" },
      { key: "password", value: "{{password}}", source: "variable" },
      { key: "clientToken", value: "{{clientToken}}", source: "variable" }
    ]
  },
  { group: "account", name: "verifyAccessTokenClient", method: "POST", path: "/account/verifyAccessTokenClient", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }] },
  { group: "account", name: "extendAccessToken", method: "POST", path: "/account/extendAccessToken", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }] },
  { group: "account", name: "isEmailVerified", method: "POST", path: "/account/isEmailVerified", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }] },
  { group: "account", name: "sendVerifyEmail", method: "POST", path: "/account/sendVerifyEmail", params: [{ key: "guid", value: "{{guid}}", source: "variable" }, { key: "password", value: "{{password}}", source: "variable" }] },
  { group: "account", name: "getCredits", method: "POST", path: "/account/getCredits", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }] },
  { group: "account", name: "listPowerUpStat", method: "POST", path: "/account/listPowerUpStat", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }] },
  { group: "account", name: "getDustCost", method: "POST", path: "/account/getDustCost", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }] },
  { group: "account", name: "ownedSkins", method: "POST", path: "/account/ownedSkins", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }] },
  { group: "account", name: "servers", method: "POST", path: "/account/servers", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }] },
  { group: "account", name: "setName", method: "POST", path: "/account/setName", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }, { key: "name" }] },
  {
    group: "account",
    name: "register",
    method: "POST",
    path: "/account/register",
    params: [
      { key: "newPassword", value: "{{password}}", source: "variable" },
      { key: "newGUID", value: "{{guid}}", source: "variable" },
      { key: "isAgeVerified", value: "1", source: "choice" },
      { key: "guid", value: "{{guid}}", source: "generated" },
      { key: "signedUpKabamEmail", value: "0" }
    ]
  },
  {
    group: "account",
    name: "changePassword",
    method: "POST",
    path: "/account/changePassword",
    params: [
      { key: "guid", value: "{{guid}}", source: "variable" },
      { key: "password", value: "{{password}}", source: "variable" },
      { key: "newPassword" }
    ]
  },
  { group: "account", name: "forgotPassword", method: "POST", path: "/account/forgotPassword", params: [{ key: "guid", value: "{{guid}}", source: "variable" }] },
  {
    group: "account",
    name: "addIgnore",
    method: "POST",
    path: "/account/addIgnore",
    params: [
      { key: "accessToken", value: "{{accessToken}}", source: "variable" },
      { key: "name"}
    ]
  },
  {
    group: "account",
    name: "addStar",
    method: "POST",
    path: "/account/addStar",
    params: [
      { key: "accessToken", value: "{{accessToken}}", source: "variable" },
      { key: "name"}
    ]
  },
  {
    group: "account",
    name: "ban",
    method: "POST",
    path: "/account/ban",
    params: [
      { key: "accessToken", value: "{{accessToken}}", source: "variable" },
      { key: "name"}
    ]
  },
  {
    group: "account",
    name: "spammer",
    method: "POST",
    path: "/account/spammer",
    params: [
      { key: "accessToken", value: "{{accessToken}}", source: "variable" },
      { key: "name"}
    ]
  },
  { group: "account", name: "claimLoginReward", method: "POST", path: "/account/claimLoginReward", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }] },
  // * /char/ * //
  { group: "char", name: "list", method: "POST", path: "/char/list", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }] },
  {
    group: "char",
    name: "fame",
    method: "POST",
    path: "/char/fame",
    params: [
      { key: "accessToken", value: "{{accessToken}}", source: "variable" },
      { key: "accountId" },
      { key: "charId" }
    ]
  },
  {
    group: "char",
    name: "delete",
    method: "POST",
    path: "/char/delete",
    params: [
      { key: "guid", value: "{{guid}}", source: "variable" },
      { key: "password", value: "{{password}}", source: "variable" },
      { key: "charId" },
      { key: "reason", value: "1" }
    ]
  },
  // * /credits/ * //
  { group: "credits", name: "getCredits", method: "POST", path: "/credits/getCredits", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }] },
  { group: "credits", name: "token", method: "POST", path: "/credits/token", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" } ]},
  { group: "credits", name: "pwpurchase", method: "POST", path: "/credits/pwpurchase", params: [{ key: "iframeUrl" }] },
  {
    group: "credits",
    name: "add",
    method: "POST",
    path: "/credits/add",
    params: [
      { key: "accessToken", value: "{{accessToken}}", source: "variable" },
      { key: "tok", value: "{{password}}", source: "variable" },
      { key: "exp" },
      { key: "provider"},
      { key: "jwt" },
      { key: "price" },
      { key: "paymentid" },
    ]
  },
  { group: "credits", name: "done", method: "POST", path: "/credits/done" },
  { group: "credits", name: "error", method: "POST", path: "/credits/error" },
  // * /fame/ * //
  {
    group: "fame",
    name: "list",
    method: "GET",
    path: "/fame/list",
    params: [
      { key: "timespan", value: "week", source: "choice" },
      { key: "charId" },
      { key: "accountId" },
      { key: "accessToken", value: "{{accessToken}}", source: "variable" }
    ]
  },
  // * /friends/ * //
  { group: "friends", name: "getList", method: "POST", path: "/friends/getList", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }] },
  { group: "friends", name: "getRequests", method: "POST", path: "/friends/getRequests", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }] },
  { group: "friends", name: "requestFriend", method: "POST", path: "/friends/requestFriend", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }, { key: "targetName" }] },
  { group: "friends", name: "blockRequest", method: "POST", path: "/friends/blockRequest", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }, { key: "targetName" }] },
  // * /guild/ * //
  { group: "guild", name: "getBoard", method: "POST", path: "/guild/getBoard", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }] },
  { group: "guild", name: "setBoard", method: "POST", path: "/guild/setBoard", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }, { key: "board" }] },
  { group: "guild", name: "listMembers", method: "POST", path: "/guild/listMembers", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }] },
  // * /missions/ * //
  { group: "missions", name: "getClientSeasons", method: "POST", path: "/missions/getClientSeasons", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }] },
  { group: "missions", name: "getPlayerMissions", method: "POST", path: "/missions/getPlayerMissions", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }] },
  // * /mysterybox/ * //
  { group: "mysterybox", name: "getBoxes", method: "POST", path: "/mysterybox/getBoxes", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }] },
  // * /dailyLogin/ * //
  { group: "dailyLogin", name: "fetchCalendar", method: "POST", path: "/dailyLogin/fetchCalendar", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }] },
  // * /inGameNews/ * //
  { group: "inGameNews", name: "getNews", method: "GET", path: "/inGameNews/getNews" },
  // * /dungeonEvent/ * //
  { group: "dungeonEvent", name: "getClientEvents", method: "POST", path: "/dungeonEvent/getClientEvents", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }] },
  // * /package/ * //
  { group: "package", name: "getPackages", method: "POST", path: "/package/getPackages", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }] },
  // * /server/ * //
  { group: "server", name: "list", method: "POST", path: "/server/list", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }] },
  { group: "server", name: "add", method: "POST", path: "/server/add", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }] },
  { group: "server", name: "remove", method: "POST", path: "/server/remove", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }] },
  // * /serverStatus/ * //
  { group: "serverStatus", name: "get", method: "POST", path: "/serverStatus/getServerStatus", params: [{ key: "accessToken", value: "{{accessToken}}", source: "variable" }] },
  // * /unityNews/ * //
  { group: "unityNews", name: "getNews", method: "GET", path: "/unityNews/getNews" },
  // * /root/ * //
  { group: "root", name: "version.txt", method: "GET", path: "/version.txt" }
];
