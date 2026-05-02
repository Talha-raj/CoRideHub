import { Dimensions, PixelRatio } from 'react-native';

const { width, height } = Dimensions.get('window');

// Base guideline sizes (based on standard ~375x812 screen)
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

// Scale based on width
export const scale = size => (width / guidelineBaseWidth) * size;

// Scale based on height
export const verticalScale = size => (height / guidelineBaseHeight) * size;

// Moderate scale (less aggressive)
export const moderateScale = (size, factor = 0.5) =>
  size + (scale(size) - size) * factor;

// Font scaling with PixelRatio (prevents weird zoom issues)
export const responsiveFont = size => {
  const newSize = moderateScale(size);
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};
