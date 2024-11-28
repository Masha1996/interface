import { AUTH_HEADER, AVAILABLE_CHAINS_FOR_FUSION, CHAIN_TO_ID, SPENDERS } from './constants';
import { altReferralAddress, chainsMap } from '~/components/Aggregator/constants';
import { domain, SigningScheme, signOrder } from '@gnosis.pm/gp-v2-contracts';
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

export async function getFusionQuoteResponse(chain: string, tokenFrom: string, tokenTo: string, amount: string, extra, enableEstimate: boolean) {
	const sdk = new FusionSDK({
		url: FUSION_SDK_ENDPOINT,
		network: CHAIN_TO_ID[chain],
	});

	const params = {
		walletAddress: extra.userAddress,
		fromTokenAddress: tokenFrom,
		toTokenAddress: tokenTo,
		amount,
		enableEstimate,
		slippage: extra.slippage, // ???
		referrer: altReferralAddress, // ???
	};

	return await sdk.getQuote(params);
}

export function parseFusionQuote(chain: string, quote, extra) {
	const { presets, recommendedPreset, toTokenAmount, quoteId } = quote;
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
		extra: {
			preset: presets[recommendedPreset],
			quoteId,
		},
		logo: 'https://icons.llamao.fi/icons/protocols/1inch-network?w=48&q=75'
	};
}

export async function fusionSwap(quote, signer, chain, tokens, fromAmount) {
	const receiverAddress = await signer.getAddress();

	const sdk = new FusionSDK({
		url: FUSION_SDK_ENDPOINT,
		network: CHAIN_TO_ID[chain],
	});

	const params = {
		fromTokenAddress: tokens.fromToken,
		toTokenAddress: tokens.toToken,
		amount: fromAmount,
		walletAddress: receiverAddress,
	}

	const preparedOrder = await sdk.createOrder(params);
	const info = await sdk.submitOrder(preparedOrder.order, preparedOrder.quoteId);
debugger;

	const { typedData, orderHash, extension } = await buildFusionSwapQuote(quote, signer, chain, tokens, fromAmount);


	console.log('@@@', typedData, orderHash, extension);

	const order = {
		...typedData.message,
		extension,
	}

	// ???
	const rawSignature = await signOrder(
		domain(chainsMap[chain], '0x9008D19f58AAbD9eD0D60971565AA8510560ab41'),
		order,
		signer,
		SigningScheme.EIP712
	);

	// ???
	const signature = ethers.utils.joinSignature(rawSignature.data);

	const a = {
		signature,
		data: order,
		chainId: chainsMap[chain],
		orderHash,
	}


	const b = submitFusionSwapOrder(chain, order, signature, quote.quoteId);

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

async function submitFusionSwapOrder(chain, order, signature, quoteId) {
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
