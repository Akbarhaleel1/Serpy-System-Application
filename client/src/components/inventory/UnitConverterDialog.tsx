import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, ArrowRightLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UNIT_DETAILS, convertUnits } from "@/lib/conversions";

interface UnitConverterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnitConverterDialog({ open, onOpenChange }: UnitConverterDialogProps) {
  const [fromUnit, setFromUnit] = useState("");
  const [toUnit, setToUnit] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [result, setResult] = useState("");
  const { toast } = useToast();

  const performConversion = () => {
    if (!fromUnit || !toUnit || !inputValue) return;

    const value = parseFloat(inputValue);
    if (isNaN(value)) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid number",
        variant: "destructive",
      });
      return;
    }

    const convertedValue = convertUnits(value, fromUnit, toUnit);

    if (convertedValue !== null) {
      setResult(`${value} ${fromUnit} = ${convertedValue.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${toUnit}`);
      toast({
        title: "Conversion Complete",
        description: "Unit conversion calculated",
      });
    } else {
      toast({
        title: "Conversion Error",
        description: "Units must be of the same category (e.g., both mass, both length)",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFromUnit("");
    setToUnit("");
    setInputValue("");
    setResult("");
  };

  const unitOptions = Object.entries(UNIT_DETAILS).map(([key, detail]) => ({
    value: key,
    label: detail.label,
    category: detail.category
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Unit Converter
          </DialogTitle>
          <DialogDescription>
            Convert between different units of measurement for your inventory items.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Conversion Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="fromUnit">From Unit</Label>
                <Select value={fromUnit} onValueChange={setFromUnit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {unitOptions.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inputValue">Value</Label>
                <Input
                  id="inputValue"
                  type="number"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Enter value"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="toUnit">To Unit</Label>
                <Select value={toUnit} onValueChange={setToUnit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {unitOptions.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-center">
              <Button onClick={performConversion} className="gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                Convert
              </Button>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className="p-4 bg-muted rounded-lg">
              <Label className="text-sm font-medium">Result</Label>
              <p className="text-lg font-semibold mt-1">{result}</p>
            </div>
          )}

          {/* Common Conversions */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Common Conversions</Label>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div>1 kg = 1000 g</div>
              <div>1 lb = 16 oz</div>
              <div>1 m = 100 cm</div>
              <div>1 ft = 12 in</div>
              <div>1 L = 1000 mL</div>
              <div>1 gal = 4 qt</div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetForm}>
            Reset
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}