import { AUTH_HEADER, AVAILABLE_CHAINS_FOR_FUSION, CHAIN_TO_ID, SPENDERS } from './constants';
import { ethers } from 'ethers';
import { omit } from '~/components/Aggregator/adapters/1inch/utils';
import { FusionSDK } from '@1inch/fusion-sdk';
import { formatUnits, parseUnits } from 'ethers/lib/utils';

// const FUSION_QUOTE_ENDPOINT = 'https://api-defillama.1inch.io/v2.0/fusion/quoter/v2.0';
const FUSION_SDK_ENDPOINT = 'http://localhost:8888/fusion';
const FUSION_QUOTE_ENDPOINT = 'http://localhost:8888/fusion/quoter/v2.0';

export function isFusionSupported(chainId: number): boolean {
	return AVAILABLE_CHAINS_FOR_FUSION.has(chainId);
}

export async function getFusionQuoteResponse(params: {
	chain: string,
	tokenFrom: string,
	tokenTo: string,
	amount: string,
}) {
	const { chain, tokenFrom, tokenTo, amount } = params;
	const sdk = new FusionSDK({
		url: FUSION_SDK_ENDPOINT,
		network: CHAIN_TO_ID[chain]
	});

	return await sdk.getQuote({
		fromTokenAddress: tokenFrom,
		toTokenAddress: tokenTo,
		amount,
		// slippage, // TODO: ???
		// referrer: altReferralAddress // TODO: ???
	});
}

export function parseFusionQuote(chain: string, quote, extra) {
	const { presets, recommendedPreset, toTokenAmount } = quote;
	const { auctionStartAmount, auctionEndAmount } = presets[recommendedPreset];
	const dstTokenDecimals = extra.toToken.decimals;

	const start = formatUnits(auctionStartAmount, dstTokenDecimals);
	const end = formatUnits(auctionEndAmount, dstTokenDecimals);
	const amount = formatUnits(toTokenAmount, dstTokenDecimals);

	const receivedAmount = amount < start ? amount : start;
	const amountReturned = end > receivedAmount ? end : receivedAmount;

	return {
		amountReturned: parseUnits(amountReturned, dstTokenDecimals),
		estimatedGas: 0,
		tokenApprovalAddress: SPENDERS[chain],
		rawQuote: null,
		logo: 'https://icons.llamao.fi/icons/protocols/1inch-network?w=48&q=75'
	};
}

export async function fusionSwap(chain, quote, signer, signTypedDataAsync) {
	const sdk = new FusionSDK({
		url: FUSION_SDK_ENDPOINT,
		network: CHAIN_TO_ID[chain],
		blockchainProvider: {
			signTypedData: signTypedDataAsync,
			ethCall: signer.call.bind(signer),
		},
	});

	return await sdk.placeOrder(quote)
}

async function buildFusionSwapQuote(quote, signer, chain, tokens, fromAmount) {
	const receiverAddress = await signer.getAddress();
	const sourceToken = tokens.fromToken;
	const destinationToken = tokens.toToken;

	return fetch(
		`${FUSION_QUOTE_ENDPOINT}/${CHAIN_TO_ID[chain]}/quote/build
			?preset=${quote.recommended_preset}
			&walletAddress=${receiverAddress}
			&fromTokenAddress=${sourceToken.address}
			&toTokenAddress=${destinationToken.address}
			&amount=${fromAmount}`,
		{
			headers: {
				...AUTH_HEADER,
				'Content-Type': 'application/json',
			},
			method: 'POST',
			body: JSON.stringify(quote)
		}
	).then((r) => r.json());
}

async function submitFusionSwapOrder(chain, order, quoteId) {
	const signature = ethers.utils.joinSignature(order);

	const body = {
		order: omit(['extension'], order),
		signature,
		quoteId,
		extension: order.extension,
	};

	return fetch(
		`${FUSION_QUOTE_ENDPOINT}/${CHAIN_TO_ID[chain]}/order/submit`,
		{
			headers: {
				...AUTH_HEADER,
				'Content-Type': 'application/json',
			},
			method: 'POST',
			body: JSON.stringify(body)
		}
	).then((r) => r.json());
}
