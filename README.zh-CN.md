# @catalyst-team/poly-sdk

[![npm version](https://img.shields.io/npm/v/@catalyst-team/poly-sdk.svg)](https://www.npmjs.com/package/@catalyst-team/poly-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Polymarket 统一 TypeScript SDK** - 交易、市场数据、聪明钱分析和链上操作。

**开发者**: [@hhhx402](https://x.com/hhhx402) | **项目**: [Catalyst.fun](https://x.com/catalystdotfun)

[English](README.md)

---

## 目录

- [概览](#概览)
- [安装](#安装)
- [架构](#架构)
- [快速开始](#快速开始)
- [服务指南](#服务指南)
  - [PolymarketSDK (入口)](#polymarketsdk-入口)
  - [TradingService](#tradingservice)
  - [MarketService](#marketservice)
  - [OnchainService](#onchainservice)
  - [RealtimeServiceV2](#realtimeservicev2)
  - [WalletService](#walletservice)
  - [SmartMoneyService](#smartmoneyservice)
  - [ArbitrageService](#arbitrageservice)
- [底层客户端](#底层客户端)
- [破坏性变更 (v0.3.0)](#破坏性变更-v030)
- [示例](#示例)
- [API 参考](#api-参考)
- [许可证](#许可证)

---

## 概览

`@catalyst-team/poly-sdk` 是一个全面的 TypeScript SDK，提供：

- **交易** - 下限价单/市价单 (GTC, GTD, FOK, FAK)
- **市场数据** - 实时价格、订单簿、K线、历史成交
- **聪明钱分析** - 追踪顶级交易者、计算聪明分数、跟单策略
- **链上操作** - CTF (split/merge/redeem)、授权、DEX 交换
- **套利检测** - 实时套利扫描和执行
- **WebSocket 推送** - 实时价格和订单簿更新

### 核心功能

| 功能 | 描述 |
|------|------|
| **统一 API** | 单一 SDK 访问所有 Polymarket API |
| **类型安全** | 完整的 TypeScript 支持和类型定义 |
| **速率限制** | 按 API 端点内置速率限制 |
| **缓存** | 基于 TTL 的缓存，支持可插拔适配器 |
| **错误处理** | 结构化错误和自动重试 |

---

## 安装

```bash
pnpm add @catalyst-team/poly-sdk

# 或
npm install @catalyst-team/poly-sdk

# 或
yarn add @catalyst-team/poly-sdk
```

---

## 架构

SDK 分为三层：

```
poly-sdk 架构
================================================================================

┌──────────────────────────────────────────────────────────────────────────────┐
│                              PolymarketSDK                                    │
│                               (入口点)                                         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  第三层: 高级服务 (推荐使用)                                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                      │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                 │
│  │  TradingService │ │  MarketService  │ │ OnchainService  │                 │
│  │  ────────────── │ │  ────────────── │ │ ──────────────  │                 │
│  │  • 限价单       │ │  • K线          │ │ • Split/Merge   │                 │
│  │  • 市价单       │ │  • 订单簿       │ │ • Redeem        │                 │
│  │  • 订单管理     │ │  • 价格历史     │ │ • 授权          │                 │
│  │  • 奖励         │ │  • 套利检测     │ │ • 交换          │                 │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘                 │
│                                                                               │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                 │
│  │RealtimeServiceV2│ │  WalletService  │ │SmartMoneyService│                 │
│  │  ────────────── │ │  ────────────── │ │ ──────────────  │                 │
│  │  • WebSocket    │ │  • 用户画像     │ │ • 顶级交易者    │                 │
│  │  • 价格推送     │ │  • 聪明分数     │ │ • 跟单交易      │                 │
│  │  • 订单簿更新   │ │  • 卖出检测     │ │ • 信号检测      │                 │
│  │  • 用户事件     │ │  • PnL 计算     │ │ • 排行榜        │                 │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘                 │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                        ArbitrageService                                  │ │
│  │  ─────────────────────────────────────────────────────────────────────  │ │
│  │  • 市场扫描    • 自动执行    • 再平衡器    • 智能清仓                      │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  第二层: 底层客户端 (高级用户 / 原始 API 访问)                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                       │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ │
│  │GammaApiClnt│ │DataApiClnt │ │SubgraphClnt│ │ CTFClient  │ │BridgeClient│ │
│  │ ────────── │ │ ────────── │ │ ────────── │ │ ────────── │ │ ────────── │ │
│  │ • 市场     │ │ • 持仓     │ │ • 链上数据 │ │ • Split    │ │ • 跨链     │ │
│  │ • 事件     │ │ • 交易     │ │ • PnL      │ │ • Merge    │ │   充值     │ │
│  │ • 搜索     │ │ • 活动     │ │ • OI       │ │ • Redeem   │ │            │ │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘ │
│                                                                               │
│  使用官方 Polymarket 客户端:                                                   │
│  • @polymarket/clob-client - 交易、订单簿、市场数据                            │
│  • @polymarket/real-time-data-client - WebSocket 实时更新                     │
│                                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  第一层: 核心基础设施                                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                                │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ │
│  │ 速率限制器 │ │    缓存    │ │    错误    │ │    类型    │ │  价格工具  │ │
│  │ ────────── │ │ ────────── │ │ ────────── │ │ ────────── │ │ ────────── │ │
│  │ • 按 API   │ │ • 基于 TTL │ │ • 重试     │ │ • 统一     │ │ • 套利计算 │ │
│  │ • Bottleneck│ │ • 可插拔   │ │ • 错误码   │ │ • K线      │ │ • 舍入     │ │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘ │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 服务职责

| 服务 | 职责 |
|------|------|
| **PolymarketSDK** | 入口点，整合所有服务 |
| **TradingService** | 订单管理（下单/撤单/查询）|
| **MarketService** | 市场数据（订单簿/K线/搜索）|
| **OnchainService** | 链上操作（split/merge/redeem/授权/交换）|
| **RealtimeServiceV2** | WebSocket 实时数据 |
| **WalletService** | 钱包/交易者分析 |
| **SmartMoneyService** | 聪明钱跟踪 |
| **ArbitrageService** | 套利检测与执行 |

---

## 快速开始

### 基础用法（只读）

```typescript
import { PolymarketSDK } from '@catalyst-team/poly-sdk';

// 只读操作无需认证
const sdk = new PolymarketSDK();

// 通过 slug 或 condition ID 获取市场
const market = await sdk.getMarket('will-trump-win-2024');
console.log(`${market.question}`);
console.log(`YES: ${market.tokens.find(t => t.outcome === 'Yes')?.price}`);
console.log(`NO: ${market.tokens.find(t => t.outcome === 'No')?.price}`);

// 获取处理后的订单簿（含分析数据）
const orderbook = await sdk.getOrderbook(market.conditionId);
console.log(`多头套利利润: ${orderbook.summary.longArbProfit}`);
console.log(`空头套利利润: ${orderbook.summary.shortArbProfit}`);

// 检测套利机会
const arb = await sdk.detectArbitrage(market.conditionId);
if (arb) {
  console.log(`${arb.type.toUpperCase()} 套利: ${(arb.profit * 100).toFixed(2)}% 利润`);
  console.log(arb.action);
}
```

### 带认证（交易）

```typescript
import { PolymarketSDK } from '@catalyst-team/poly-sdk';

const sdk = new PolymarketSDK({
  privateKey: process.env.POLYMARKET_PRIVATE_KEY!,
  // 可选: API 凭证用于更高速率限制
  creds: {
    key: process.env.POLY_API_KEY!,
    secret: process.env.POLY_API_SECRET!,
    passphrase: process.env.POLY_PASSPHRASE!,
  },
});

// 初始化用于交易（从私钥派生 API 凭证）
await sdk.initialize();

// 下限价单
const order = await sdk.tradingService.createLimitOrder({
  tokenId: yesTokenId,
  side: 'BUY',
  price: 0.45,
  size: 10,
  orderType: 'GTC',
});
console.log(`订单已下: ${order.id}`);

// 获取未成交订单
const openOrders = await sdk.tradingService.getOpenOrders();
console.log(`未成交订单: ${openOrders.length}`);
```

---

## 服务指南

### PolymarketSDK (入口)

整合所有服务的主 SDK 类。

```typescript
import { PolymarketSDK } from '@catalyst-team/poly-sdk';

const sdk = new PolymarketSDK({
  privateKey: '0x...', // 可选: 用于交易
  chainId: 137,        // 可选: Polygon 主网（默认）
  cache: customCache,  // 可选: 自定义缓存适配器
});

// 访问服务
sdk.tradingService  // 交易操作
sdk.markets         // 市场数据
sdk.wallets         // 钱包分析
sdk.dataApi         // 直接访问 Data API
sdk.gammaApi        // 直接访问 Gamma API
sdk.subgraph        // 通过 Goldsky 访问链上数据

// 便捷方法
await sdk.getMarket(identifier);        // 获取统一市场
await sdk.getOrderbook(conditionId);    // 获取处理后的订单簿
await sdk.detectArbitrage(conditionId); // 检测套利机会
```

---

### TradingService

使用 `@polymarket/clob-client` 进行订单管理。

```typescript
import { TradingService } from '@catalyst-team/poly-sdk';

const trading = new TradingService(rateLimiter, cache, {
  privateKey: process.env.POLYMARKET_PRIVATE_KEY!,
});
await trading.initialize();

// ===== 限价单 =====

// GTC: 一直有效直到取消
const gtcOrder = await trading.createLimitOrder({
  tokenId: yesTokenId,
  side: 'BUY',
  price: 0.45,
  size: 10,
  orderType: 'GTC',
});

// GTD: 有效期至指定时间
const gtdOrder = await trading.createLimitOrder({
  tokenId: yesTokenId,
  side: 'BUY',
  price: 0.45,
  size: 10,
  orderType: 'GTD',
  expiration: Math.floor(Date.now() / 1000) + 3600, // 1 小时
});

// ===== 市价单 =====

// FOK: 全部成交或取消
const fokOrder = await trading.createMarketOrder({
  tokenId: yesTokenId,
  side: 'BUY',
  amount: 10, // $10 USDC
  orderType: 'FOK',
});

// FAK: 部分成交也可以
const fakOrder = await trading.createMarketOrder({
  tokenId: yesTokenId,
  side: 'SELL',
  amount: 10, // 10 份额
  orderType: 'FAK',
});

// ===== 订单管理 =====
const openOrders = await trading.getOpenOrders();
await trading.cancelOrder(orderId);
await trading.cancelAllOrders();

// ===== 奖励（做市激励）=====
const isScoring = await trading.isOrderScoring(orderId);
const rewards = await trading.getCurrentRewards();
const earnings = await trading.getEarnings('2024-12-07');
```

---

### MarketService

市场数据、K线、订单簿分析。

```typescript
import { MarketService } from '@catalyst-team/poly-sdk';

// 获取统一市场
const market = await sdk.markets.getMarket('btc-100k-2024');

// 获取 K 线
const klines = await sdk.markets.getKLines(conditionId, '1h', { limit: 100 });

// 获取双 K 线（YES + NO）含价差分析
const dual = await sdk.markets.getDualKLines(conditionId, '1h');
console.log(dual.yes);              // YES 代币蜡烛图
console.log(dual.no);               // NO 代币蜡烛图
console.log(dual.spreadAnalysis);   // 历史价差（成交价）
console.log(dual.realtimeSpread);   // 实时价差（订单簿）

// 获取处理后的订单簿
const orderbook = await sdk.markets.getProcessedOrderbook(conditionId);

// 快速实时价差检查
const spread = await sdk.markets.getRealtimeSpread(conditionId);
if (spread.longArbProfit > 0.005) {
  console.log(`多头套利: 买 YES@${spread.yesAsk} + NO@${spread.noAsk}`);
}

// 检测市场信号
const signals = await sdk.markets.detectMarketSignals(conditionId);
```

#### 理解 Polymarket 订单簿

**重要**: Polymarket 订单簿有镜像特性：

```
买 YES @ P = 卖 NO @ (1-P)
```

这意味着**同一订单会出现在两个订单簿中**。简单相加会导致重复计算：

```typescript
// 错误: 重复计算镜像订单
const askSum = YES.ask + NO.ask;  // ~1.998, 而非 ~1.0

// 正确: 使用有效价格
import { getEffectivePrices, checkArbitrage } from '@catalyst-team/poly-sdk';

const effective = getEffectivePrices(yesAsk, yesBid, noAsk, noBid);
// effective.effectiveBuyYes = min(YES.ask, 1 - NO.bid)
// effective.effectiveBuyNo = min(NO.ask, 1 - YES.bid)

const arb = checkArbitrage(yesAsk, noAsk, yesBid, noBid);
if (arb) {
  console.log(`${arb.type} 套利: ${(arb.profit * 100).toFixed(2)}% 利润`);
}
```

---

### OnchainService

链上操作的统一接口：CTF + 授权 + 交换。

```typescript
import { OnchainService } from '@catalyst-team/poly-sdk';

const onchain = new OnchainService({
  privateKey: process.env.POLYMARKET_PRIVATE_KEY!,
  rpcUrl: 'https://polygon-rpc.com', // 可选
});

// 检查是否准备好进行 CTF 交易
const status = await onchain.checkReadyForCTF('100');
if (!status.ready) {
  console.log('问题:', status.issues);
  await onchain.approveAll();
}

// ===== CTF 操作 =====

// Split: USDC -> YES + NO 代币
const splitResult = await onchain.split(conditionId, '100');

// Merge: YES + NO -> USDC（用于套利）
const mergeResult = await onchain.mergeByTokenIds(conditionId, tokenIds, '100');

// Redeem: 获胜代币 -> USDC（结算后）
const redeemResult = await onchain.redeemByTokenIds(conditionId, tokenIds);

// ===== DEX 交换 (QuickSwap V3) =====

// 将 MATIC 交换为 USDC.e（CTF 需要）
await onchain.swap('MATIC', 'USDC_E', '50');

// 获取余额
const balances = await onchain.getBalances();
console.log(`USDC.e: ${balances.usdcE}`);
```

**注意**: Polymarket CTF 需要 **USDC.e** (0x2791...)，不是原生 USDC。

---

### RealtimeServiceV2

使用 `@polymarket/real-time-data-client` 的 WebSocket 实时数据。

```typescript
import { RealtimeServiceV2 } from '@catalyst-team/poly-sdk';

const realtime = new RealtimeServiceV2({
  autoReconnect: true,
  pingInterval: 5000,
});

// 连接并订阅
realtime.connect();
realtime.subscribeMarket([yesTokenId, noTokenId]);

// 事件 API
realtime.on('priceUpdate', (update) => {
  console.log(`${update.assetId}: ${update.price}`);
  console.log(`中间价: ${update.midpoint}, 价差: ${update.spread}`);
});

realtime.on('bookUpdate', (update) => {
  // 订单簿自动规范化:
  // bids: 降序（最佳在前）, asks: 升序（最佳在前）
  console.log(`最佳买价: ${update.bids[0]?.price}`);
  console.log(`最佳卖价: ${update.asks[0]?.price}`);
});

realtime.on('lastTrade', (trade) => {
  console.log(`成交: ${trade.side} ${trade.size} @ ${trade.price}`);
});

// 获取缓存价格
const price = realtime.getPrice(yesTokenId);
const book = realtime.getBook(yesTokenId);

// 清理
realtime.disconnect();
```

---

### WalletService

钱包分析和聪明钱评分。

```typescript
// 获取顶级交易者
const traders = await sdk.wallets.getTopTraders(10);

// 获取钱包画像（含聪明分数）
const profile = await sdk.wallets.getWalletProfile('0x...');
console.log(`聪明分数: ${profile.smartScore}/100`);
console.log(`胜率: ${profile.winRate}%`);
console.log(`总 PnL: $${profile.totalPnL}`);

// 检测卖出活动（用于跟单策略）
const sellResult = await sdk.wallets.detectSellActivity(
  '0x...',
  conditionId,
  Date.now() - 24 * 60 * 60 * 1000 // 24小时前
);
if (sellResult.isSelling) {
  console.log(`已卖出 ${sellResult.percentageSold}%`);
}

// 跟踪群体卖出比例
const groupSell = await sdk.wallets.trackGroupSellRatio(
  ['0x...', '0x...'],
  conditionId,
  peakValue,
  sinceTimestamp
);
```

---

### SmartMoneyService

聪明钱检测和跟单交易。

```typescript
import { SmartMoneyService } from '@catalyst-team/poly-sdk';

const smartMoney = new SmartMoneyService(config);

// 获取聪明钱钱包
const wallets = await smartMoney.getSmartMoneyWallets({
  minPnL: 10000,
  minWinRate: 0.6,
  limit: 20,
});

// 跟踪持仓
const positions = await smartMoney.getWalletPositions('0x...');

// 获取聪明钱交易信号
const signals = await smartMoney.getTradingSignals(conditionId);
for (const signal of signals) {
  console.log(`${signal.wallet}: ${signal.action} ${signal.token}`);
}

// 跟单交易（需要私钥）
await smartMoney.copyTrade(signal, {
  sizeMultiplier: 0.5, // 原始大小的 50%
  maxSize: 100,        // 每笔最多 $100
});
```

---

### ArbitrageService

实时套利检测、执行和仓位管理。

```typescript
import { ArbitrageService } from '@catalyst-team/poly-sdk';

const arbService = new ArbitrageService({
  privateKey: process.env.POLY_PRIVKEY,
  profitThreshold: 0.005,  // 最小 0.5% 利润
  minTradeSize: 5,         // 最小 $5
  maxTradeSize: 100,       // 最大 $100
  autoExecute: true,       // 自动执行机会

  // 再平衡器: 自动维持 USDC/代币比例
  enableRebalancer: true,
  minUsdcRatio: 0.2,       // 最小 20% USDC
  maxUsdcRatio: 0.8,       // 最大 80% USDC
  targetUsdcRatio: 0.5,    // 再平衡目标

  // 执行安全
  sizeSafetyFactor: 0.8,   // 使用 80% 订单簿深度
  autoFixImbalance: true,  // 自动修复部分成交
});

// 监听事件
arbService.on('opportunity', (opp) => {
  console.log(`${opp.type.toUpperCase()} 套利: ${opp.profitPercent.toFixed(2)}%`);
});

arbService.on('execution', (result) => {
  if (result.success) {
    console.log(`已执行: $${result.profit.toFixed(2)} 利润`);
  }
});

// ===== 工作流程 =====

// 1. 扫描市场寻找机会
const results = await arbService.scanMarkets({ minVolume24h: 5000 }, 0.005);

// 2. 开始监控最佳市场
const best = await arbService.findAndStart(0.005);
console.log(`已启动: ${best.market.name} (+${best.profitPercent.toFixed(2)}%)`);

// 3. 运行一段时间...
await new Promise(r => setTimeout(r, 60 * 60 * 1000)); // 1 小时

// 4. 停止并清仓
await arbService.stop();
const clearResult = await arbService.clearPositions(best.market, true);
console.log(`已回收: $${clearResult.totalUsdcRecovered.toFixed(2)}`);
```

---

## 底层客户端

高级用户可直接访问 API：

```typescript
import {
  DataApiClient,    // 持仓、交易、排行榜
  GammaApiClient,   // 市场、事件、搜索
  SubgraphClient,   // 通过 Goldsky 访问链上数据
  CTFClient,        // CTF 合约操作
  BridgeClient,     // 跨链充值
  SwapService,      // Polygon DEX 交换
} from '@catalyst-team/poly-sdk';

// Data API
const positions = await sdk.dataApi.getPositions('0x...');
const trades = await sdk.dataApi.getTrades('0x...');
const leaderboard = await sdk.dataApi.getLeaderboard();

// Gamma API
const markets = await sdk.gammaApi.searchMarkets({ query: 'bitcoin' });
const trending = await sdk.gammaApi.getTrendingMarkets(10);
const events = await sdk.gammaApi.getEvents({ limit: 20 });

// Subgraph（链上数据）
const userPositions = await sdk.subgraph.getUserPositions(address);
const isResolved = await sdk.subgraph.isConditionResolved(conditionId);
const globalOI = await sdk.subgraph.getGlobalOpenInterest();
```

---

## 破坏性变更 (v0.3.0)

### `UnifiedMarket.tokens` 现在是数组

**之前 (v0.2.x)**:
```typescript
// 带 yes/no 属性的对象
const yesPrice = market.tokens.yes.price;
const noPrice = market.tokens.no.price;
```

**之后 (v0.3.0)**:
```typescript
// MarketToken 对象数组
const yesToken = market.tokens.find(t => t.outcome === 'Yes');
const noToken = market.tokens.find(t => t.outcome === 'No');

const yesPrice = yesToken?.price;
const noPrice = noToken?.price;
```

### 迁移指南

```typescript
// 迁移辅助函数
function getTokenPrice(market: UnifiedMarket, outcome: 'Yes' | 'No'): number {
  return market.tokens.find(t => t.outcome === outcome)?.price ?? 0;
}

// 使用
const yesPrice = getTokenPrice(market, 'Yes');
const noPrice = getTokenPrice(market, 'No');
```

**为什么改变？** 数组格式更好地支持多结果市场，并且与 Polymarket API 响应格式更一致。

---

## 示例

运行示例：

```bash
pnpm example:basic        # 基础用法
pnpm example:smart-money  # 聪明钱分析
pnpm example:trading      # 交易订单
pnpm example:realtime     # WebSocket 推送
pnpm example:arb-service  # 套利服务
```

| 示例 | 描述 |
|------|------|
| [01-basic-usage.ts](examples/01-basic-usage.ts) | 获取市场、订单簿、检测套利 |
| [02-smart-money.ts](examples/02-smart-money.ts) | 顶级交易者、钱包画像、聪明分数 |
| [03-market-analysis.ts](examples/03-market-analysis.ts) | 市场信号、成交量分析 |
| [04-kline-aggregation.ts](examples/04-kline-aggregation.ts) | 从成交构建 OHLCV 蜡烛图 |
| [05-follow-wallet-strategy.ts](examples/05-follow-wallet-strategy.ts) | 跟踪聪明钱、检测退出 |
| [06-services-demo.ts](examples/06-services-demo.ts) | 所有 SDK 服务实战 |
| [07-realtime-websocket.ts](examples/07-realtime-websocket.ts) | 实时价格推送、订单簿更新 |
| [08-trading-orders.ts](examples/08-trading-orders.ts) | GTC、GTD、FOK、FAK 订单类型 |
| [09-rewards-tracking.ts](examples/09-rewards-tracking.ts) | 做市激励、收益 |
| [10-ctf-operations.ts](examples/10-ctf-operations.ts) | Split、merge、redeem 代币 |
| [11-live-arbitrage-scan.ts](examples/11-live-arbitrage-scan.ts) | 扫描市场寻找机会 |
| [12-trending-arb-monitor.ts](examples/12-trending-arb-monitor.ts) | 实时热门监控 |
| [13-arbitrage-service.ts](examples/13-arbitrage-service.ts) | 完整套利工作流程 |

---

## API 参考

详细 API 文档见：

- [docs/00-design.md](docs/00-design.md) - 架构设计
- [docs/02-API.md](docs/02-API.md) - 完整 API 参考
- [docs/01-polymarket-orderbook-arbitrage.md](docs/01-polymarket-orderbook-arbitrage.md) - 订单簿镜像与套利

### 类型导出

```typescript
import type {
  // 核心类型
  UnifiedMarket,
  MarketToken,
  ProcessedOrderbook,
  ArbitrageOpportunity,
  EffectivePrices,

  // 交易
  Side,
  OrderType,
  Order,
  OrderResult,
  LimitOrderParams,
  MarketOrderParams,

  // K 线
  KLineInterval,
  KLineCandle,
  DualKLineData,
  SpreadDataPoint,

  // WebSocket
  PriceUpdate,
  BookUpdate,
  OrderbookSnapshot,

  // 钱包
  WalletProfile,
  SellActivityResult,

  // CTF
  SplitResult,
  MergeResult,
  RedeemResult,

  // 套利
  ArbitrageMarketConfig,
  ArbitrageServiceConfig,
  ScanResult,
  ClearPositionResult,
} from '@catalyst-team/poly-sdk';
```

---

## 依赖

- `@polymarket/clob-client` - 官方 CLOB 交易客户端
- `@polymarket/real-time-data-client` - 官方 WebSocket 客户端
- `ethers@5` - 区块链交互
- `bottleneck` - 速率限制

---

## 许可证

MIT
