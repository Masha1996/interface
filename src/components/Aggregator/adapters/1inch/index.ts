// Source https://portal.1inch.dev/documentation/apis/swap/classic-swap/introduction

import { CHAIN_TO_ID, NATIVE_TOKEN, SPENDERS } from './constants';
import { classicSwap, getClassicQuote, parseClassicQuote } from './classic-swap';
import { fusionSwap, getFusionQuoteResponse, isFusionSupported, parseFusionQuote } from './fusion-swap';
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
	const quote = await getFusionOrClassicQuote(chain, from, to, amount, extra, false);

	return !!quote.suggested
		? parseFusionQuote(chain, quote, extra.toToken.decimals)
		: await parseClassicQuote(chain, quote);
}

export async function swap(params) {
	const { signer, chain, rawQuote, tokens, fromAmount, slippage, signTypedDataAsync } = params;
	const userAddress = await signer.getAddress();
	const extra = { userAddress, slippage }

	const quote = isFusionSupported(CHAIN_TO_ID[chain])
		? await getFusionOrClassicQuote(chain, tokens.fromToken.address, tokens.toToken.address, fromAmount, extra, true)
		: await getClassicQuote(chain, tokens.fromToken.address, tokens.toToken.address, fromAmount, extra);

	const a = !!quote.suggested
		? await fusionSwap(chain, quote, signer, tokens, signTypedDataAsync)
		: await classicSwap(rawQuote, signer, chain);

	console.log('@@@ a', a);
	debugger;
	return a;
}

async function getFusionOrClassicQuote (chain: string, from: string, to: string, amount: string, extra, enableEstimate) {
	// ethereum = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
	// amount should include decimals
	const tokenFrom = from === ethers.constants.AddressZero ? NATIVE_TOKEN : from;
	const tokenTo = to === ethers.constants.AddressZero ? NATIVE_TOKEN : to;

	if (isFusionSupported(CHAIN_TO_ID[chain])) {
		return getFusionQuoteResponse({ chain, tokenFrom, tokenTo, amount, extra, enableEstimate })
			.then(async (response) => {
				if (response.status === 200) {
					const data = await response.json();

					if (data.suggested === false) {
						return getClassicQuote(chain, tokenFrom, tokenTo, amount, extra);
					}

					return data;
				} else {
					return getClassicQuote(chain, tokenFrom, tokenTo, amount, extra);
				}
			})
			.catch((e) => {
				console.log(e.message);
			});
	} else {
		return await getClassicQuote(chain, tokenFrom, tokenTo, amount, extra);
	}
}

export const getTxData = ({ rawQuote }) => rawQuote?.tx?.data;

export const getTx = ({ rawQuote }) => {
	if (rawQuote === null) {
		return {};
	}
	return {
		from: rawQuote.tx.from,
		to: rawQuote.tx.to,
		data: rawQuote.tx.data,
		value: rawQuote.tx.value
	};
};
