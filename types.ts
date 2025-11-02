export interface UserInput {
  weekdayCommuteKm: number;
  weekendTripKm: number;
  estimatedAnnualKm: number;
  priceGasoline: number;
  priceDiesel: number;
  priceLPG: number;
  priceElectricity: number;
  purchaseGasoline: number;
  purchaseDiesel: number;
  purchaseLPG: number;
  purchaseHEV: number;
  purchasePHEV: number;
  years: number;
}

export interface FuelConsumptionData {
  type: 'Gasolina' | 'Diésel' | 'GLP' | 'Híbrido (HEV)' | 'Híbrido Enchufable (PHEV)';
  fuelType: 'gasolina' | 'diesel' | 'glp' | 'hibrido' | 'phev';
  cityConsumptionLiters: number;
  highwayConsumptionLiters: number;
  cityConsumptionKwh: number;
}

export interface CalculationResult {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  totalCost: number;
  annualFuelCost: number;
  amortizationYears: number | null;
  purchasePrice: number;
  annualKm: number;
}