
import React, { useState, useCallback } from 'react';
import { UserInput, CalculationResult, FuelConsumptionData } from './types';
import { getFuelConsumptionData, getRecommendation } from './services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { GasolineIcon, DieselIcon, LPGIcon, HybridIcon, PHEVIcon } from './components/icons';

type InputProps = {
    label: string;
    name: keyof UserInput;
    value: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    step?: number;
    unit?: string;
};

const InputField: React.FC<InputProps> = ({ label, name, value, onChange, step = 1, unit }) => (
    <div className="flex flex-col">
        <label htmlFor={name} className="mb-1 text-sm font-medium text-slate-600">{label}</label>
        <div className="flex items-center">
            <input
                type="number"
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                step={step}
                min="0"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
            {unit && <span className="ml-2 text-slate-500">{unit}</span>}
        </div>
    </div>
);

const ResultsCard: React.FC<{ result: CalculationResult; isBest: boolean }> = ({ result, isBest }) => (
    <div className={`relative flex flex-col p-4 border rounded-lg shadow-sm transition-all duration-300 ${isBest ? 'bg-sky-50 border-sky-500 scale-105' : 'bg-white border-slate-200'}`}>
        {isBest && <div className="absolute top-0 right-0 px-2 py-1 text-xs font-bold text-white bg-sky-500 rounded-bl-lg rounded-tr-md">Mejor Opción</div>}
        <div className="flex items-center mb-3">
            <result.icon className={`w-8 h-8 mr-3 ${isBest ? 'text-sky-600' : 'text-slate-500'}`} />
            <h3 className="text-xl font-bold text-slate-800">{result.name}</h3>
        </div>
        <div className="space-y-2 text-sm">
            <p className="flex justify-between"><span>Coste total ({result.purchasePrice.toString().length > 1 ? (result.purchasePrice / (result.totalCost - result.purchasePrice)).toFixed(1) : 0} años):</span> <span className="font-semibold">{Math.round(result.totalCost).toLocaleString('es-ES')} €</span></p>
            <p className="flex justify-between"><span>Coste combustible/año:</span> <span className="font-semibold">{Math.round(result.annualFuelCost).toLocaleString('es-ES')} €</span></p>
            {result.amortizationYears !== null && (
                 <p className="flex justify-between"><span>Amortización vs Gasolina:</span> <span className="font-semibold">{result.amortizationYears.toFixed(1)} años</span></p>
            )}
        </div>
    </div>
);

const App: React.FC = () => {
    const [userInput, setUserInput] = useState<UserInput>({
        weekdayCity: 20,
        weekdayHighway: 15,
        weekendCity: 50,
        weekendHighway: 100,
        priceGasoline: 1.6,
        priceDiesel: 1.5,
        priceLPG: 0.9,
        priceElectricity: 0.2,
        purchaseGasoline: 25000,
        purchaseDiesel: 27000,
        purchaseLPG: 26000,
        purchaseHEV: 30000,
        purchasePHEV: 35000,
        years: 7,
    });
    const [results, setResults] = useState<CalculationResult[] | null>(null);
    const [recommendation, setRecommendation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setUserInput(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setResults(null);
        setRecommendation(null);

        try {
            const consumptionData = await getFuelConsumptionData();
            
            const annualCityKm = (userInput.weekdayCity * 5 * 2 + userInput.weekendCity) * 52;
            const annualHighwayKm = (userInput.weekdayHighway * 5 * 2 + userInput.weekendHighway) * 52;
            const annualKm = annualCityKm + annualHighwayKm;

            const purchasePrices: { [key: string]: number } = {
                'gasolina': userInput.purchaseGasoline,
                'diesel': userInput.purchaseDiesel,
                'glp': userInput.purchaseLPG,
                'hibrido': userInput.purchaseHEV,
                'phev': userInput.purchasePHEV
            };
             const fuelPrices: { [key: string]: number } = {
                'gasolina': userInput.priceGasoline,
                'diesel': userInput.priceDiesel,
                'glp': userInput.priceLPG
            };
             const carIcons: { [key: string]: React.ComponentType<{ className?: string }> } = {
                'Gasolina': GasolineIcon,
                'Diésel': DieselIcon,
                'GLP': LPGIcon,
                'Híbrido (HEV)': HybridIcon,
                'Híbrido Enchufable (PHEV)': PHEVIcon
            };

            const calculatedResults = consumptionData.map(car => {
                let annualFuelCost = 0;
                if (car.fuelType === 'phev') {
                    const cityCost = (annualCityKm / 100) * car.cityConsumptionKwh * userInput.priceElectricity;
                    const cityFuelCost = (annualCityKm / 100) * car.cityConsumptionLiters * userInput.priceGasoline;
                    const highwayCost = (annualHighwayKm / 100) * car.highwayConsumptionLiters * userInput.priceGasoline;
                    annualFuelCost = cityCost + cityFuelCost + highwayCost;
                } else {
                    const cityCost = (annualCityKm / 100) * car.cityConsumptionLiters * fuelPrices[car.fuelType];
                    const highwayCost = (annualHighwayKm / 100) * car.highwayConsumptionLiters * fuelPrices[car.fuelType];
                    annualFuelCost = cityCost + highwayCost;
                }
                const purchasePrice = purchasePrices[car.fuelType];
                const totalCost = purchasePrice + (annualFuelCost * userInput.years);
                
                return {
                    name: car.type,
                    icon: carIcons[car.type],
                    totalCost,
                    annualFuelCost,
                    amortizationYears: null,
                    purchasePrice,
                    annualKm
                };
            });

            const gasolineCar = calculatedResults.find(r => r.name === 'Gasolina');
            if (gasolineCar) {
                calculatedResults.forEach(result => {
                    if (result.name !== 'Gasolina' && result.purchasePrice > gasolineCar.purchasePrice) {
                        const annualSavings = gasolineCar.annualFuelCost - result.annualFuelCost;
                        if (annualSavings > 0) {
                            result.amortizationYears = (result.purchasePrice - gasolineCar.purchasePrice) / annualSavings;
                        }
                    }
                });
            }

            setResults(calculatedResults.sort((a,b) => a.totalCost - b.totalCost));
            const geminiRecommendation = await getRecommendation(calculatedResults);
            setRecommendation(geminiRecommendation);

        } catch (err) {
            setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const bestResult = results ? results[0] : null;

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
            <main className="max-w-6xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900">Calculadora de Vehículo Ideal</h1>
                    <p className="mt-2 text-lg text-slate-600">Descubre qué tipo de coche te conviene más según tu conducción y costes.</p>
                </header>
                
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        
                        <div className="space-y-6 p-4 rounded-lg bg-slate-50 border">
                             <h2 className="text-xl font-bold text-sky-700 border-b pb-2">1. Tus Rutas</h2>
                             <h3 className="text-md font-semibold text-slate-700">Recorrido semanal (Lunes a Viernes)</h3>
                             <InputField label="KM por ciudad (ida)" name="weekdayCity" value={userInput.weekdayCity} onChange={handleInputChange} unit="km"/>
                             <InputField label="KM por autopista (ida)" name="weekdayHighway" value={userInput.weekdayHighway} onChange={handleInputChange} unit="km"/>
                             <h3 className="text-md font-semibold text-slate-700 pt-4">Recorrido total de fin de semana</h3>
                             <InputField label="KM por ciudad (total)" name="weekendCity" value={userInput.weekendCity} onChange={handleInputChange} unit="km"/>
                             <InputField label="KM por autopista (total)" name="weekendHighway" value={userInput.weekendHighway} onChange={handleInputChange} unit="km"/>
                        </div>
                        
                        <div className="space-y-6 p-4 rounded-lg bg-slate-50 border">
                             <h2 className="text-xl font-bold text-sky-700 border-b pb-2">2. Precios y Costes</h2>
                             <h3 className="text-md font-semibold text-slate-700">Precios de Combustible</h3>
                             <InputField label="Gasolina" name="priceGasoline" value={userInput.priceGasoline} onChange={handleInputChange} step={0.01} unit="€/L"/>
                             <InputField label="Diésel" name="priceDiesel" value={userInput.priceDiesel} onChange={handleInputChange} step={0.01} unit="€/L"/>
                             <InputField label="GLP" name="priceLPG" value={userInput.priceLPG} onChange={handleInputChange} step={0.01} unit="€/L"/>
                             <InputField label="Electricidad" name="priceElectricity" value={userInput.priceElectricity} onChange={handleInputChange} step={0.01} unit="€/kWh"/>
                        </div>

                        <div className="space-y-6 p-4 rounded-lg bg-slate-50 border">
                           <h2 className="text-xl font-bold text-sky-700 border-b pb-2">3. Tu Plan de Compra</h2>
                             <InputField label="Años con el vehículo" name="years" value={userInput.years} onChange={handleInputChange} unit="años"/>
                             <h3 className="text-md font-semibold text-slate-700 pt-4">Precios de Compra Estimados</h3>
                             <InputField label="Vehículo de Gasolina" name="purchaseGasoline" value={userInput.purchaseGasoline} onChange={handleInputChange} step={500} unit="€"/>
                             <InputField label="Vehículo Diésel" name="purchaseDiesel" value={userInput.purchaseDiesel} onChange={handleInputChange} step={500} unit="€"/>
                             <InputField label="Vehículo de GLP" name="purchaseLPG" value={userInput.purchaseLPG} onChange={handleInputChange} step={500} unit="€"/>
                             <InputField label="Vehículo Híbrido (HEV)" name="purchaseHEV" value={userInput.purchaseHEV} onChange={handleInputChange} step={500} unit="€"/>
                             <InputField label="Híbrido Enchufable (PHEV)" name="purchasePHEV" value={userInput.purchasePHEV} onChange={handleInputChange} step={500} unit="€"/>
                        </div>

                    </div>
                    <div className="mt-8 text-center">
                        <button type="submit" disabled={isLoading} className="w-full md:w-auto bg-sky-600 text-white font-bold py-3 px-12 rounded-lg hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-300 transition-all duration-300 disabled:bg-slate-400 disabled:cursor-not-allowed">
                            {isLoading ? 'Calculando...' : 'Calcular Mejor Opción'}
                        </button>
                    </div>
                </form>

                {isLoading && (
                    <div className="text-center mt-8">
                         <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
                         <p className="text-slate-600 mt-2">Consultando a Gemini para obtener los mejores datos...</p>
                    </div>
                )}
                {error && <div className="mt-8 p-4 text-center bg-red-100 text-red-700 border border-red-200 rounded-lg">{error}</div>}
                
                {results && recommendation && bestResult && (
                    <section className="mt-12">
                        <h2 className="text-3xl font-bold text-center mb-8">Resultados del Análisis</h2>

                        <div className="mb-10 p-6 bg-sky-50 border-l-4 border-sky-500 rounded-r-lg">
                           <h3 className="text-xl font-bold text-sky-800 mb-2">Recomendación de Gemini</h3>
                           <p className="text-slate-700 whitespace-pre-wrap">{recommendation}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-12">
                            {results.map(res => <ResultsCard key={res.name} result={res} isBest={res.name === bestResult.name} />)}
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
                             <h3 className="text-xl font-bold text-slate-800 mb-4 text-center">Comparativa de Coste Total a {userInput.years} años</h3>
                             <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={results} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis unit="€" tickFormatter={(value) => new Intl.NumberFormat('es-ES').format(value as number)}/>
                                    <Tooltip formatter={(value) => `${new Intl.NumberFormat('es-ES').format(value as number)} €`}/>
                                    <Legend />
                                    <Bar dataKey="totalCost" name="Coste Total" fill="#0ea5e9" />
                                    <Bar dataKey="purchasePrice" name="Precio Compra" fill="#a3a3a3" />
                                </BarChart>
                             </ResponsiveContainer>
                        </div>
                    </section>
                )}
                 <footer className="text-center mt-12 text-sm text-slate-500">
                    <p>Todos los cálculos son estimaciones basadas en los datos proporcionados y promedios de consumo. Los costes reales pueden variar.</p>
                </footer>
            </main>
        </div>
    );
};

export default App;
