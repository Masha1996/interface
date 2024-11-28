import styled from 'styled-components';
import Tooltip from '~/components/Tooltip';
import { useTokenApprove } from '../Aggregator/hooks';
import { Flex, Skeleton, Text } from '@chakra-ui/react';
import { AlertCircle, Gift, Unlock, ZapOff } from 'react-feather';
import { GasIcon } from '../Icons';
import { formattedNum } from '~/utils';

interface IToken {
	address: string;
	logoURI: string;
	symbol: string;
	decimals: number;
}

interface IPrice {
	amountReturned: string;
	estimatedGas: string;
	tokenApprovalAddress: string;
	logo: string;
	isGaslessApproval?: boolean;
	rawQuote?: {};
	isMEVSafe?: boolean;
}

interface IRoute {
	name: string;
	price: IPrice;
	toToken: IToken;
	fromToken: IToken;
	selectedChain: string;
	setRoute: () => void;
	selected: boolean;
	index: number;
	gasUsd: number | string;
	amountUsd: string;
	airdrop: boolean;
	amountFrom: string;
	lossPercent: number;
	gasTokenPrice: number;
	txData: string;
	netOut: number;
	isFetchingGasPrice: boolean;
	amountOut: string;
	toTokenPrice: number;
	amountIn: string;
	isGasless: boolean;
}

const Route = ({
	name,
	price,
	toToken,
	setRoute,
	selected,
	index,
	gasUsd,
	airdrop,
	fromToken,
	amountFrom,
	lossPercent,
	netOut,
	isFetchingGasPrice,
	amountOut,
	toTokenPrice,
	amountIn,
	selectedChain,
	isGasless
}: IRoute) => {
	const { isApproved } = useTokenApprove({
		token: fromToken?.address as `0x${string}`,
		spender: price?.tokenApprovalAddress as `0x${string}`,
		amount: amountFrom,
		chain: selectedChain
	});

	if (
		!price.amountReturned
		|| (Number(gasUsd) === 0 && !['CowSwap', '1inch'].includes(name) && !isGasless)
	) return null;

	const amount = +price.amountReturned / 10 ** +toToken?.decimals;

	const afterFees =
		toTokenPrice && Number.isFinite(Number(toTokenPrice)) && netOut && Number.isFinite(Number(netOut))
			? `$${formattedNum(netOut.toFixed(1), false, true)}`
			: null;
	const isGasNotKnown = gasUsd === 'Unknown' || Number.isNaN(Number(gasUsd));
	const txGas = isGasNotKnown ? '' : '$' + formattedNum(gasUsd);

	const inputAmount = amountOut !== '0' && fromToken?.decimals && amountFrom && amountFrom !== '0' ? amountIn : null;
	return (
		<RouteWrapper
			onClick={setRoute}
			className={selected ? 'RouteWrapper is-selected' : 'RouteWrapper'}
			selected={selected}
			best={index === 0}
		>
			<RouteRow>
				{inputAmount ? (
					<Flex alignItems="baseline">
						<Text fontSize={19} fontWeight={700} color={'#FAFAFA'}>
							{formattedNum(inputAmount)}{' '}
						</Text>
						<Text fontSize={19} fontWeight={600} marginLeft={'4px'} color={'#ccc'}>
							{fromToken?.symbol}{' '}
						</Text>
					</Flex>
				) : (
					<Flex alignItems="baseline">
						<Text fontSize={19} fontWeight={700} color={'#FAFAFA'}>
							{formattedNum(amount)}{' '}
						</Text>
						<Text fontSize={19} fontWeight={600} marginLeft={'4px'} color={'#ccc'}>
							{toToken?.symbol}{' '}
						</Text>
					</Flex>
				)}
				<Text fontWeight={500} fontSize={16} color={'#FAFAFA'}>
					<Flex as="span" alignItems="center" gap="8px">
						{index === 0 ? (
							<Text as="span" color="#059669" fontSize={14} fontWeight={700}>
								BEST
							</Text>
						) : Number.isFinite(lossPercent) ? (
							<Text as="span" color="red.300" fontSize={12}>
								-{Math.abs(100 - lossPercent * 100).toFixed(2)}%
							</Text>
						) : null}
					</Flex>
				</Text>
			</RouteRow>

			<RouteRow>
				{inputAmount ? (
					<Flex className="mobile-column" as="span" columnGap="4px" display="flex" color="gray.400" fontWeight={500}>
						Input Amount
					</Flex>
				) : (
					<Flex
						className="mobile-column"
						as="span"
						columnGap="4px"
						display="flex"
						color="gray.400"
						fontWeight={500}
						flexWrap={'wrap'}
					>
						{afterFees ? <Text whiteSpace={'nowrap'}>{`≈ ${afterFees} after gas fees`}</Text> : null}
						{isGasNotKnown && !isFetchingGasPrice && !isGasless ? (
							<Text
								display="flex"
								gap="4px"
								alignItems="center"
								color="#d97706"
								className="inline-alert"
								whiteSpace={'nowrap'}
							>
								<AlertCircle size="14" /> unknown gas fees
							</Text>
						) : afterFees ? null : null}
					</Flex>
				)}
				<Text display="flex" columnGap="6px" color={'gray.400'} fontWeight={500} ml="auto">
					<Text
						display="flex"
						alignItems="center"
						gap="4px"
						color="gray.400"
						flexDirection={['column', 'row', 'row', 'row']}
						whiteSpace={'nowrap'}
					>
						{airdrop ? (
							<Tooltip content="This project has no token and might airdrop one in the future">
								<Gift size={14} color="#A0AEC0" />
							</Tooltip>
						) : null}
						{name === 'CowSwap' || (name === '1inch' && gasUsd === 0) ? (
							<Tooltip content="Gas is taken from output amount">
								<Text as="span" display="flex" alignItems="center" gap="4px" color="gray.400" fontWeight={500}>
									{isGasNotKnown ? null : <GasIcon />}
									{txGas}
								</Text>
							</Tooltip>
						) : (
							<Text as="span" display="flex" alignItems="center" gap="4px" fontWeight={500}>
								{isGasNotKnown ? null : <GasIcon />}
								{txGas}
							</Text>
						)}
						<Text display="flex" gap="3px">
							via
							{isApproved ? (
								<Tooltip content="Token is approved for this aggregator.">
									<Unlock size={14} color="#059669" />
								</Tooltip>
							) : (
								' '
							)}
							{name}
							{price.isMEVSafe === true ? (
								<Tooltip content="This aggregator protects from MEV.">
									<ZapOff size={14} color="#059669" />
								</Tooltip>
							) : null}
						</Text>
					</Text>
				</Text>
			</RouteRow>
		</RouteWrapper>
	);
};

export const LoadingRoute = ({ name }: { name: string }) => {
	return (
		<RouteWrapper>
			<RouteRow>
				<Skeleton height="28.5px" w="full" colorScheme="dark" />
			</RouteRow>

			<RouteRow>
				<Text display="flex" columnGap="6px" color={'gray.400'} fontWeight={500} ml="auto">
					{name}
				</Text>
			</RouteRow>
		</RouteWrapper>
	);
};

const RouteWrapper = styled.div<{ selected?: boolean; best?: boolean }>`
	display: grid;
	grid-row-gap: 4px;
	margin-top: 16px;
	&.is-selected {
		border-color: rgb(31 114 229);
		background-color: rgb(3 11 23);
	}

	background-color: ${({ selected }) => (selected ? ' #161616;' : '#2d3039;')};
	border: 1px solid #373944;
	padding: 7px 15px 9px;
	border-radius: 8px;
	cursor: pointer;

	animation: swing-in-left-fwd 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
	@keyframes swing-in-left-fwd {
		0% {
			transform: rotateX(100deg);
			transform-origin: left;
			opacity: 0;
		}
		100% {
			transform: rotateX(0);
			transform-origin: left;
			opacity: 1;
		}
	}
	.secondary-data {
		opacity: 0;
		transition: opacity 0.2s linear;
	}
	&:hover {
		background-color: #161616;
	}
	&:hover,
	&.is-selected,
	&:first-of-type {
		.secondary-data {
			opacity: 1;
		}
	}
`;

const RouteRow = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;

	img {
		width: 15px;
		height: 15px;
		aspect-ratio: 1;
		border-radius: 50%;
		margin: 0 0px 0 6px;
	}
	@media (max-width: 768px) {
		.mobile-column {
			flex-direction: column;
		}
		.mobile-flexend {
			align-items: flex-end;
		}
	}
`;

export default Route;
