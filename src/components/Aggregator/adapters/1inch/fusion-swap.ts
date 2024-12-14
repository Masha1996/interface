import { AUTH_HEADER, AVAILABLE_CHAINS_FOR_FUSION, CHAIN_TO_ID, SPENDERS } from './constants';
import { ethers } from 'ethers';
import { omit } from '~/components/Aggregator/adapters/1inch/utils';
import { FusionSDK } from '@1inch/fusion-sdk';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import { chainsMap } from '~/components/Aggregator/constants';

// const FUSION_QUOTE_ENDPOINT = 'https://api-defillama.1inch.io/v2.0/fusion/quoter/v2.0';
const FUSION_SDK_ENDPOINT = 'http://localhost:8888/fusion';
const FUSION_QUOTE_ENDPOINT = 'http://localhost:8888/fusion/quoter/v2.0';
const FUSION_RELAYER_ENDPOINT = 'http://localhost:8888/fusion/relayer/v2.0';

export function isFusionSupported(chainId: number): boolean {
	return AVAILABLE_CHAINS_FOR_FUSION.has(chainId);
}

export async function getFusionQuoteResponse(params: {
	chain: string,
	tokenFrom: string,
	tokenTo: string,
	amount: string,
	extra: any,
	enableEstimate: boolean,
}) {
	const { chain, tokenFrom, tokenTo, amount, enableEstimate, extra } = params;

	return fetch(
		`${FUSION_QUOTE_ENDPOINT}/${CHAIN_TO_ID[chain]}/quote/receive
			?fromTokenAddress=${tokenFrom}
			&toTokenAddress=${tokenTo}
			&amount=${amount}
			&slippage=${extra.slippage}
			&walletAddress=${extra.userAddress}
			&enableEstimate=${enableEstimate}`,
		{
			headers: {
				...AUTH_HEADER,
				'Content-Type': 'application/json',
			},
		}
	);
}

export function parseFusionQuote(chain: string, quote, dstTokenDecimals) {
	const { presets, recommended_preset, toTokenAmount } = quote;
	const { auctionStartAmount, auctionEndAmount } = presets[recommended_preset];

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

export async function fusionSwap(chain, quote, signer, tokens, signTypedDataAsync) {
	const order = await buildFusionSwapQuote(quote, signer, chain, tokens);

	const b = await submitFusionSwapOrder(chain, order, quote.quoteId, signTypedDataAsync);
	console.log('@@@@ b', b);
	return b;
}

async function buildFusionSwapQuote(quote, signer, chain, tokens) {
	const receiverAddress = await signer.getAddress();

	return fetch(
		`${FUSION_QUOTE_ENDPOINT}/${CHAIN_TO_ID[chain]}/quote/build
			?preset=${quote.recommended_preset}
			&walletAddress=${receiverAddress}
			&fromTokenAddress=${tokens.fromToken.address}
			&toTokenAddress=${tokens.toToken.address}
			&amount=${quote.fromTokenAmount}`,
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

async function submitFusionSwapOrder(chain, order, quoteId, signTypedDataAsync) {
	const signature = await signTypedDataAsync({
		domain: order.typedData.domain,
		types: order.typedData.types,
		primaryType: order.typedData.primaryType,
		value: order.typedData.message
	}).then((hash) => ethers.utils.splitSignature(hash));

	const body = {
		order: order.typedData.message,
		signature,
		quoteId,
		extension: order.extension,
	};

	return fetch(
		`${FUSION_RELAYER_ENDPOINT}/${CHAIN_TO_ID[chain]}/order/submit`,
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
