import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import type { Stim, Telemetry } from '../lib/api';
import { color, font, LIMITS, radius, space, STATE_META, tabular } from '../lib/theme';

/* ==========================================================================
   VitalityRing — Signature 280° Precision Dual-Arc Heart Rate & Stim Dial
   ========================================================================== */
export function VitalityRing({
  hr,
  baseline,
  state,
  stimAmp,
  hrAlert,
  size = 188,
}: {
  hr: number | null;
  baseline: number | null;
  state: Telemetry['state'];
  stimAmp: number | null;
  hrAlert: boolean;
  size?: number;
}) {
  const vb = 216;
  const cx = vb / 2;
  const cy = vb / 2;
  const rOuter = 88;
  const rInner = 74;
  const startDeg = 220;
  const sweepDeg = 280;

  const polar = (r: number, deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const arcPath = (r: number, fromDeg: number, toDeg: number) => {
    const clamped = Math.max(fromDeg + 0.5, toDeg);
    const p1 = polar(r, fromDeg);
    const p2 = polar(r, clamped);
    const large = clamped - fromDeg > 180 ? 1 : 0;
    return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  };

  const hrNorm = hr != null ? Math.max(0.04, Math.min(1, (hr - 30) / 110)) : 0;
  const baseNorm = baseline != null ? Math.max(0.04, Math.min(1, (baseline - 30) / 110)) : null;
  const stimNorm = stimAmp != null ? Math.max(0.08, Math.min(1, stimAmp / 5)) : 0;

  const hrEndDeg = startDeg + sweepDeg * hrNorm;
  const baseDeg = baseNorm != null ? startDeg + sweepDeg * baseNorm : null;
  const stimEndDeg = startDeg + sweepDeg * stimNorm;

  const outerColor =
    state === 'locked' || state === 'safe_mode' || hrAlert ? color.red : '#F4F4F8';

  const delta = hr != null && baseline != null ? Math.round(hr - baseline) : null;
  const baseTickIn = baseDeg != null ? polar(rOuter - 7, baseDeg) : null;
  const baseTickOut = baseDeg != null ? polar(rOuter + 7, baseDeg) : null;
  const headPt = hr != null ? polar(rOuter, hrEndDeg) : null;

  const ticks = Array.from({ length: 29 }, (_, idx) => {
    const deg = startDeg + (idx / 28) * sweepDeg;
    const major = idx % 7 === 0;
    const p1 = polar(rOuter + 10, deg);
    const p2 = polar(rOuter + (major ? 15 : 13), deg);
    return { p1, p2, major, idx };
  });

  return (
    <View style={[s.ringWrap, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`}>
        {ticks.map((t) => (
          <Line
            key={t.idx}
            x1={t.p1.x}
            y1={t.p1.y}
            x2={t.p2.x}
            y2={t.p2.y}
            stroke={t.major ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)'}
            strokeWidth={t.major ? 1.2 : 0.9}
            strokeLinecap="round"
          />
        ))}

        <Path
          d={arcPath(rOuter, startDeg, startDeg + sweepDeg)}
          fill="none"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth={6.5}
          strokeLinecap="round"
        />

        <Path
          d={arcPath(rInner, startDeg, startDeg + sweepDeg)}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={3.5}
          strokeLinecap="round"
        />

        {hr != null && (
          <Path
            d={arcPath(rOuter, startDeg, hrEndDeg)}
            fill="none"
            stroke={outerColor}
            strokeWidth={6.5}
            strokeLinecap="round"
          />
        )}

        {stimAmp != null && (
          <Path
            d={arcPath(rInner, startDeg, stimEndDeg)}
            fill="none"
            stroke={color.accent}
            strokeWidth={3.8}
            strokeLinecap="round"
          />
        )}

        {baseTickIn && baseTickOut && (
          <Line
            x1={baseTickIn.x}
            y1={baseTickIn.y}
            x2={baseTickOut.x}
            y2={baseTickOut.y}
            stroke="rgba(255,255,255,0.55)"
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        )}

        {headPt && (
          <Circle
            cx={headPt.x}
            cy={headPt.y}
            r={4.2}
            fill="#FFFFFF"
            stroke={outerColor}
            strokeWidth={2}
          />
        )}
      </Svg>

      <View style={s.ringCenter} pointerEvents="none">
        <Text style={s.ringCaption}>HEART RATE</Text>
        <View style={s.ringNumRow}>
          <Text style={[s.ringNum, tabular, hrAlert && { color: color.red }]}>
            {hr != null ? hr.toFixed(0) : '--'}
          </Text>
          <Text style={s.ringUnit}>bpm</Text>
        </View>
        <Text style={[s.ringDelta, tabular, hrAlert && { color: color.red, fontWeight: '600' }]}>
          {delta != null
            ? `${delta >= 0 ? '+' : ''}${delta} vs ${baseline?.toFixed(0)} base`
            : 'Acquiring'}
        </Text>
      </View>
    </View>
  );
}

/* ==========================================================================
   EarbudTwin — Schematic TWS-taVNS Earbud with Cymba Electrode & PPG Window
   ========================================================================== */
export function EarbudTwin({
  tel,
  down,
  height = 196,
}: {
  tel: Telemetry | null;
  down: boolean;
  height?: number;
}) {
  const stim = Boolean(tel?.stimulating && tel?.stim);
  const locked = tel?.state === 'locked' || tel?.state === 'safe_mode';
  const highImp = tel?.impedance_kohm != null && tel.impedance_kohm > LIMITS.impMaxKohm;

  const electrodeColor =
    locked || highImp
      ? color.red
      : stim
        ? color.accent
        : tel?.state === 'cooldown'
          ? color.amber
          : '#D4D4DC';

  const ppgColor =
    tel?.hr == null || down ? '#52525E' : locked ? color.red : color.green;

  const siteLabel = tel?.stim?.site ?? 'cymba_left';
  const electrodeSub = stim && tel?.stim
    ? `${tel.stim.amp_mA.toFixed(1)} mA · ${tel.stim.freq_Hz} Hz`
    : highImp
      ? `${tel?.impedance_kohm?.toFixed(0)} kΩ (off)`
      : locked
        ? 'Output held'
        : tel?.impedance_kohm != null
          ? `${tel.impedance_kohm.toFixed(1)} kΩ · Ready`
          : 'Electrode ready';

  const ppgSub = down
    ? 'Autonomous'
    : tel?.link_ok
      ? `${tel.imu_g != null ? `${tel.imu_g.toFixed(2)} g` : '1.00 g'} · Link OK`
      : 'Sensor link lost';

  return (
    <View style={s.earbudWrap}>
      <Svg width="100%" height={height} viewBox="-16 0 300 232">
        {/* Anatomical auricle & concha contours */}
        <G fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeWidth={1}>
          <Path d="M 88 32 C 138 14, 198 42, 200 108 C 202 154, 174 198, 134 204 C 108 208, 92 192, 92 174" />
          <Path
            d="M 102 52 C 138 40, 176 62, 176 108 C 176 140, 158 168, 132 174"
            strokeDasharray="3 4"
          />
          <Ellipse
            cx={116}
            cy={72}
            rx={28}
            ry={18}
            rotation={-22}
            originX={116}
            originY={72}
            stroke={stim ? 'rgba(155, 130, 246, 0.52)' : 'rgba(255, 255, 255, 0.14)'}
            strokeDasharray={stim ? undefined : '2 3'}
          />
        </G>

        {/* Active stimulation concentric wave rings */}
        {stim && (
          <G fill="none" stroke={color.accent}>
            <Circle cx={111} cy={70} r={14} strokeWidth={1.5} strokeOpacity={0.85} />
            <Circle cx={111} cy={70} r={24} strokeWidth={1.1} strokeOpacity={0.5} />
            <Circle cx={111} cy={70} r={35} strokeWidth={0.85} strokeOpacity={0.25} />
          </G>
        )}

        {/* Lock / high impedance ring */}
        {(locked || highImp) && (
          <Circle
            cx={111}
            cy={70}
            r={22}
            fill="none"
            stroke={color.red}
            strokeWidth={1.35}
            strokeDasharray="4 3"
          />
        )}

        {/* Schematic TWS-taVNS Earbud */}
        <G translateX={8} translateY={2}>
          <Path
            d="M 98 118 C 80 124, 68 138, 72 150 C 76 162, 94 162, 108 150 Z"
            fill="#141419"
            stroke="#2F2F3B"
            strokeWidth={1.15}
          />
          <Ellipse
            cx={81}
            cy={144}
            rx={12}
            ry={16}
            rotation={-34}
            originX={81}
            originY={144}
            fill="#0F0F13"
            stroke="#2B2B36"
            strokeWidth={1}
          />
          <Path
            d="M 102 90 C 90 76, 94 58, 108 56 C 122 54, 134 68, 132 84 Z"
            fill="#1A1A22"
            stroke="#3A3A48"
            strokeWidth={1.2}
          />
          <Circle
            cx={103}
            cy={68}
            r={7}
            fill={electrodeColor}
            stroke="#0B0B0F"
            strokeWidth={2}
          />
          <Path
            d="M 110 80 C 138 66, 174 82, 174 118 C 174 152, 146 172, 118 164 C 98 158, 92 134, 96 112 C 98 98, 102 84, 110 80 Z"
            fill="#1D1D25"
            stroke="#3D3D4C"
            strokeWidth={1.3}
          />
          <Ellipse
            cx={142}
            cy={118}
            rx={23}
            ry={31}
            rotation={14}
            originX={142}
            originY={118}
            fill={color.plumFill}
            stroke={color.plumStroke}
            strokeWidth={1.15}
          />
          <Path
            d="M 134 102 C 146 104, 152 118, 145 134"
            fill="none"
            stroke="rgba(255, 255, 255, 0.26)"
            strokeWidth={1.15}
            strokeLinecap="round"
          />
          <Rect
            x={105}
            y={112}
            width={10}
            height={18}
            rx={5}
            rotation={12}
            originX={110}
            originY={121}
            fill="#0A0A0E"
            stroke="#343442"
            strokeWidth={0.95}
          />
          <Circle cx={110} cy={121} r={2.8} fill={ppgColor} />
        </G>

        {/* Engineering Callouts */}
        <G>
          <Line x1={98} y1={62} x2={54} y2={34} stroke="rgba(255,255,255,0.22)" strokeWidth={1} />
          <SvgText
            x={-8}
            y={28}
            fill={color.ink2}
            fontSize={11.5}
            fontWeight="600"
            fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
          >
            {siteLabel}
          </SvgText>
          <SvgText
            x={-8}
            y={43}
            fill={stim ? color.accent : color.muted}
            fontSize={10.5}
            fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
          >
            {electrodeSub}
          </SvgText>

          <Line x1={112} y1={130} x2={58} y2={188} stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
          <SvgText
            x={-8}
            y={204}
            fill={color.ink2}
            fontSize={11.5}
            fontWeight="600"
            fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
          >
            PPG + IMU
          </SvgText>
          <SvgText
            x={-8}
            y={219}
            fill={color.muted}
            fontSize={10.5}
            fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
          >
            {ppgSub}
          </SvgText>
        </G>
      </Svg>
    </View>
  );
}

/* ==========================================================================
   LiveSignalScope — Smooth Cubic Spline Oscilloscope (PPG / EEG)
   ========================================================================== */
function smoothPath(pts: [number, number][]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

export function LiveSignalScope({
  title,
  meta,
  metaColor,
  samples,
  fixedRange,
  stroke,
  emptyText,
  gradId,
}: {
  title: string;
  meta: string;
  metaColor?: string;
  samples: number[];
  fixedRange?: [number, number];
  stroke: string;
  emptyText: string;
  gradId: string;
}) {
  const W = 340;
  const H = 64;
  const PAD_Y = 7;

  let linePath = '';
  let areaPath = '';
  let head: [number, number] | null = null;

  if (samples.length >= 4) {
    let lo: number;
    let hi: number;
    if (fixedRange) {
      [lo, hi] = fixedRange;
    } else {
      const mn = Math.min(...samples);
      const mx = Math.max(...samples);
      const pad = Math.max((mx - mn) * 0.18, 25);
      lo = mn - pad;
      hi = mx + pad;
    }

    const pts: [number, number][] = samples.map((v, i) => {
      const x = (i / (samples.length - 1)) * (W - 10) + 2;
      const clamped = Math.max(lo, Math.min(hi, v));
      const y = PAD_Y + (1 - (clamped - lo) / (hi - lo || 1)) * (H - PAD_Y * 2);
      return [x, y];
    });
    linePath = smoothPath(pts);
    head = pts[pts.length - 1];
    areaPath = `${linePath} L ${head[0].toFixed(1)} ${H} L ${pts[0][0].toFixed(1)} ${H} Z`;
  }

  return (
    <View style={s.scopeCard}>
      <View style={s.scopeHead}>
        <Text style={s.scopeTitle}>{title}</Text>
        <Text style={[s.scopeMeta, tabular, metaColor ? { color: metaColor } : null]}>
          {meta}
        </Text>
      </View>

      <View style={s.scopeCanvas}>
        {head ? (
          <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            <Defs>
              <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={stroke} stopOpacity="0.16" />
                <Stop offset="1" stopColor={stroke} stopOpacity="0.0" />
              </LinearGradient>
            </Defs>
            <Line
              x1={0}
              x2={W}
              y1={H * 0.5}
              y2={H * 0.5}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
            <Path d={areaPath} fill={`url(#${gradId})`} />
            <Path
              d={linePath}
              fill="none"
              stroke={stroke}
              strokeWidth={1.8}
              strokeLinecap="round"
            />
            <Circle
              cx={head[0]}
              cy={head[1]}
              r={3.2}
              fill="#FFFFFF"
              stroke={stroke}
              strokeWidth={1.6}
            />
          </Svg>
        ) : (
          <View style={s.scopeEmpty}>
            <Text style={s.scopeEmptyText}>{emptyText}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/* ==========================================================================
   BiphasicWaveform — Charge-Balanced taVNS Pulse Train
   ========================================================================== */
export function BiphasicWaveform({
  amp_mA,
  freq_Hz,
  pw_us,
  height = 46,
}: Pick<Stim, 'amp_mA' | 'freq_Hz' | 'pw_us'> & { height?: number }) {
  const W = 340;
  const H = height;
  const mid = H / 2;
  const pulses = Math.max(5, Math.min(11, Math.round(freq_Hz * 0.34)));
  const period = W / pulses;
  const ampPx = Math.max(8, Math.min(H * 0.38, (amp_mA / 5) * (H * 0.36) + 6));
  const pwPx = Math.max(3, Math.min(period * 0.22, (pw_us / 500) * 10 + 2.5));

  let d = `M 0 ${mid}`;
  for (let i = 0; i < pulses; i++) {
    const x0 = i * period + 6;
    const x1 = x0 + pwPx;
    const x2 = x1 + 2;
    const x3 = x2 + pwPx;
    d += ` L ${x0.toFixed(1)} ${mid} L ${x0.toFixed(1)} ${(mid - ampPx).toFixed(1)} L ${x1.toFixed(1)} ${(mid - ampPx).toFixed(1)} L ${x1.toFixed(1)} ${mid}`;
    d += ` L ${x2.toFixed(1)} ${mid} L ${x2.toFixed(1)} ${(mid + ampPx).toFixed(1)} L ${x3.toFixed(1)} ${(mid + ampPx).toFixed(1)} L ${x3.toFixed(1)} ${mid}`;
  }
  d += ` L ${W} ${mid}`;

  return (
    <View style={s.pulseWell}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Line x1={0} y1={mid} x2={W} y2={mid} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
        <Path d={d} fill="none" stroke={color.accent} strokeWidth={1.85} />
      </Svg>
    </View>
  );
}

/* ==========================================================================
   ClosedLoopPipeline — 5-Stage Hardware Signal-to-Safety Flow
   ========================================================================== */
export function ClosedLoopPipeline({ tel, down }: { tel: Telemetry; down: boolean }) {
  const locked = tel.state === 'locked' || tel.state === 'safe_mode';
  const stim = tel.stimulating && Boolean(tel.stim);

  const stages = [
    {
      k: 'Earbud',
      v: tel.hr != null ? 'Sensors' : 'Offline',
      tone: tel.hr != null ? 'ok' : 'warn',
    },
    {
      k: 'Link',
      v: down ? 'Auton.' : tel.link_ok ? 'CRC32' : 'Lost',
      tone: down ? 'warn' : tel.link_ok ? 'ok' : 'bad',
    },
    {
      k: 'DSP',
      v: stim ? 'Seizure' : 'Filter',
      tone: stim ? 'accent' : 'ok',
    },
    {
      k: 'Gate',
      v: STATE_META[tel.state].short,
      tone: locked ? 'bad' : stim ? 'accent' : tel.state === 'cooldown' ? 'warn' : 'ok',
    },
    {
      k: 'Output',
      v: stim && tel.stim ? `${tel.stim.amp_mA.toFixed(1)} mA` : locked ? 'Blocked' : 'Isolated',
      tone: stim ? 'accent' : locked ? 'bad' : 'idle',
    },
  ] as const;

  return (
    <View style={s.pipeWell}>
      <Text style={s.pipeHeading}>CLOSED-LOOP HARDWARE PIPELINE</Text>
      <View style={s.pipeRow}>
        {stages.map((st, idx) => {
          const isAccent = st.tone === 'accent';
          const isBad = st.tone === 'bad';
          const isWarn = st.tone === 'warn';
          return (
            <React.Fragment key={st.k}>
              <View
                style={[
                  s.pipeNode,
                  isAccent && s.pipeNodeAccent,
                  isBad && s.pipeNodeBad,
                ]}
              >
                <Text style={s.pipeK} numberOfLines={1}>
                  {st.k}
                </Text>
                <Text
                  style={[
                    s.pipeV,
                    isAccent && { color: color.accent },
                    isBad && { color: color.red },
                    isWarn && { color: color.amber },
                  ]}
                  numberOfLines={1}
                >
                  {st.v}
                </Text>
              </View>
              {idx < stages.length - 1 && (
                <View
                  style={[
                    s.pipeWire,
                    idx === 3 && locked
                      ? { backgroundColor: color.red }
                      : idx >= 2 && stim
                        ? { backgroundColor: color.accent }
                        : null,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  ringCenter: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  ringCaption: {
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.9,
    color: color.muted,
    marginBottom: 2,
  },
  ringNumRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  ringNum: {
    fontSize: font.display,
    fontWeight: '600',
    letterSpacing: -1.6,
    lineHeight: 46,
    color: color.ink,
  },
  ringUnit: {
    fontSize: 12.5,
    color: color.muted,
    fontWeight: '500',
  },
  ringDelta: {
    marginTop: 4,
    fontSize: 11,
    color: color.muted,
  },
  earbudWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeCard: {
    backgroundColor: color.well,
    borderWidth: 1,
    borderColor: color.lineSoft,
    borderRadius: radius.panel,
    paddingHorizontal: 13,
    paddingVertical: 11,
    gap: 6,
  },
  scopeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  scopeTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: color.ink,
  },
  scopeMeta: {
    fontSize: 11.5,
    color: color.muted,
    fontWeight: '500',
  },
  scopeCanvas: {
    height: 64,
    justifyContent: 'center',
  },
  scopeEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeEmptyText: {
    fontSize: 12,
    color: color.faint,
  },
  pulseWell: {
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.018)',
    overflow: 'hidden',
    paddingVertical: 2,
  },
  pipeWell: {
    backgroundColor: color.well,
    borderWidth: 1,
    borderColor: color.lineSoft,
    borderRadius: radius.panel,
    padding: 12,
    gap: 9,
  },
  pipeHeading: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.9,
    color: color.muted,
  },
  pipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pipeNode: {
    flex: 1,
    backgroundColor: color.stage,
    borderWidth: 1,
    borderColor: color.lineSoft,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 7,
    alignItems: 'center',
    gap: 2,
  },
  pipeNodeAccent: {
    borderColor: color.accentLine,
    backgroundColor: color.accentSoft,
  },
  pipeNodeBad: {
    borderColor: color.redLine,
    backgroundColor: color.redSoft,
  },
  pipeK: {
    fontSize: 9.5,
    color: color.muted,
    fontWeight: '500',
  },
  pipeV: {
    fontSize: 10.5,
    fontWeight: '600',
    color: color.ink,
  },
  pipeWire: {
    width: 6,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
});
