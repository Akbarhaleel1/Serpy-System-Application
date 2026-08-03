export const CONVERSION_CATEGORIES = {
    WEIGHT: 'weight',
    LENGTH: 'length',
    VOLUME: 'volume',
    AREA: 'area',
};

export const UNIT_DETAILS: Record<string, { label: string; factor: number; category: string }> = {
    // Weight (Base: Kilogram)
    kg: { label: 'Kilogram (kg)', factor: 1, category: CONVERSION_CATEGORIES.WEIGHT },
    g: { label: 'Gram (g)', factor: 0.001, category: CONVERSION_CATEGORIES.WEIGHT },
    lb: { label: 'Pound (lb)', factor: 0.453592, category: CONVERSION_CATEGORIES.WEIGHT },
    oz: { label: 'Ounce (oz)', factor: 0.0283495, category: CONVERSION_CATEGORIES.WEIGHT },
    tons: { label: 'Metric Ton (t)', factor: 1000, category: CONVERSION_CATEGORIES.WEIGHT },

    // Length (Base: Meter)
    m: { label: 'Meter (m)', factor: 1, category: CONVERSION_CATEGORIES.LENGTH },
    cm: { label: 'Centimeter (cm)', factor: 0.01, category: CONVERSION_CATEGORIES.LENGTH },
    mm: { label: 'Millimeter (mm)', factor: 0.001, category: CONVERSION_CATEGORIES.LENGTH },
    in: { label: 'Inch (in)', factor: 0.0254, category: CONVERSION_CATEGORIES.LENGTH },
    ft: { label: 'Foot (ft)', factor: 0.3048, category: CONVERSION_CATEGORIES.LENGTH },
    yd: { label: 'Yard (yd)', factor: 0.9144, category: CONVERSION_CATEGORIES.LENGTH },

    // Volume (Base: Liter)
    l: { label: 'Liter (L)', factor: 1, category: CONVERSION_CATEGORIES.VOLUME },
    ml: { label: 'Milliliter (mL)', factor: 0.001, category: CONVERSION_CATEGORIES.VOLUME },
    gal: { label: 'Gallon (gal)', factor: 3.78541, category: CONVERSION_CATEGORIES.VOLUME },
    qt: { label: 'Quart (qt)', factor: 0.946353, category: CONVERSION_CATEGORIES.VOLUME },
    pt: { label: 'Pint (pt)', factor: 0.473176, category: CONVERSION_CATEGORIES.VOLUME },

    // Area (Base: Square Meter)
    sqm: { label: 'Square Meter (sq m)', factor: 1, category: CONVERSION_CATEGORIES.AREA },
    sqft: { label: 'Square Foot (sq ft)', factor: 0.092903, category: CONVERSION_CATEGORIES.AREA },
    sqin: { label: 'Square Inch (sq in)', factor: 0.00064516, category: CONVERSION_CATEGORIES.AREA },
};

export function convertUnits(value: number, from: string, to: string): number | null {
    const fromUnit = UNIT_DETAILS[from.toLowerCase()];
    const toUnit = UNIT_DETAILS[to.toLowerCase()];

    if (!fromUnit || !toUnit || fromUnit.category !== toUnit.category) {
        return null;
    }

    // Value -> Base -> Target
    const valueInBase = value * fromUnit.factor;
    return valueInBase / toUnit.factor;
}
