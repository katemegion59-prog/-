import {useMemo} from 'react';
import {
	AbsoluteFill,
	interpolate,
	Sequence,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {Video} from '@remotion/media';
import type {Caption} from '@remotion/captions';
import {buildPages, type Page} from './pages';
import {CaptionPage} from './CaptionPage';
import {ACCENT} from './theme';

export type TikTokProps = {
	videoFile: string;
	captionsFile: string;
	captions: Caption[];
	sourceWidth: number;
	sourceHeight: number;
	captionBottom: number;
	focusX: number;
	zoomOriginY: number;
};

const PUNCH_MIN_GAP_MS = 3000;

// Камера: медленное «дыхание» приближения/отдаления + короткий наезд на начале фразы
const useCameraScale = (pages: Page[]) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;

	const punchTimes = useMemo(() => {
		const times: number[] = [];
		for (const p of pages) {
			const last = times[times.length - 1];
			if (p.phraseStart && (last === undefined || p.startMs - last * 1000 > PUNCH_MIN_GAP_MS)) {
				times.push(p.startMs / 1000);
			}
		}
		return times;
	}, [pages]);

	const breathing = 1.05 + 0.035 * Math.sin((2 * Math.PI * t) / 10 - Math.PI / 2);
	let punch = 0;
	for (const pt of punchTimes) {
		const dt = t - pt;
		if (dt < 0 || dt > 3) continue;
		const attack = interpolate(dt, [0, 0.18], [0, 1], {extrapolateRight: 'clamp'});
		punch = Math.max(punch, 0.06 * attack * Math.exp(-dt / 0.9));
	}
	return breathing + punch;
};

export const TikTok: React.FC<TikTokProps> = ({
	videoFile,
	captions,
	sourceWidth,
	sourceHeight,
	captionBottom,
	focusX,
	zoomOriginY,
}) => {
	const frame = useCurrentFrame();
	const {fps, durationInFrames, width, height} = useVideoConfig();
	// Кадрирование «cover»: заполняем 9:16 целиком, лишнее обрезаем
	const cover = Math.max(width / sourceWidth, height / sourceHeight);
	const vw = sourceWidth * cover;
	const vh = sourceHeight * cover;
	const pages = useMemo(() => buildPages(captions), [captions]);
	const scale = useCameraScale(pages);

	const fade = interpolate(
		frame,
		[0, 0.4 * fps, durationInFrames - 0.5 * fps, durationInFrames - 1],
		[0, 1, 1, 0],
		{extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
	);
	const progress = frame / Math.max(1, durationInFrames - 1);

	return (
		<AbsoluteFill style={{backgroundColor: 'black'}}>
			<AbsoluteFill
				style={{
					transform: `scale(${scale})`,
					transformOrigin: `50% ${zoomOriginY}%`,
					opacity: fade,
				}}
			>
				<Video
					src={staticFile(videoFile)}
					style={{
						position: 'absolute',
						width: vw,
						height: vh,
						left: (width - vw) * (focusX / 100),
						top: (height - vh) / 2,
					}}
				/>
			</AbsoluteFill>

			{/* Мягкая виньетка и затемнение снизу — для читаемости субтитров */}
			<AbsoluteFill
				style={{
					background:
						'radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%), linear-gradient(to top, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 35%)',
				}}
			/>

			{pages.map((page, i) => {
				const from = Math.round((page.startMs / 1000) * fps);
				const to = Math.round((page.endMs / 1000) * fps);
				if (to <= from) return null;
				return (
					<Sequence key={i} from={from} durationInFrames={to - from} layout="none">
						<CaptionPage page={page} bottom={Math.max(170, captionBottom)} />
					</Sequence>
				);
			})}

			{/* Тонкий прогресс-бар сверху */}
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					height: 8,
					width: `${progress * 100}%`,
					backgroundColor: ACCENT,
					opacity: 0.9 * fade,
					boxShadow: `0 0 16px ${ACCENT}`,
				}}
			/>
		</AbsoluteFill>
	);
};
