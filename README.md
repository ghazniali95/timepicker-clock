# react-analog-time-picker

A draggable **analog clock time picker** for React. Drag the short hand for the
hour and the long hand for the minutes — the chosen time shows above the dial in
AM/PM (or 24-hour).

- 🪶 **Zero dependencies** — just React. No date library, no CSS file to import.
- 🎨 **Fully themeable** — every colour (hands, face, numerals, ticks, accent) is a prop.
- 📏 **Any size** — one `size` prop scales the whole clock.
- 👆 **Mouse + touch** — one pointer code path, the whole hand is grabbable.
- 🔢 **TypeScript** types included.

## Install

```bash
npm install react-analog-time-picker
```

> `react` and `react-dom` (v17+) are peer dependencies — you already have them.

## Usage

```tsx
import { useState } from 'react';
import { AnalogTimePicker } from 'react-analog-time-picker';

export function Example() {
  const [time, setTime] = useState<Date | null>(null);

  return (
    <AnalogTimePicker
      value={time}
      onChange={setTime}
    />
  );
}
```

`onChange` fires with a `Date` every time the hands or AM/PM change. You can also
leave it **uncontrolled** — omit `value` and just read `onChange`, optionally
seeding the starting time with `defaultValue`.

## Changing the colours

There is **no command** — the colours are just props. Pass a `colors` object and
override only the parts you want; anything you leave out keeps its default.

```tsx
<AnalogTimePicker
  colors={{
    hourHand: '#000000',   // the short hand  (default: near-black)
    minuteHand: '#dd7327', // the long hand   (default: orange)
    accent: '#dd7327',     // active AM/PM button + hint highlight
    face: '#faf7f3',       // the dial background
    numerals: '#1f2937',   // the 1–12 numbers
  }}
/>
```

Common case — one brand colour on the minute hand, black on the hour hand (the
default look):

```tsx
<AnalogTimePicker colors={{ hourHand: '#000', minuteHand: '#dd7327' }} />
```

### All colour keys

| Key          | What it paints                         | Default     |
| ------------ | -------------------------------------- | ----------- |
| `hourHand`   | the short (hour) hand                  | `#1f2937`   |
| `minuteHand` | the long (minute) hand                 | `#dd7327`   |
| `accent`     | active AM/PM button + hint highlight   | `minuteHand`|
| `face`       | clock face fill                        | `#f6f1ec`   |
| `faceBorder` | ring around the face                   | `#e5e0da`   |
| `numerals`   | the 1–12 numerals                      | `#1f2937`   |
| `majorTick`  | the 5-minute ticks                     | `#9aa0a6`   |
| `minorTick`  | the single-minute ticks                | `#c9c9cf`   |
| `centerPin`  | the centre dot                         | `hourHand`  |
| `readout`    | the big time text                      | `#1f2937`   |

## Changing the size

Also just a prop — `size` is the clock's width and height in pixels:

```tsx
<AnalogTimePicker size={360} />   {/* bigger */}
<AnalogTimePicker size={200} />   {/* smaller */}
```

The SVG is responsive (`max-width: 100%`), so it also shrinks to fit a narrow
container on its own.

## Props

| Prop           | Type                              | Default                     | Description                                              |
| -------------- | --------------------------------- | --------------------------- | ------------------------------------------------------- |
| `value`        | `Date \| null`                    | —                           | Controlled value. Pair with `onChange`.                 |
| `defaultValue` | `Date \| null`                    | next quarter-hour           | Initial value when uncontrolled.                        |
| `onChange`     | `(value: Date) => void`           | —                           | Fires with the chosen time.                             |
| `size`         | `number`                          | `280`                       | Clock width/height in px.                               |
| `minuteStep`   | `number`                          | `1`                         | Snap the minute hand to a multiple of this.             |
| `showReadout`  | `boolean`                         | `true`                      | Show the big time read-out above the dial.              |
| `showMeridiem` | `boolean`                         | `true`                      | Show the AM/PM toggle (ignored when `use24Hour`).       |
| `use24Hour`    | `boolean`                         | `false`                     | Format the read-out as 24-hour and hide AM/PM.          |
| `hint`         | `boolean \| ReactNode`            | `false`                     | Show a "drag the hands" hint, or supply your own node.  |
| `colors`       | `AnalogTimePickerColors`          | see above                   | Per-part colour overrides.                              |
| `className`    | `string`                          | —                           | Class on the outer wrapper.                             |
| `style`        | `CSSProperties`                   | —                           | Inline styles on the outer wrapper.                     |
| `ariaLabel`    | `string`                          | `"Drag the hands to set a time"` | Accessible label for the SVG.                     |

## License

MIT
