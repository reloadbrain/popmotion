import value from 'popmotion/reactions/value';
import { Pose, ValueMap, PoseSetterFactoryProps } from 'types';
import { Action } from 'popmotion/action';
import { Styler } from 'stylefire';

export { Action };

type SetValueProps = {
  values: ValueMap,
  elementStyler: Styler
};

type FlipPose = {
  scaleX?: number,
  scaleY?: number,
  x?: number,
  y?: number
};

const positionalProps = new Set(['width', 'height', 'top', 'left', 'bottom', 'right']);
const checkPositionalProp = (key: string) => positionalProps.has(key);
const hasPositionalProps = (pose: Pose) => Object.keys(pose).some(checkPositionalProp);
export const isFlipPose = (pose: Pose, key: string) => hasPositionalProps(pose) || key === 'flip';

const setValue = ({ values, elementStyler }: SetValueProps, key: string, to: any) => {
  if (values.has(key)) {
    // Here, if we already have the value, we update it twice.
    // Because of stylefire's render batching, this isn't going
    // to actually render twice, but because we're making
    // the value jump a great distance, we want to reset the velocity
    // to 0, rather than something arbitrarily high
    // Maybe a more explicit API would be nicer
    const val = values.get(key);
    val.update(to);
    val.update(to);
  } else {
    values.set(key, value(to, (v: any) => elementStyler.set(key, v)));
  }
};

const explicitlyFlipPose = (state: PoseSetterFactoryProps, nextPose: Pose) => {
  const { dimensions, elementStyler } = state;
  dimensions.measure();
  const { width, height, top, left, bottom, right, ...remainingPose } = nextPose;

  (elementStyler.set({ width, height, top, left, bottom, right }) as Styler)
    .render();

  return implicitlyFlipPose(state, remainingPose);
};

const implicitlyFlipPose = (state: PoseSetterFactoryProps, nextPose: Pose) => {
  const { dimensions, element, elementStyler } = state;
  if (!dimensions.has()) return;

  const flipPoseProps: FlipPose = {};
  const prev = dimensions.get();
  const next = element.getBoundingClientRect();

  if (prev.width !== next.width) {
    setValue(state, 'scaleX', prev.width / next.width);
    flipPoseProps.scaleX = 1;
  }

  if (prev.height !== next.height) {
    setValue(state, 'scaleY', prev.height / next.height);
    flipPoseProps.scaleY = 1;
  }

  const originX = (prev.top === next.top)
    ? 0
    : (prev.bottom === next.bottom)
      ? '100%'
      : '50%';

  const originY = (prev.left === next.left)
    ? 0
    : (prev.right === next.right)
      ? '100%'
      : '50%';

  (elementStyler.set({ originX, originY }) as Styler)
    .render();

  return {
    ...nextPose,
    ...flipPose
  };
};

export const flipPose = (state: PoseSetterFactoryProps, nextPose: Pose) => hasPositionalProps(nextPose)
  ? explicitlyFlipPose(state, nextPose)
  : implicitlyFlipPose(state, nextPose);
