import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface AutocompleteProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  suggestions: Array<{
    value: string;
    label: string;
    description?: string;
    data?: any;
  }>;
  onSelect?: (item: any) => void;
  className?: string;
  disabled?: boolean;
}

export function Autocomplete({
  value,
  onValueChange,
  placeholder = "Search...",
  suggestions,
  onSelect,
  className,
  disabled = false,
}: AutocompleteProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (selectedValue: string) => {
    const selectedItem = suggestions.find(item => item.value === selectedValue);
    if (selectedItem) {
      onValueChange(selectedValue);
      if (onSelect) {
        onSelect(selectedItem);
      }
    }
    setOpen(false);
  };

  const filteredSuggestions = suggestions.filter(suggestion =>
    suggestion.label.toLowerCase().includes(value.toLowerCase()) ||
    suggestion.value.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder={placeholder}
            value={value}
            onValueChange={onValueChange}
          />
          <CommandList>
            <CommandEmpty>No items found.</CommandEmpty>
            <CommandGroup>
              {filteredSuggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion.value}
                  value={suggestion.value}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === suggestion.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{suggestion.label}</span>
                    {suggestion.description && (
                      <span className="text-sm text-muted-foreground">
                        {suggestion.description}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface AutocompleteInputProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  suggestions: Array<{
    value: string;
    label: string;
    description?: string;
    data?: any;
  }>;
  onSelect?: (item: any) => void;
  className?: string;
  disabled?: boolean;
}

export function AutocompleteInput({
  value,
  onValueChange,
  placeholder = "Type to search...",
  suggestions,
  onSelect,
  className,
  disabled = false,
}: AutocompleteInputProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value);

  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    onValueChange(newValue);
    setOpen(newValue.length > 0);
  };

  const handleSelect = (selectedValue: string) => {
    const selectedItem = suggestions.find(item => item.value === selectedValue);
    if (selectedItem) {
      setInputValue(selectedItem.label);
      onValueChange(selectedItem.value);
      if (onSelect) {
        onSelect(selectedItem);
      }
    }
    setOpen(false);
  };

  const filteredSuggestions = suggestions.filter(suggestion =>
    suggestion.label.toLowerCase().includes(inputValue.toLowerCase()) ||
    suggestion.value.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={placeholder}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              className
            )}
            disabled={disabled}
            autoComplete="off"
          />
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandList>
              {filteredSuggestions.length === 0 ? (
                <CommandEmpty>No items found.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredSuggestions.slice(0, 10).map((suggestion) => (
                    <CommandItem
                      key={suggestion.value}
                      value={suggestion.value}
                      onSelect={handleSelect}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{suggestion.label}</span>
                        {suggestion.description && (
                          <span className="text-sm text-muted-foreground">
                            {suggestion.description}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
