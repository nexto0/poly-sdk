#!/usr/bin/env npx tsx
/**
 * DipArb Auto Trading - ETH 15m Markets
 *
 * 策略原理：
 * 1. 检测 10 秒内 5% 以上的瞬时暴跌
 * 2. 买入暴跌侧 (Leg1)
 * 3. 等待对侧价格下降，满足 sumTarget 后买入 (Leg2)
 * 4. 双持仓锁定利润：UP + DOWN = $1
 *
 * Run with:
 *   npx tsx scripts/dip-arb/auto-trade.ts
 */

import * as fs from 'fs';
import { PolymarketSDK } from '../../src/index.js';

// Config
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const MONITOR_DURATION_MS = 60 * 60 * 1000; // 1 hour

if (!PRIVATE_KEY) {
  console.error('Error: PRIVATE_KEY environment variable is required');
  process.exit(1);
}

// Logging - all logs go here (including SDK logs)
const logs: string[] = [];
function log(msg: string) {
  const timestamp = new Date().toISOString().slice(11, 19);
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  logs.push(line);
}

// SDK log handler - captures all [DipArb] logs
function sdkLogHandler(message: string) {
  const timestamp = new Date().toISOString().slice(11, 19);
  const line = `[${timestamp}] ${message}`;
  console.log(line);
  logs.push(line);
}

async function main() {
  // ========================================
  // Configuration
  // ========================================
  const config = {
    // 交易参数
    shares: 10,              // 每次交易份数
    sumTarget: 0.94,         // Leg2 条件: totalCost <= 0.95 (保证 5%+ 利润)

    // 信号检测参数
    slidingWindowMs: 10000,  // 10 秒滑动窗口
    dipThreshold: 0.15,      // 5% 跌幅触发 Leg1
    windowMinutes: 14,       // 轮次开始后 14 分钟内可交易

    // 执行参数
    maxSlippage: 0.02,       // 2% 滑点
    autoExecute: true,       // 自动执行
    executionCooldown: 3000, // 3 秒冷却

    // 其他
    enableSurge: false,      // 禁用暴涨检测
    autoMerge: true,         // 自动 merge
    leg2TimeoutSeconds: 300, // Leg2 超时 5 分钟

    debug: true,             // 调试日志

    // 日志处理器 - 将 SDK 日志也写入 logs 数组
    logHandler: sdkLogHandler,
  };

  // 计算预期利润率
  const expectedProfit = ((1 - config.sumTarget) / config.sumTarget * 100).toFixed(1);

  log('');
  log('╔══════════════════════════════════════════════════════════╗');
  log('║           DipArb Auto Trading - ETH Markets              ║');
  log('╠══════════════════════════════════════════════════════════╣');
  log(`║  Dip Threshold:   ${(config.dipThreshold * 100).toFixed(0)}% in ${config.slidingWindowMs / 1000}s window                    ║`);
  log(`║  Sum Target:      ${config.sumTarget} (profit >= ${expectedProfit}%)                   ║`);
  log(`║  Auto Execute:    ${config.autoExecute ? 'YES' : 'NO'}                                        ║`);
  log('╚══════════════════════════════════════════════════════════╝');
  log('');

  // Initialize SDK
  log('Initializing SDK...');
  const sdk = new PolymarketSDK({
    privateKey: PRIVATE_KEY,
  });

  sdk.dipArb.updateConfig(config);

  // ========================================
  // Event Listeners
  // ========================================

  sdk.dipArb.on('started', (market) => {
    log('');
    log('┌──────────────────────────────────────────────────────────┐');
    log('│                    MARKET STARTED                        │');
    log('├──────────────────────────────────────────────────────────┤');
    log(`│ ${market.name.slice(0, 56)}`);
    log(`│ ${market.underlying} ${market.durationMinutes}m`);
    log(`│ End Time: ${market.endTime.toISOString()}`);
    log(`│ Condition: ${market.conditionId.slice(0, 30)}...`);
    log('└──────────────────────────────────────────────────────────┘');
  });

  sdk.dipArb.on('stopped', () => {
    log('>>> SERVICE STOPPED');
  });

  sdk.dipArb.on('newRound', (event) => {
    const sum = event.upOpen + event.downOpen;
    log(`>>> NEW ROUND | UP: ${event.upOpen.toFixed(3)} | DOWN: ${event.downOpen.toFixed(3)} | Sum: ${sum.toFixed(3)}`);
  });

  sdk.dipArb.on('signal', (signal) => {
    log('');
    log('╔══════════════════════════════════════════════════════════╗');
    if (signal.type === 'leg1') {
      log(`║  LEG1 SIGNAL: Buy ${signal.dipSide} @ ${signal.currentPrice.toFixed(4)}`);
      log(`║  Drop: ${(signal.dropPercent * 100).toFixed(1)}% | Opposite: ${signal.oppositeAsk.toFixed(4)}`);
    } else {
      log(`║  LEG2 SIGNAL: Buy ${signal.hedgeSide} @ ${signal.currentPrice.toFixed(4)}`);
      log(`║  Total Cost: ${signal.totalCost.toFixed(4)} | Profit: ${(signal.expectedProfitRate * 100).toFixed(2)}%`);
    }
    log('╚══════════════════════════════════════════════════════════╝');
  });

  sdk.dipArb.on('execution', (result) => {
    if (result.success) {
      log(`✅ ${result.leg.toUpperCase()} FILLED: ${result.side} @ ${result.price?.toFixed(4)} x${result.shares}`);
    } else {
      log(`❌ ${result.leg.toUpperCase()} FAILED: ${result.error}`);
    }
  });

  sdk.dipArb.on('roundComplete', (result) => {
    log('');
    log('┌──────────────────────────────────────────────────────────┐');
    log(`│  ROUND ${result.status.toUpperCase()}`);
    if (result.profit !== undefined) {
      log(`│  Profit: $${result.profit.toFixed(4)} (${(result.profitRate! * 100).toFixed(2)}%)`);
    }
    log('└──────────────────────────────────────────────────────────┘');
  });

  sdk.dipArb.on('rotate', (event) => {
    log('');
    log('╔══════════════════════════════════════════════════════════╗');
    log(`║  🔄 MARKET ROTATION                                      ║`);
    log(`║  Reason: ${event.reason}`);
    log(`║  Previous: ${event.previousMarket?.slice(0, 40) || 'none'}...`);
    log(`║  New: ${event.newMarket.slice(0, 40)}...`);
    log('╚══════════════════════════════════════════════════════════╝');
  });

  sdk.dipArb.on('settled', (result) => {
    log(`>>> SETTLED: ${result.strategy} | Success: ${result.success}`);
    if (result.amountReceived) {
      log(`    Amount: $${result.amountReceived.toFixed(2)}`);
    }
    if (result.error) {
      log(`    Error: ${result.error}`);
    }
  });

  sdk.dipArb.on('error', (error) => {
    log(`[ERROR] ${error.message}`);
  });

  // ========================================
  // Scan and Start
  // ========================================

  log('Scanning for ETH 15m markets...');
  const markets = await sdk.dipArb.scanUpcomingMarkets({
    coin: 'ETH',
    duration: '15m',
    limit: 5,
  });

  log(`Found ${markets.length} markets:`);
  for (const m of markets) {
    const endIn = Math.round((m.endTime.getTime() - Date.now()) / 60000);
    const status = endIn <= 0 ? '(ENDED)' : `(ends in ${endIn}m)`;
    log(`  - ${m.name.slice(0, 50)} ${status}`);
    log(`    Condition: ${m.conditionId.slice(0, 30)}...`);
    log(`    End: ${m.endTime.toISOString()}`);
  }

  if (markets.length === 0) {
    log('No markets found. Exiting.');
    return;
  }

  // Filter out already ended markets
  const activeMarkets = markets.filter(m => m.endTime.getTime() > Date.now());
  if (activeMarkets.length === 0) {
    log('All markets have ended. Waiting for new markets...');
  } else {
    log(`Active markets: ${activeMarkets.length}`);
  }

  // Start
  const market = await sdk.dipArb.findAndStart({
    coin: 'ETH',
    preferDuration: '15m',
  });

  if (!market) {
    log('Failed to start. Exiting.');
    return;
  }

  log(`Selected market ends at: ${market.endTime.toISOString()}`);
  const timeUntilEnd = Math.round((market.endTime.getTime() - Date.now()) / 1000);
  log(`Time until market end: ${timeUntilEnd}s (${Math.round(timeUntilEnd / 60)}m)`);

  // Enable auto-rotate with redeem strategy
  sdk.dipArb.enableAutoRotate({
    enabled: true,
    underlyings: ['ETH'],
    duration: '15m',
    settleStrategy: 'redeem',  // 等待市场结算后赎回 (5分钟后)
    autoSettle: true,
    preloadMinutes: 2,
    redeemWaitMinutes: 5,       // 市场结束后等待 5 分钟再赎回
    redeemRetryIntervalSeconds: 30,  // 每 30 秒检查一次
  });
  log('Auto-rotate enabled (with background redemption)');

  log('');
  log('═══════════════════════════════════════════════════════════');
  log('  AUTO TRADING ACTIVE - Press Ctrl+C to stop');
  log('═══════════════════════════════════════════════════════════');
  log('');

  // Status update every 30 seconds (more frequent to catch rotation)
  let statusCount = 0;
  const statusInterval = setInterval(() => {
    const stats = sdk.dipArb.getStats();
    const round = sdk.dipArb.getCurrentRound();
    const currentMarket = sdk.dipArb.getMarket();
    statusCount++;

    // Check if market has ended
    if (currentMarket) {
      const timeLeft = Math.round((currentMarket.endTime.getTime() - Date.now()) / 1000);
      const timeLeftStr = timeLeft > 0 ? `${timeLeft}s left` : `ENDED ${-timeLeft}s ago`;
      log(`[Status #${statusCount}] Market: ${currentMarket.underlying} | ${timeLeftStr} | Signals: ${stats.signalsDetected} | L1: ${stats.leg1Filled} | L2: ${stats.leg2Filled}`);
    } else {
      log(`[Status #${statusCount}] No market active | Signals: ${stats.signalsDetected}`);
    }

    // Show current position
    if (round) {
      if (round.phase === 'leg1_filled' && round.leg1) {
        log(`  📊 Position: ${round.leg1.shares}x ${round.leg1.side} @ ${round.leg1.price.toFixed(4)} | Waiting for Leg2...`);
      } else if (round.phase === 'completed' && round.leg1 && round.leg2) {
        const totalCost = round.leg1.price + round.leg2.price;
        const profit = (1 - totalCost) * round.leg1.shares;
        log(`  📊 Position: ${round.leg1.shares}x UP + ${round.leg2.shares}x DOWN | Cost: ${totalCost.toFixed(4)} | Profit: $${profit.toFixed(2)}`);
      } else if (round.phase === 'waiting') {
        log(`  📊 Position: None (waiting for signal)`);
      }
    }
  }, 30000);

  // Wait
  await new Promise(resolve => setTimeout(resolve, MONITOR_DURATION_MS));

  // Cleanup
  clearInterval(statusInterval);

  // Final stats
  const stats = sdk.dipArb.getStats();
  log('');
  log('╔══════════════════════════════════════════════════════════╗');
  log('║                     FINAL STATS                          ║');
  log('╠══════════════════════════════════════════════════════════╣');
  log(`║ Running Time:     ${Math.round(stats.runningTimeMs / 1000)}s`);
  log(`║ Rounds Monitored: ${stats.roundsMonitored}`);
  log(`║ Signals Detected: ${stats.signalsDetected}`);
  log(`║ Leg1 Filled:      ${stats.leg1Filled}`);
  log(`║ Leg2 Filled:      ${stats.leg2Filled}`);
  log(`║ Total Profit:     $${stats.totalProfit.toFixed(2)}`);
  log('╚══════════════════════════════════════════════════════════╝');

  await sdk.dipArb.stop();
  sdk.stop();

  // Save logs
  saveLogs('final');
}

function saveLogs(suffix: string) {
  const logPath = `/tmp/dip-arb-${suffix}-${Date.now()}.log`;
  fs.writeFileSync(logPath, logs.join('\n'));
  console.log(`Logs saved to: ${logPath}`);
}

// Handle Ctrl+C
process.on('SIGINT', async () => {
  log('');
  log('Interrupted. Saving logs...');
  saveLogs('interrupted');
  process.exit(0);
});

main().catch((err) => {
  log(`Fatal error: ${err.message}`);
  console.error(err);
  saveLogs('error');
  process.exit(1);
});
