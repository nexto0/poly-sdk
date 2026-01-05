/**
 * Redeem ALL redeemable positions
 * Queries the API for all positions and redeems any that are resolved
 */

import 'dotenv/config';
import { PolymarketSDK, OnchainService, DataApiClient } from '../src/index.js';

async function main() {
  console.log('='.repeat(60));
  console.log('Redeeming ALL Redeemable Positions');
  console.log('='.repeat(60));

  const privateKey = process.env.PRIVATE_KEY || process.env.POLY_PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ PRIVATE_KEY not found');
    process.exit(1);
  }

  const sdk = await PolymarketSDK.create({ privateKey });
  const onchain = new OnchainService({ privateKey });
  const dataApi = new DataApiClient();

  const address = onchain.getAddress();
  console.log(`Wallet: ${address}`);

  // Check initial balance
  const initialBalance = await onchain.getUsdcBalance();
  console.log(`\nInitial USDC.e: $${parseFloat(initialBalance).toFixed(4)}`);

  // Get all positions
  console.log('\n[1] Fetching all positions...\n');

  try {
    const positions = await dataApi.getPositions(address, { redeemable: true });
    console.log(`Found ${positions.length} redeemable positions\n`);

    if (positions.length === 0) {
      // Also check all positions
      const allPositions = await dataApi.getPositions(address);
      console.log(`Total positions: ${allPositions.length}`);

      if (allPositions.length > 0) {
        console.log('\nAll positions:');
        for (const pos of allPositions) {
          console.log(`- ${pos.proxyTitle || pos.title || 'Unknown'}`);
          console.log(`  Condition: ${pos.conditionId}`);
          console.log(`  Size: ${pos.size}, Avg Price: ${pos.avgPrice}`);
          console.log(`  PnL: ${pos.pnl}, Status: ${pos.outcome || 'pending'}`);
          console.log();
        }
      }
    } else {
      console.log('[2] Redeeming positions...\n');

      for (const pos of positions) {
        console.log(`--- ${pos.proxyTitle || pos.title || 'Unknown'} ---`);
        console.log(`  Condition: ${pos.conditionId}`);

        try {
          // Get market info to find token IDs
          const market = await sdk.markets.getMarket(pos.conditionId);
          if (!market) {
            console.log('  Market not found');
            continue;
          }

          const yesToken = market.tokens?.find(t => t.outcome === 'Yes' || t.outcome === 'Up');
          const noToken = market.tokens?.find(t => t.outcome === 'No' || t.outcome === 'Down');

          if (!yesToken?.tokenId || !noToken?.tokenId) {
            console.log('  Token IDs not found');
            continue;
          }

          // Check our balance
          const balance = await onchain.getPositionBalanceByTokenIds(
            pos.conditionId,
            { yesTokenId: yesToken.tokenId, noTokenId: noToken.tokenId }
          );

          const yesBalance = parseFloat(balance.yesBalance);
          const noBalance = parseFloat(balance.noBalance);

          console.log(`  Balance: YES=${yesBalance.toFixed(4)}, NO=${noBalance.toFixed(4)}`);

          if (yesBalance > 0 || noBalance > 0) {
            console.log(`  Redeeming...`);
            try {
              const result = await onchain.redeemByTokenIds(
                pos.conditionId,
                { yesTokenId: yesToken.tokenId, noTokenId: noToken.tokenId }
              );
              console.log(`  ✅ TX: ${result.transactionHash}`);
            } catch (e: any) {
              console.log(`  ❌ Failed: ${e.message}`);
            }
          } else {
            console.log(`  No tokens to redeem`);
          }
        } catch (e: any) {
          console.log(`  Error: ${e.message}`);
        }
        console.log();
      }
    }
  } catch (e: any) {
    console.error('Error fetching positions:', e.message);
  }

  // Check final balance
  console.log('[3] Final balance...');
  const finalBalance = await onchain.getUsdcBalance();
  console.log(`USDC.e: $${parseFloat(finalBalance).toFixed(4)}`);

  const gained = parseFloat(finalBalance) - parseFloat(initialBalance);
  if (gained > 0) {
    console.log(`\n🎉 Gained: $${gained.toFixed(4)}`);
  }

  sdk.stop();
  console.log('\nDone!');
}

main().catch(console.error);
