interface GlobalDeck {
	numPages: number;
	nextPage(): Promise<void>;
}
declare const deck: GlobalDeck;
