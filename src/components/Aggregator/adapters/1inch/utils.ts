export function omit<T, K extends string>(propsToOmit: K[], obj: T): Omit<T, K> {
	if (obj === null || obj === undefined) {
		return undefined as T;
	}

	const propsToOmitValue = typeof propsToOmit === 'string' ? (propsToOmit as string).split(',') : propsToOmit;
	const willReturn = {} as Omit<T, K>;

	for (const key in obj) {
		if (!propsToOmitValue.includes(key)) {
			(willReturn as any)[key] = obj[key];
		}
	}

	return willReturn;
}