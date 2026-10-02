import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

/**
 * AnalogTimePicker — a draggable analog clock for picking a time.
 *
 * Dependency-free (React only): no date library, no CSS framework, no global
 * stylesheet to import. Everything is drawn in a single inline-styled SVG, so
 * dropping it into any React app Just Works, and every colour and the overall
 * size are plain props.
 *
 * Interaction mirrors a real watch: drag the SHORT hand to set the hour and the
 * LONG hand to set the minute. One pointer code path covers mouse and touch, and
 * the whole hand is a grab target (a wide transparent overlay) so there are no
 * fiddly tip handles.
 *
 * The chosen time is shown above the dial in AM/PM (or 24-hour) and reported to
 * the parent through `onChange`.
 */

/* The clock is drawn in a fixed 280-unit coordinate space and scaled to `size`
 * via the SVG width/height, so every geometry constant below stays valid at any
 * rendered size. */
const VIEW = 280;
const CX = 140;
const CY = 140;
const RADIUS = 130;
const HOUR_LEN = 60;
const MIN_LEN = 95;

export interface AnalogTimePickerColors {
  /** The short (hour) hand. Default: `#1f2937` (near-black). */
  hourHand?: string;
  /** The long (minute) hand. Default: `#dd7327` (warm orange). */
  minuteHand?: string;
  /**
   * The highlight colour for the active AM/PM button (and the inline hint's
   * "long hand" word). Defaults to whatever `minuteHand` is, so a single colour
   * prop themes the accent everywhere.
   */
  accent?: string;
  /** The clock face fill. Default: `#f6f1ec`. */
  face?: string;
  /** The ring around the face. Default: `#e5e0da`. */
  faceBorder?: string;
  /** The 1–12 numerals. Default: `#1f2937`. */
  numerals?: string;
  /** The longer 5-minute ticks. Default: `#9aa0a6`. */
  majorTick?: string;
  /** The single-minute ticks. Default: `#c9c9cf`. */
  minorTick?: string;
  /** The centre pin. Default: matches `hourHand`. */
  centerPin?: string;
  /** The big time read-out text. Default: `#1f2937`. */
  readout?: string;
}

export interface AnalogTimePickerProps {
  /** Controlled value. Provide together with `onChange`. */
  value?: Date | null;
  /** Initial value when uncontrolled. Defaults to the next quarter-hour. */
  defaultValue?: Date | null;
  /** Fires with the chosen `Date` whenever the hands or AM/PM change. */
  onChange?: (value: Date) => void;

  /** Rendered width/height of the clock in pixels. Default: `280`. */
  size?: number;
  /** Snap the minute hand to a multiple of this. Default: `1`. */
  minuteStep?: number;
  /** Show the big time read-out above the dial. Default: `true`. */
  showReadout?: boolean;
  /** Show the AM/PM toggle. Ignored when `use24Hour`. Default: `true`. */
  showMeridiem?: boolean;
  /** Format the read-out as 24-hour and hide AM/PM. Default: `false`. */
  use24Hour?: boolean;
  /**
   * Show the "drag the short/long hand" hint, or supply your own node.
   * Default: `false` — the hands are self-evident on hover, so no text shows.
   */
  hint?: boolean | ReactNode;

  /** Per-part colour overrides. Anything omitted uses the default. */
  colors?: AnalogTimePickerColors;

  /** Extra class on the outer wrapper. */
  className?: string;
  /** Inline styles merged onto the outer wrapper. */
  style?: CSSProperties;
  /** Accessible label for the SVG. */
  ariaLabel?: string;
}

const DEFAULT_COLORS: Required<Omit<AnalogTimePickerColors, 'accent' | 'centerPin'>> = {
  hourHand: '#1f2937',
  minuteHand: '#dd7327',
  face: '#f6f1ec',
  faceBorder: '#e5e0da',
  numerals: '#1f2937',
  majorTick: '#9aa0a6',
  minorTick: '#c9c9cf',
  readout: '#1f2937',
};

function polar(angleDeg: number, len: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + len * Math.cos(a), y: CY + len * Math.sin(a) };
}

/** The next quarter-hour after `from` — a sensible default to edit from. */
function nextQuarter(from: Date): Date {
  const d = new Date(from);
  d.setSeconds(0, 0);
  d.setMinutes(Math.ceil((d.getMinutes() + 1) / 15) * 15);
  return d;
}

interface HandState {
  hour12: number;
  minute: number;
  pm: boolean;
}

function toHandState(date: Date): HandState {
  const h24 = date.getHours();
  return { hour12: ((h24 + 11) % 12) + 1, minute: date.getMinutes(), pm: h24 >= 12 };
}

export function AnalogTimePicker({
  value,
  defaultValue,
  onChange,
  size = VIEW,
  minuteStep = 1,
  showReadout = true,
  showMeridiem = true,
  use24Hour = false,
  hint = false,
  colors,
  className,
  style,
  ariaLabel = 'Drag the hands to set a time',
}: AnalogTimePickerProps) {
  const c = { ...DEFAULT_COLORS, ...colors };
  const accent = colors?.accent ?? c.minuteHand;
  const centerPin = colors?.centerPin ?? c.hourHand;

  const isControlled = value !== undefined;

  const [hands, setHands] = useState<HandState>(() =>
    toHandState(value ?? defaultValue ?? nextQuarter(new Date())),
  );
  const { hour12, minute, pm } = hands;

  const [dragging, setDragging] = useState<null | 'hour' | 'minute'>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const chosen = useMemo(() => {
    let h = hour12 % 12;
    if (pm) h += 12;
    const d = new Date();
    d.setHours(h, minute, 0, 0);
    return d;
  }, [hour12, minute, pm]);

  // Keep a controlled `value` in sync, but never yank the dial mid-drag, and
  // skip when it already matches so a parent that mirrors onChange can't loop.
  const lastReported = useRef<number | null>(null);
  useEffect(() => {
    if (!isControlled || value == null || dragging) return;
    if (value.getHours() === chosen.getHours() && value.getMinutes() === chosen.getMinutes()) return;
    lastReported.current = new Date().setHours(value.getHours(), value.getMinutes(), 0, 0);
    setHands(toHandState(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isControlled]);

  // Report selection up, de-duped so an unchanged minute never re-fires.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(() => {
    const t = chosen.getTime();
    if (lastReported.current === t) return;
    lastReported.current = t;
    onChangeRef.current?.(chosen);
  }, [chosen]);

  const snap = useCallback(
    (m: number) => {
      if (minuteStep <= 1) return m % 60;
      return (Math.round(m / minuteStep) * minuteStep) % 60;
    },
    [minuteStep],
  );

  // One pointer path for mouse + touch; listeners live on window so a fast drag
  // that leaves the SVG keeps tracking until release.
  useEffect(() => {
    if (!dragging) return;

    const angleFrom = (e: PointerEvent) => {
      const svg = svgRef.current;
      if (!svg) return 0;
      const rect = svg.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (VIEW / rect.width) - CX;
      const y = (e.clientY - rect.top) * (VIEW / rect.height) - CY;
      let deg = (Math.atan2(y, x) * 180) / Math.PI + 90;
      if (deg < 0) deg += 360;
      return deg;
    };

    const move = (e: PointerEvent) => {
      const deg = angleFrom(e);
      if (dragging === 'hour') {
        const h = Math.round(deg / 30) % 12;
        setHands((prev) => ({ ...prev, hour12: h === 0 ? 12 : h }));
      } else {
        setHands((prev) => ({ ...prev, minute: snap(Math.round(deg / 6)) }));
      }
    };
    const up = () => setDragging(null);

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [dragging, snap]);

  const hourAngle = (hour12 % 12) * 30 + (minute / 60) * 30;
  const minAngle = minute * 6;
  const hp = polar(hourAngle, HOUR_LEN);
  const mp = polar(minAngle, MIN_LEN);

  const readout = use24Hour
    ? `${String(pm ? (hour12 % 12) + 12 : hour12 % 12).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    : `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gap: 12,
        justifyItems: 'center',
        fontFamily: 'inherit',
        ...style,
      }}
    >
      {(showReadout || (showMeridiem && !use24Hour)) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {showReadout && (
            <span
              style={{
                fontSize: 36,
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
                color: c.readout,
                lineHeight: 1,
              }}
            >
              {readout}
              {use24Hour ? null : <span style={{ fontSize: 18, marginLeft: 6 }}>{pm ? 'PM' : 'AM'}</span>}
            </span>
          )}

          {showMeridiem && !use24Hour && (
            <span
              style={{
                display: 'inline-flex',
                overflow: 'hidden',
                borderRadius: 12,
                border: `1px solid ${c.faceBorder}`,
              }}
            >
              {(['AM', 'PM'] as const).map((label) => {
                const active = (label === 'PM') === pm;
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setHands((prev) => ({ ...prev, pm: label === 'PM' }))}
                    style={{
                      padding: '8px 12px',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: 'none',
                      transition: 'background-color 150ms, color 150ms',
                      background: active ? accent : '#ffffff',
                      color: active ? '#ffffff' : '#6b7280',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </span>
          )}
        </div>
      )}

      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        style={{ maxWidth: '100%', touchAction: 'none', userSelect: 'none' }}
        aria-label={ariaLabel}
      >
        <circle cx={CX} cy={CY} r={RADIUS} fill={c.face} stroke={c.faceBorder} strokeWidth={2} />

        {/* Minute ticks — every 5th is longer/darker. */}
        {Array.from({ length: 60 }, (_, i) => {
          const major = i % 5 === 0;
          const p1 = polar(i * 6, major ? 118 : 123);
          const p2 = polar(i * 6, 128);
          return (
            <line
              key={i}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={major ? c.majorTick : c.minorTick}
              strokeWidth={major ? 3 : 2}
            />
          );
        })}

        {/* Numerals. */}
        {Array.from({ length: 12 }, (_, i) => {
          const n = i + 1;
          const p = polar(n * 30, 100);
          return (
            <text
              key={n}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill={c.numerals}
              style={{ fontSize: 15, fontWeight: 700 }}
            >
              {n}
            </text>
          );
        })}

        {/* Hour hand + wide transparent grab overlay. */}
        <line x1={CX} y1={CY} x2={hp.x} y2={hp.y} stroke={c.hourHand} strokeWidth={7} strokeLinecap="round" />
        <line
          x1={CX}
          y1={CY}
          x2={hp.x}
          y2={hp.y}
          stroke="transparent"
          strokeWidth={26}
          strokeLinecap="round"
          style={{ cursor: dragging === 'hour' ? 'grabbing' : 'grab' }}
          onPointerDown={(e) => {
            e.preventDefault();
            setDragging('hour');
          }}
        />

        {/* Minute hand + grab overlay. */}
        <line x1={CX} y1={CY} x2={mp.x} y2={mp.y} stroke={c.minuteHand} strokeWidth={5} strokeLinecap="round" />
        <line
          x1={CX}
          y1={CY}
          x2={mp.x}
          y2={mp.y}
          stroke="transparent"
          strokeWidth={26}
          strokeLinecap="round"
          style={{ cursor: dragging === 'minute' ? 'grabbing' : 'grab' }}
          onPointerDown={(e) => {
            e.preventDefault();
            setDragging('minute');
          }}
        />

        {/* Centre pin — the one dot a real watch face keeps. */}
        <circle cx={CX} cy={CY} r={7} fill="#fff" />
        <circle cx={CX} cy={CY} r={4} fill={centerPin} />
      </svg>

      {hint === true ? (
        <p style={{ margin: 0, textAlign: 'center', fontSize: 12, color: '#6b7280' }}>
          Drag the <b>short hand</b> for the hour and the{' '}
          <b style={{ color: accent }}>long hand</b> for minutes.
        </p>
      ) : hint ? (
        hint
      ) : null}
    </div>
  );
}

export default AnalogTimePicker;
