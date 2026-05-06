import { RotateCcw } from "lucide-react";

interface SpeedControlProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const DEFAULT_SPEED = 1;

export default function SpeedControl({
  value,
  onChange,
  disabled,
}: SpeedControlProps) {
  const isDefault = Math.abs(value - DEFAULT_SPEED) < 0.001;
  return (
    <div
      className="inline-flex items-center gap-2"
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <span className="text-[0.7rem] text-muted-foreground">speed</span>
      <input
        type="range"
        min={0.25}
        max={4}
        step={0.05}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-20 h-4 cursor-pointer appearance-none bg-transparent
          [&::-webkit-slider-runnable-track]:h-0.5 [&::-webkit-slider-runnable-track]:bg-border [&::-webkit-slider-runnable-track]:rounded-sm
          [&::-moz-range-track]:h-0.5 [&::-moz-range-track]:bg-border [&::-moz-range-track]:rounded-sm
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:-mt-[5px] [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-none
          [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none"
      />
      <span className="text-[0.7rem] font-mono text-foreground min-w-[32px] text-right">
        {value.toFixed(2)}×
      </span>
      <button
        type="button"
        onClick={() => onChange(DEFAULT_SPEED)}
        disabled={disabled || isDefault}
        title="Reset speed to 1.00×"
        aria-label="Reset speed"
        className="size-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-[opacity,color,background-color] cursor-pointer disabled:opacity-0 disabled:pointer-events-none"
      >
        <RotateCcw className="size-3" />
      </button>
    </div>
  );
}
