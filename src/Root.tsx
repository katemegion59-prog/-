import {Composition, staticFile} from 'remotion';
import type {CalculateMetadataFunction} from 'remotion';
import {ALL_FORMATS, Input, UrlSource} from 'mediabunny';
import type {Caption} from '@remotion/captions';
import {TikTok, type TikTokProps} from './TikTok';

const FPS = 30;

const calculateMetadata: CalculateMetadataFunction<TikTokProps> = async ({
	props,
}) => {
	const input = new Input({
		formats: ALL_FORMATS,
		source: new UrlSource(staticFile(props.videoFile), {getRetryDelay: () => null}),
	});
	const durationInSeconds = await input.computeDuration();
	const track = await input.getPrimaryVideoTrack();
	const captions: Caption[] = await fetch(staticFile(props.captionsFile)).then(
		(r) => r.json(),
	);

	return {
		durationInFrames: Math.max(1, Math.floor(durationInSeconds * FPS)),
		props: {
			...props,
			captions,
			sourceWidth: track?.displayWidth ?? 1080,
			sourceHeight: track?.displayHeight ?? 1920,
		},
	};
};

export const RemotionRoot: React.FC = () => {
	return (
		<Composition
			id="TikTok"
			component={TikTok}
			fps={FPS}
			width={1080}
			height={1920}
			durationInFrames={FPS * 10}
			defaultProps={
				{
					videoFile: 'input.mp4',
					captionsFile: 'captions.json',
					captions: [],
					sourceWidth: 1080,
					sourceHeight: 1920,
					// Расстояние от нижнего края кадра до низа субтитров, px (минимум 170)
					captionBottom: 340,
					// Горизонтальная точка кадрирования для горизонтального исходника, %
					focusX: 50,
					// Точка, к которой «приближается камера» (обычно лицо), %
					zoomOriginY: 35,
				} satisfies TikTokProps
			}
			calculateMetadata={calculateMetadata}
		/>
	);
};
