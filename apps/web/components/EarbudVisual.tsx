import type { Telemetry } from "@/lib/api";

export function EarbudTwin({ tel, down }: { tel: Telemetry; down: boolean }) {
  const stim = tel.stimulating && tel.stim;
  const locked = tel.state === "locked" || tel.state === "safe_mode";
  const highImp = tel.impedance_kohm != null && tel.impedance_kohm > 50;

  const electrodeColor = locked || highImp
    ? "#f05259"
    : stim
      ? "#9b82f6"
      : tel.state === "cooldown"
        ? "#e8a838"
        : "#d4d4dc";

  const ppgColor =
    tel.hr == null || down
      ? "#52525e"
      : locked
        ? "#f05259"
        : "#38c980";

  return (
    <div className="earbud-stage" aria-label="TWS-taVNS earbud schematic">
      <svg
        viewBox="-16 0 300 232"
        className="earbud-svg"
        role="img"
        aria-label={`Earbud schematic, site ${tel.stim?.site ?? "cymba_left"}, state ${tel.state}`}
      >
        {/* Anatomical auricle & concha contour lines */}
        <g fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1">
          <path d="M 88 32 C 138 14, 198 42, 200 108 C 202 154, 174 198, 134 204 C 108 208, 92 192, 92 174" />
          <path
            d="M 102 52 C 138 40, 176 62, 176 108 C 176 140, 158 168, 132 174"
            strokeDasharray="3 4"
          />
          <ellipse
            cx="116"
            cy="72"
            rx="28"
            ry="18"
            transform="rotate(-22 116 72)"
            stroke={stim ? "rgba(155, 130, 246, 0.52)" : "rgba(255, 255, 255, 0.14)"}
            strokeDasharray={stim ? "none" : "2 3"}
          />
        </g>

        {/* Active stimulation concentric wave rings from cymba electrode */}
        {stim && (
          <g fill="none" stroke="#9b82f6">
            <circle cx="111" cy="70" r="14" className="ripple r1" strokeWidth="1.35" />
            <circle cx="111" cy="70" r="24" className="ripple r2" strokeWidth="1.05" />
            <circle cx="111" cy="70" r="35" className="ripple r3" strokeWidth="0.85" />
          </g>
        )}

        {/* Lock / High impedance warning ring */}
        {(locked || highImp) && (
          <circle
            cx="111"
            cy="70"
            r="22"
            fill="none"
            stroke="#f05259"
            strokeWidth="1.3"
            strokeDasharray="4 3"
          />
        )}

        {/* Technical Skeleton / Schematic TWS-taVNS Earbud */}
        <g transform="translate(8, 2)">
          {/* Ear tip */}
          <path
            d="M 98 118 C 80 124, 68 138, 72 150 C 76 162, 94 162, 108 150 Z"
            fill="#141419"
            stroke="#2f2f3b"
            strokeWidth="1.15"
          />
          <ellipse
            cx="81"
            cy="144"
            rx="12"
            ry="16"
            transform="rotate(-34 81 144)"
            fill="#0f0f13"
            stroke="#2b2b36"
            strokeWidth="1"
          />

          {/* Upper Cymba Conchae Wing */}
          <path
            d="M 102 90 C 90 76, 94 58, 108 56 C 122 54, 134 68, 132 84 Z"
            fill="#1a1a22"
            stroke="#3a3a48"
            strokeWidth="1.2"
          />

          {/* Cymba Micro-Electrode Pad */}
          <circle
            cx="103"
            cy="68"
            r="7"
            fill={electrodeColor}
            stroke="#0b0b0f"
            strokeWidth="2"
          />

          {/* Main Ergonomic Shell */}
          <path
            d="M 110 80 C 138 66, 174 82, 174 118 C 174 152, 146 172, 118 164 C 98 158, 92 134, 96 112 C 98 98, 102 84, 110 80 Z"
            fill="#1d1d25"
            stroke="#3d3d4c"
            strokeWidth="1.3"
          />

          {/* Subtle Anodized Plum Faceplate Accent */}
          <ellipse
            cx="142"
            cy="118"
            rx="23"
            ry="31"
            transform="rotate(14 142 118)"
            fill="#27203f"
            stroke="#544485"
            strokeWidth="1.1"
          />

          {/* Engraved acoustic detail line */}
          <path
            d="M 134 102 C 146 104, 152 118, 145 134"
            fill="none"
            stroke="rgba(255, 255, 255, 0.24)"
            strokeWidth="1.1"
            strokeLinecap="round"
          />

          {/* Optical PPG Sensor Window */}
          <rect
            x="105"
            y="112"
            width="10"
            height="18"
            rx="5"
            transform="rotate(12 110 121)"
            fill="#0a0a0e"
            stroke="#343442"
            strokeWidth="0.95"
          />
          <circle
            cx="110"
            cy="121"
            r="2.6"
            fill={ppgColor}
            className={tel.hr != null && !down ? "ppg-led" : ""}
          />
        </g>

        {/* Clean Engineering Callout Leaders */}
        <g>
          <line x1="98" y1="62" x2="54" y2="34" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1" />
          <text x="-8" y="28" className="leader-title">
            {tel.stim?.site ?? "cymba_left"}
          </text>
          <text x="-8" y="42" className="leader-sub">
            {stim
              ? `${tel.stim!.amp_mA.toFixed(1)} mA · ${tel.stim!.freq_Hz} Hz`
              : highImp
                ? `${tel.impedance_kohm?.toFixed(0)} kΩ (off)`
                : locked
                  ? "Output held"
                  : tel.impedance_kohm != null
                    ? `${tel.impedance_kohm.toFixed(1)} kΩ · Ready`
                    : "Electrode ready"}
          </text>

          <line x1="112" y1="130" x2="58" y2="188" stroke="rgba(255, 255, 255, 0.18)" strokeWidth="1" />
          <text x="-8" y="204" className="leader-title">
            PPG + IMU
          </text>
          <text x="-8" y="218" className="leader-sub">
            {down
              ? "Autonomous"
              : tel.link_ok
                ? `${tel.imu_g != null ? `${tel.imu_g.toFixed(2)} g` : "1.00 g"} · Link OK`
                : "Sensor link lost"}
          </text>
        </g>
      </svg>
    </div>
  );
}

export function VitalityRing({
  hr,
  baseline,
  state,
  stimAmp,
  hrAlert,
}: {
  hr: number | null;
  baseline: number | null;
  state: Telemetry["state"];
  stimAmp: number | null;
  hrAlert: boolean;
}) {
  const size = 216;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 88;
  const rInner = 74;

  // Symmetrical 280-degree dial open cleanly at 6 o'clock
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
    state === "locked" || state === "safe_mode" || hrAlert
      ? "#f05259"
      : "#f4f4f8";

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
    <div className="ring-wrap" aria-label="Heart rate and stimulation output dial">
      <svg viewBox={`0 0 ${size} ${size}`} className="ring-svg" aria-hidden="true">
        {ticks.map((t) => (
          <line
            key={t.idx}
            x1={t.p1.x}
            y1={t.p1.y}
            x2={t.p2.x}
            y2={t.p2.y}
            stroke={t.major ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)"}
            strokeWidth={t.major ? "1.2" : "0.9"}
            strokeLinecap="round"
          />
        ))}

        <path
          d={arcPath(rOuter, startDeg, startDeg + sweepDeg)}
          fill="none"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth="6.5"
          strokeLinecap="round"
        />

        <path
          d={arcPath(rInner, startDeg, startDeg + sweepDeg)}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {hr != null && (
          <path
            d={arcPath(rOuter, startDeg, hrEndDeg)}
            fill="none"
            stroke={outerColor}
            strokeWidth="6.5"
            strokeLinecap="round"
          />
        )}

        {stimAmp != null && (
          <path
            d={arcPath(rInner, startDeg, stimEndDeg)}
            fill="none"
            stroke="#9b82f6"
            strokeWidth="3.8"
            strokeLinecap="round"
          />
        )}

        {baseTickIn && baseTickOut && (
          <line
            x1={baseTickIn.x}
            y1={baseTickIn.y}
            x2={baseTickOut.x}
            y2={baseTickOut.y}
            stroke="rgba(255,255,255,0.55)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        )}

        {headPt && (
          <circle
            cx={headPt.x}
            cy={headPt.y}
            r="4.2"
            fill="#ffffff"
            stroke={outerColor}
            strokeWidth="2"
          />
        )}
      </svg>

      <div className="ring-center">
        <span className="ring-caption">Heart rate</span>
        <div className="ring-num-row">
          <span className={`ring-num ${hrAlert ? "alert" : ""}`}>
            {hr != null ? hr.toFixed(0) : "--"}
          </span>
          <span className="ring-unit">bpm</span>
        </div>
        <span className={`ring-delta ${hrAlert ? "bad" : ""}`}>
          {delta != null
            ? `${delta >= 0 ? "+" : ""}${delta} vs ${baseline?.toFixed(0)} base`
            : "Acquiring"}
        </span>
      </div>
    </div>
  );
}
