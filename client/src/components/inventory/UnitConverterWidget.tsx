import { useState } from "react";
import { Calculator, ArrowRightLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UNIT_DETAILS, convertUnits, CONVERSION_CATEGORIES } from "@/lib/conversions";

export function UnitConverterWidget() {
  const [fromAmount, setFromAmount] = useState<string>('');
  const [toAmount, setToAmount] = useState<string>('');
  const [fromUnit, setFromUnit] = useState<string>('');
  const [toUnit, setToUnit] = useState<string>('');
  const { toast } = useToast();

  const handleFromAmountChange = (value: string) => {
    setFromAmount(value);
    if (fromUnit && toUnit && value) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        const converted = convertUnits(numValue, fromUnit, toUnit);
        if (converted !== null) {
          setToAmount(converted.toFixed(4));
        }
      }
    } else {
      setToAmount('');
    }
  };

  const handleToAmountChange = (value: string) => {
    setToAmount(value);
    if (fromUnit && toUnit && value) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        const converted = convertUnits(numValue, toUnit, fromUnit);
        if (converted !== null) {
          setFromAmount(converted.toFixed(4));
        }
      }
    } else {
      setFromAmount('');
    }
  };

  const swapUnits = () => {
    const tempUnit = fromUnit;
    setFromUnit(toUnit);
    setToUnit(tempUnit);
    const tempAmount = fromAmount;
    setFromAmount(toAmount);
    setToAmount(tempAmount);
  };

  const clearAll = () => {
    setFromAmount('');
    setToAmount('');
    setFromUnit('');
    setToUnit('');
  };

  // Group units by category
  const unitsByCategory = Object.entries(UNIT_DETAILS).reduce((acc, [key, detail]) => {
    const category = detail.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push({ value: key, label: detail.label });
    return acc;
  }, {} as Record<string, { value: string; label: string }[]>);

  const getUnitLabel = (key: string) => UNIT_DETAILS[key]?.label || key;

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          Unit Converter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Unit Selectors */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium">From Unit</Label>
            <Select value={fromUnit} onValueChange={setFromUnit}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(unitsByCategory).map(([category, unitList]) => (
                  <div key={category}>
                    <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase bg-muted/50">
                      {category}
                    </div>
                    {unitList.map((unit) => (
                      <SelectItem key={`from-${unit.value}`} value={unit.value}>
                        <span className="text-xs">{unit.label}</span>
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">To Unit</Label>
            <Select value={toUnit} onValueChange={setToUnit}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(unitsByCategory).map(([category, unitList]) => (
                  <div key={category}>
                    <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase bg-muted/50">
                      {category}
                    </div>
                    {unitList.map((unit) => (
                      <SelectItem key={`to-${unit.value}`} value={unit.value}>
                        <span className="text-xs">{unit.label}</span>
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {fromUnit && toUnit && (
          <>
            {/* Amount Inputs */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Amount ({getUnitLabel(fromUnit)})</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={fromAmount}
                onChange={(e) => handleFromAmountChange(e.target.value)}
                className="h-8 text-xs font-semibold"
              />
            </div>

            <div className="flex justify-center -my-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={swapUnits}
                className="h-8 w-8 rounded-full hover:bg-muted"
                title="Swap Units"
              >
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground rotate-90" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Result ({getUnitLabel(toUnit)})</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={toAmount}
                onChange={(e) => handleToAmountChange(e.target.value)}
                className="h-8 text-xs font-semibold bg-muted/30"
              />
            </div>

            {/* Conversion Factor Info */}
            {convertUnits(1, fromUnit, toUnit) !== null ? (
              <div className="text-[10px] text-muted-foreground text-center p-2 bg-muted/30 rounded border border-dashed">
                1 {fromUnit} = {convertUnits(1, fromUnit, toUnit)?.toLocaleString(undefined, { maximumFractionDigits: 6 })} {toUnit}
              </div>
            ) : (
              <div className="text-[10px] text-destructive text-center p-2 bg-destructive/10 rounded">
                Cannot convert between different categories
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              className="w-full h-8 text-xs"
            >
              Clear
            </Button>
          </>
        )}

        {(!fromUnit || !toUnit) && (
          <div className="text-center py-8">
            <Calculator className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-[11px] text-muted-foreground">
              Select units to start converting
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
