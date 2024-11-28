// Source https://portal.1inch.dev/documentation/apis/swap/classic-swap/introduction

import { ethers } from 'ethers';
import { sendTx } from '../../utils/sendTx';
import { CHAIN_TO_ID, SPENDERS, NATIVE_TOKEN } from './constants';
import { getClassicQuote, parseClassicQuote } from './classic-swap';
import { isFusionSupported, getFusionQuoteResponse, parseFusionQuote } from './fusion-swap';

export const name = '1inch';
export const token = '1INCH';
export const referral = true;
export const chainToId = CHAIN_TO_ID;

export function approvalAddress(chain: string) {
	// https://api.1inch.io/v6.0/1/approve/spender
	return SPENDERS[chain];
}

export async function getQuote(chain: string, from: string, to: string, amount: string, extra) {
	// ethereum = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
	// amount should include decimals
	const tokenFrom = from === ethers.constants.AddressZero ? NATIVE_TOKEN : from;
	const tokenTo = to === ethers.constants.AddressZero ? NATIVE_TOKEN : to;

	const quote = isFusionSupported(CHAIN_TO_ID[chain])
		? await getFusionOrClassicQuote(chain, tokenFrom, tokenTo, amount, extra)
		: await getClassicQuote(chain, tokenFrom, tokenTo, amount, extra);

	return quote.suggested
		? parseFusionQuote(chain, quote)
		: parseClassicQuote(chain, quote);
}

async function getFusionOrClassicQuote(chain: string, tokenFrom: string, tokenTo: string, amount: string, extra) {
	const response = await getFusionQuoteResponse(chain, tokenFrom, tokenTo, amount, extra);
	return response.status === 200
		? response.json()
		: getClassicQuote(chain, tokenFrom, tokenTo, amount, extra);
}

export async function swap({ signer, chain, rawQuote }) {
	const txObject = {
		from: rawQuote.tx.from,
		to: rawQuote.tx.to,
		data: rawQuote.tx.data,
		value: rawQuote.tx.value
	};
	const gasPrediction = await signer.estimateGas(txObject);

	return await sendTx(signer, chain, {
		...txObject,
		gasLimit: gasPrediction.mul(12).div(10).add(86000) // Increase gas +20% + 2 erc20 txs
	});
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
