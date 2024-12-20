// Source https://portal.1inch.dev/documentation/apis/swap/classic-swap/introduction

import { CHAIN_TO_ID, NATIVE_TOKEN, SPENDERS } from './constants';
import { classicSwap, getClassicQuote, parseClassicQuote } from './classic-swap';
import {
	fusionSwap,
	getFusionQuoteResponse,
	getOrderStatus,
	isFusionSupported,
	parseFusionQuote
} from './fusion-swap';
import { ethers } from 'ethers';

export const name = '1inch';
export const token = '1INCH';
export const referral = true;
export const chainToId = CHAIN_TO_ID;

export function approvalAddress(chain: string) {
	// https://api.1inch.io/v6.0/1/approve/spender
	return SPENDERS[chain];
}

export async function getQuote(chain: string, from: string, to: string, amount: string, extra) {
	const quote = await getFusionOrClassicQuote(chain, from, to, amount, extra);

	return typeof quote === "object" && "recommendedPreset" in quote
		? parseFusionQuote(chain, quote, extra)
		: await parseClassicQuote(chain, quote);
}

export async function swap(params) {
	const { signer, chain, rawQuote, signTypedDataAsync } = params;

	const data = typeof rawQuote === "object" && "recommendedPreset" in rawQuote
		? await fusionSwap(chain, rawQuote, signer, signTypedDataAsync)
		: await classicSwap(rawQuote, signer, chain);

	return typeof rawQuote === "object" && "recommendedPreset" in rawQuote
		? {
			...data,
			hash: data.orderHash,
			checkFusionOrderStatus: getOrderStatus(chain, data.orderHash)
		}
		: data;
}

async function getFusionOrClassicQuote (chain: string, from: string, to: string, amount: string, extra) {
	// ethereum = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
	// amount should include decimals
	const tokenFrom = from === ethers.constants.AddressZero ? NATIVE_TOKEN : from;
	const tokenTo = to === ethers.constants.AddressZero ? NATIVE_TOKEN : to;
	const address = extra.userAddress;

	if (isFusionSupported(CHAIN_TO_ID[chain])) {
		try {
			const quote = await getFusionQuoteResponse({ chain, tokenFrom, tokenTo, amount, address });
			if (quote.silippage > +extra.slippage) {
				throw new Error('slippage does not match slippage');
			}
			return quote;
		} catch {
			return await getClassicQuote(chain, tokenFrom, tokenTo, amount, extra);
		}
	} else {
		return await getClassicQuote(chain, tokenFrom, tokenTo, amount, extra);
	}
}

export const getTxData = ({ rawQuote }) => rawQuote?.tx?.data;

export const getTx = ({ rawQuote }) => {
	if (rawQuote === null) {
		return {};
	}

	if ("recommendedPreset" in rawQuote) {
		return {
			from: rawQuote.params.fromTokenAddress,
			to: rawQuote.params.toTokenAddress,
			// data: rawQuote.tx.data, // ???
			// value: rawQuote.tx.value // ???
		};
	}

	return {
		from: rawQuote.tx.from,
		to: rawQuote.tx.to,
		data: rawQuote.tx.data,
		value: rawQuote.tx.value
	};
};