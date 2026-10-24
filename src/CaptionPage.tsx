import {AbsoluteFill, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont} from '@remotion/fonts';
import type {Page} from './pages';
import {ACCENT} from './theme';

const fontFamily = 'Montserrat';
loadFont({
	family: fontFamily,
	url: staticFile('fonts/montserrat-cyrillic-800-normal.woff2'),
	weight: '800',
	unicodeRange: 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116',
});
loadFont({
	family: fontFamily,
	url: staticFile('fonts/montserrat-latin-800-normal.woff2'),
	weight: '800',
	unicodeRange: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2212',
});

const FONT_SIZE = 92;

export const CaptionPage: React.FC<{page: Page; bottom: number}> = ({page, bottom}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const nowMs = page.startMs + (frame / fps) * 1000;

	const enter = spring({frame, fps, config: {damping: 14, stiffness: 220, mass: 0.6}});
	const pageScale = interpolate(enter, [0, 1], [0.82, 1]);
	const pageY = interpolate(enter, [0, 1], [24, 0]);

	return (
		<AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center'}}>
			<div
				style={{
					marginBottom: bottom,
					width: 1080 - 2 * 70,
					display: 'flex',
					flexWrap: 'wrap',
					justifyContent: 'center',
					columnGap: 40,
					rowGap: 4,
					fontFamily,
					fontWeight: 800,
					fontSize: FONT_SIZE,
					lineHeight: 1.12,
					textTransform: 'uppercase',
					textAlign: 'center',
					opacity: enter,
					transform: `translateY(${pageY}px) scale(${pageScale})`,
				}}
			>
				{page.words.map((w, i) => {
					const next = page.words[i + 1];
					const activeUntil = next ? next.startMs : page.endMs;
					const active = nowMs >= w.startMs && nowMs < activeUntil;
					const wordFrame = ((nowMs - w.startMs) / 1000) * fps;
					const pop = active
						? spring({frame: wordFrame, fps, config: {damping: 12, stiffness: 260, mass: 0.5}})
						: 0;
					return (
						<span
							key={w.startMs}
							style={{
								display: 'inline-block',
								color: active ? ACCENT : 'white',
								transform: `scale(${1 + 0.06 * pop})`,
								WebkitTextStroke: '14px rgba(20,12,16,0.95)',
								paintOrder: 'stroke fill',
								textShadow: '0 6px 18px rgba(0,0,0,0.55)',
							}}
						>
							{w.text.trim()}
						</span>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};
