
import { GoogleGenAI, Type } from "@google/genai";
import { CalculationResult, FuelConsumptionData } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function getFuelConsumptionData(): Promise<FuelConsumptionData[]> {
  const prompt = `Actúa como un experto en automoción. Necesito datos de consumo medio para un coche familiar compacto (segmento C, como un SUV o sedán). Proporciona los datos en formato JSON, siguiendo el esquema especificado. Los valores deben ser promedios realistas para el año 2024 en Europa.

- **Gasolina**: Consumo en ciudad y autopista en L/100km.
- **Diésel**: Consumo en ciudad y autopista en L/100km.
- **GLP (Autogas)**: Consumo en ciudad y autopista en L/100km. El consumo de GLP es ligeramente superior al de gasolina, tenlo en cuenta.
- **Híbrido no enchufable (HEV)**: Consumo en ciudad y autopista en L/100km. El ahorro es mayor en ciudad.
- **Híbrido enchufable (PHEV)**: Consumo en ciudad y autopista. Para la ciudad, asume que la mayoría de los trayectos cortos se hacen en modo eléctrico, así que proporciona un consumo combinado de kWh/100km y un consumo muy bajo de L/100km. Para la autopista, asume que la batería se ha agotado y funciona como un híbrido normal.

Devuelve solo el objeto JSON.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, description: "Tipo de vehículo: 'Gasolina', 'Diésel', 'GLP', 'Híbrido (HEV)', 'Híbrido Enchufable (PHEV)'" },
            fuelType: { type: Type.STRING, description: "Identificador: 'gasolina', 'diesel', 'glp', 'hibrido', 'phev'" },
            cityConsumptionLiters: { type: Type.NUMBER, description: "Consumo en ciudad en L/100km. Poner un valor bajo (ej. 1.5) para PHEV." },
            highwayConsumptionLiters: { type: Type.NUMBER, description: "Consumo en autopista en L/100km." },
            cityConsumptionKwh: { type: Type.NUMBER, description: "Consumo eléctrico en ciudad en kWh/100km. Solo para PHEV. Poner 0 para los demás." }
          },
          required: ["type", "fuelType", "cityConsumptionLiters", "highwayConsumptionLiters", "cityConsumptionKwh"],
        },
      },
    },
  });

  try {
    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error parsing Gemini JSON response:", error);
    throw new Error("No se pudieron obtener los datos de consumo. Inténtalo de nuevo.");
  }
}

export async function getRecommendation(results: CalculationResult[]): Promise<string> {
    const bestOption = results.reduce((prev, current) => (prev.totalCost < current.totalCost) ? prev : current);

    const prompt = `Actúa como un asesor experto en compra de vehículos. Basado en los siguientes resultados de cálculo para un periodo de ${results[0].annualKm > 0 ? results[0].purchasePrice / (bestOption.annualFuelCost || 1) : 'varios'} años, escribe una recomendación breve, amigable y útil en español.

Datos:
${results.map(r => 
`- **${r.name}**: 
  - Coste total: ${Math.round(r.totalCost)} €
  - Coste anual de combustible: ${Math.round(r.annualFuelCost)} €
  - Años para amortizar (vs gasolina): ${r.amortizationYears ? r.amortizationYears.toFixed(1) + ' años' : 'N/A'}
`).join('\n')}

La opción más barata en total es el **${bestOption.name}**.

Por favor, redacta una conclusión concisa y fácil de entender para un usuario no experto, explicando por qué la opción recomendada es la mejor en su caso y mencionando el ahorro o el tiempo de amortización si es relevante.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    return response.text;
}
