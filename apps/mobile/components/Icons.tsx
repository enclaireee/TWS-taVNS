import React from 'react';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';
import { color } from '../lib/theme';

export function BrandLogoMark({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024" fill="none">
      <Path
        d="M710 388C710 258 634 196 516 196C384 196 310 312 310 512C310 712 384 828 516 828C634 828 710 766 710 636"
        stroke={color.ink}
        strokeWidth={68}
        strokeLinecap="butt"
      />
      <Path
        d="M396 512H470L522 396L586 628L632 512H732"
        stroke={color.accent}
        strokeWidth={56}
        strokeLinecap="butt"
        strokeLinejoin="miter"
        strokeMiterlimit={10}
      />
    </Svg>
  );
}

type IconProps = { size?: number; stroke?: string; strokeWidth?: number };

export function IconPulse({ size = 20, stroke = color.muted, strokeWidth = 1.9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="2,12 6,12 9,4.5 14,19.5 17.5,12 22,12"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconTimeline({ size = 20, stroke = color.muted, strokeWidth = 1.9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="4" y1="6" x2="20" y2="6" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="4" y1="12" x2="16" y2="12" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="4" y1="18" x2="13" y2="18" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx="18.5" cy="17.5" r="2" stroke={stroke} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function IconSliders({ size = 20, stroke = color.muted, strokeWidth = 1.9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="4" y1="7" x2="20" y2="7" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx="9" cy="7" r="2.2" fill={color.stage} stroke={stroke} strokeWidth={strokeWidth} />
      <Line x1="4" y1="17" x2="20" y2="17" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx="15" cy="17" r="2.2" fill={color.stage} stroke={stroke} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function IconFlask({ size = 20, stroke = color.muted, strokeWidth = 1.9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 3h6M10 3v5.4L5.2 17.5A2.2 2.2 0 0 0 7.1 20.5h9.8a2.2 2.2 0 0 0 1.9-3L14 8.4V3"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1="7.5" y1="15" x2="16.5" y2="15" stroke={stroke} strokeWidth={strokeWidth - 0.3} strokeLinecap="round" />
    </Svg>
  );
}

export function IconEarbud({ size = 20, stroke = color.muted, strokeWidth = 1.9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15.5 5.5a5.5 5.5 0 0 0-8 4.9c0 2 .9 3.6 2 4.9.9 1.1 1.5 2.4 1.5 3.7a2 2 0 0 0 4 0v-4.2a5.5 5.5 0 0 0 .5-9.3Z"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="13" cy="10.2" r="1.6" fill={stroke} />
    </Svg>
  );
}

export function IconShield({ size = 16, stroke = color.green, strokeWidth = 1.9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3 5 6v6c0 4.5 3 7.8 7 9 4-1.2 7-4.5 7-9V6l-7-3Z"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Polyline
        points="9,12.2 11.2,14.4 15.4,10"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconShieldAlert({ size = 16, stroke = color.red, strokeWidth = 1.9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3 5 6v6c0 4.5 3 7.8 7 9 4-1.2 7-4.5 7-9V6l-7-3Z"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Line x1="12" y1="8.5" x2="12" y2="13" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx="12" cy="16" r="1" fill={stroke} />
    </Svg>
  );
}

export function IconZap({ size = 15, stroke = color.accent, strokeWidth = 1.9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M13 2 4.5 13.5H12L11 22l8.5-11.5H12L13 2Z"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconLock({ size = 15, stroke = color.muted, strokeWidth = 1.9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="11" width="14" height="10" rx="2.5" stroke={stroke} strokeWidth={strokeWidth} />
      <Path d="M8 11V7.5a4 4 0 0 1 8 0V11" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconCheck({ size = 14, stroke = color.green, strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="4.5,12.5 9.5,17.5 19.5,6.5"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconPlay({ size = 13, stroke = color.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 5.5 19 12 7 18.5V5.5Z" fill={stroke} />
    </Svg>
  );
}

export function IconRadio({ size = 15, stroke = color.green, strokeWidth = 1.9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="2" fill={stroke} />
      <Path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M5.5 5.5a9.2 9.2 0 0 0 0 13M18.5 5.5a9.2 9.2 0 0 1 0 13" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}
