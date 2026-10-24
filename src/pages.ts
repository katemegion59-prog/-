import type {Caption} from '@remotion/captions';

export type Page = {
	startMs: number;
	endMs: number;
	words: Caption[];
	// Первая страница после паузы — начало новой фразы
	phraseStart: boolean;
};

const MAX_WORDS = 3;
const MAX_CHARS = 18;
const PAUSE_MS = 350;
const PHRASE_PAUSE_MS = 700;
const HOLD_MS = 400;

// Группирует слова в короткие «страницы» по 1–3 слова, разрывая на паузах
export const buildPages = (captions: Caption[]): Page[] => {
	const groups: Caption[][] = [];
	let cur: Caption[] = [];
	for (const c of captions) {
		const prev = cur[cur.length - 1];
		const chars = cur.reduce((n, w) => n + w.text.trim().length + 1, 0);
		if (
			prev &&
			(cur.length >= MAX_WORDS ||
				chars + c.text.trim().length > MAX_CHARS ||
				c.startMs - prev.endMs > PAUSE_MS)
		) {
			groups.push(cur);
			cur = [];
		}
		cur.push(c);
	}
	if (cur.length) groups.push(cur);

	return groups.map((words, i) => {
		const prevGroup = groups[i - 1];
		const next = groups[i + 1];
		const lastEnd = words[words.length - 1].endMs;
		const endMs = next
			? Math.min(next[0].startMs, lastEnd + HOLD_MS)
			: lastEnd + HOLD_MS;
		return {
			startMs: words[0].startMs,
			endMs,
			words,
			phraseStart:
				!prevGroup ||
				words[0].startMs - prevGroup[prevGroup.length - 1].endMs > PHRASE_PAUSE_MS,
		};
	});
};
