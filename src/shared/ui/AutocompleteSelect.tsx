import { useEffect, useMemo, useState } from "react";

interface AutocompleteOption {
  id: string;
  label: string;
  searchText?: string;
}

interface AutocompleteSelectProps {
  value: string;
  onChange: (nextValue: string) => void;
  options: AutocompleteOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxVisibleOptions?: number;
}

export function AutocompleteSelect({
  value,
  onChange,
  options,
  placeholder = "Buscar...",
  disabled = false,
  className = "",
  maxVisibleOptions = 20
}: AutocompleteSelectProps) {
  const selectedOption = useMemo(
    () => options.find((option) => option.id === value),
    [options, value]
  );
  const [query, setQuery] = useState(selectedOption?.label ?? "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(selectedOption?.label ?? "");
  }, [selectedOption?.label]);

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options.slice(0, maxVisibleOptions);
    return options
      .filter((option) =>
        `${option.label} ${option.searchText ?? ""}`.toLowerCase().includes(normalized)
      )
      .slice(0, maxVisibleOptions);
  }, [maxVisibleOptions, options, query]);

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          onChange("");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 180);
        }}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
      />
      {open && !disabled ? (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] shadow-lg">
          {filteredOptions.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[var(--color-on-surface-variant)]">
              Sin resultados.
            </p>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={() => {
                  onChange(option.id);
                  setQuery(option.label);
                  setOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-[var(--color-on-surface)] transition hover:bg-[var(--color-surface-container-highest)]"
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
