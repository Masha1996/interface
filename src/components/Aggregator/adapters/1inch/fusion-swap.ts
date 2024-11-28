import { AUTH_HEADER, AVAILABLE_CHAINS_FOR_FUSION, CHAIN_TO_ID, SPENDERS } from './constants';

// const FUSION_QUOTE_ENDPOINT = 'https://api-defillama.1inch.io/v2.0/fusion/quoter/v2.0';
const FUSION_QUOTE_ENDPOINT = 'http://localhost:8888/fusion/quoter/v2.0';

export function isFusionSupported(chainId: number): boolean {
	return AVAILABLE_CHAINS_FOR_FUSION.has(chainId);
}

export async function getFusionQuoteResponse(chain: string, tokenFrom: string, tokenTo: string, amount: string, extra) {
	return await fetch(
		`${FUSION_QUOTE_ENDPOINT}/${CHAIN_TO_ID[chain]}/quote/receive
			?walletAddress=${extra.userAddress}
			&fromTokenAddress=${tokenFrom}
			&toTokenAddress=${tokenTo}
			&amount=${amount}
			&isLedgerLive=false
			&enableEstimate=false`,
		// &slippage=${extra.slippage}
		// &referrer=${altReferralAddress}`,
		{ headers: AUTH_HEADER }
	);
}

export async function parseFusionQuote(chain: string, quote) {
	const {gas, presets, recommended_preset, marketAmount} = quote;
	const tokenApprovalAddress = SPENDERS[chain];

	return {
		amountReturned: marketAmount,
		estimatedGas: 0,
		tokenApprovalAddress,
		rawQuote: null,
		logo: 'https://icons.llamao.fi/icons/protocols/1inch-network?w=48&q=75'
	};
}