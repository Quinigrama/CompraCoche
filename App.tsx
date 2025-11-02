import React, { useState, useCallback, useMemo } from 'react';
import { UserInput, CalculationResult } from './types';
import { getFuelConsumptionData, getRecommendation, getRouteDetails } from './services/geminiService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { GasolineIcon, DieselIcon, LPGIcon, HybridIcon, PHEVIcon } from './components/icons';

type InputProps = {
    label: string;
    name: keyof UserInput | string;
    value: number | string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    step?: number;
    unit?: string;
    type?: 'number' | 'text';
    placeholder?: string;
    error?: string;
};

const InputField: React.FC<InputProps> = ({ label, name, value, onChange, step = 1, unit, type = 'number', placeholder, error }) => (
    <div className="flex flex-col">
        <label htmlFor={name} className="mb-1 text-sm font-medium text-slate-600">{label}</label>
        <div className="flex items-center">
            <input
                type={type}
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                step={type === 'number' ? step : undefined}
                min={type === 'number' ? 0 : undefined}
                placeholder={placeholder}
                className={`w-full px-3 py-2 bg-white border rounded-md shadow-sm focus:outline-none focus:ring-2 ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-slate-300 focus:ring-sky-500 focus:border-sky-500'}`}
                aria-invalid={!!error}
                aria-describedby={error ? `${name}-error` : undefined}
            />
            {unit && <span className="ml-2 text-slate-500">{unit}</span>}
        </div>
        {error && <p id={`${name}-error`} className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
);

type RoutePreset = 'urban' | 'mixed' | 'highway';

const presetConfig: Record<RoutePreset, { label: string; city: number; highway: number; description: string }> = {
    urban: { label: 'Urbano', city: 0.8, highway: 0.2, description: '80% ciudad, 20% autopista' },
    mixed: { label: 'Mixto', city: 0.5, highway: 0.5, description: '50% ciudad, 50% autopista' },
    highway: { label: 'Autopista', city: 0.2, highway: 0.8, description: '20% ciudad, 80% autopista' },
};

const carColors: { [key: string]: string } = {
    'Gasolina': '#ef4444',
    'Diésel': '#3b82f6',
    'GLP': '#22c55e',
    'Híbrido (HEV)': '#eab308',
    'Híbrido Enchufable (PHEV)': '#8b5cf6',
};

const ResultsCard: React.FC<{ result: CalculationResult; years: number; isBest: boolean }> = ({ result, years, isBest }) => (
    <div className={`relative flex flex-col p-4 border rounded-lg shadow-sm transition-all duration-300 ${isBest ? 'bg-sky-50 border-sky-500 scale-105' : 'bg-white border-slate-200'}`}>
        {isBest && <div className="absolute top-0 right-0 px-2 py-1 text-xs font-bold text-white bg-sky-500 rounded-bl-lg rounded-tr-md">Mejor Opción</div>}
        <div className="flex items-center mb-3">
            <result.icon className={`w-8 h-8 mr-3 ${isBest ? 'text-sky-600' : 'text-slate-500'}`} />
            <h3 className="text-xl font-bold text-slate-800">{result.name}</h3>
        </div>
        <div className="space-y-2 text-sm">
            <p className="flex justify-between"><span>Coste total ({years} años):</span> <span className="font-semibold">{Math.round(result.totalCost).toLocaleString('es-ES')} €</span></p>
            <p className="flex justify-between"><span>Coste combustible/año:</span> <span className="font-semibold">{Math.round(result.annualFuelCost).toLocaleString('es-ES')} €</span></p>
            {result.amortizationYears !== null && (
                 <p className="flex justify-between"><span>Amortización vs Gasolina:</span> <span className="font-semibold">{result.amortizationYears.toFixed(1)} años</span></p>
            )}
        </div>
    </div>
);

const App: React.FC = () => {
    const [userInput, setUserInput] = useState<UserInput>({
        weekdayCommuteKm: 25,
        weekendTripKm: 150,
        estimatedAnnualKm: 0,
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
    const [chartData, setChartData] = useState<any[]>([]);
    const [recommendation, setRecommendation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [formErrors, setFormErrors] = useState<Partial<Record<keyof UserInput, string>>>({});
    const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);
    
    // State for new features
    const [routePreset, setRoutePreset] = useState<RoutePreset>('mixed');
    const [homeAddress, setHomeAddress] = useState('');
    const [workAddress, setWorkAddress] = useState('');

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        
        if (formErrors[name as keyof UserInput]) {
            setFormErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name as keyof UserInput];
                return newErrors;
            });
        }

        if (name === 'homeAddress') {
            setHomeAddress(value);
        } else if (name === 'workAddress') {
            setWorkAddress(value);
        } else {
            setUserInput(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
        }
    }, [formErrors]);
    
    const handleRouteCalculation = async () => {
        if (!homeAddress || !workAddress) {
            setError("Por favor, introduce la dirección de casa y del trabajo.");
            return;
        }
        setIsCalculatingRoute(true);
        setError(null);
        try {
            const { distance, cityPercentage } = await getRouteDetails(homeAddress, workAddress);
            setUserInput(prev => ({ ...prev, weekdayCommuteKm: Math.round(distance) }));

            if (cityPercentage >= 70) {
                setRoutePreset('urban');
            } else if (cityPercentage <= 30) {
                setRoutePreset('highway');
            } else {
                setRoutePreset('mixed');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ocurrió un error inesperado al calcular la ruta.");
        } finally {
            setIsCalculatingRoute(false);
        }
    };
    
    const validateForm = (): boolean => {
        const errors: Partial<Record<keyof UserInput, string>> = {};
        const positiveFields: (keyof UserInput)[] = [
            'priceGasoline', 'priceDiesel', 'priceLPG', 'priceElectricity',
            'purchaseGasoline', 'purchaseDiesel', 'purchaseLPG', 'purchaseHEV', 'purchasePHEV'
        ];
        const nonNegativeFields: (keyof UserInput)[] = ['weekdayCommuteKm', 'weekendTripKm', 'estimatedAnnualKm'];

        positiveFields.forEach(field => {
            if (userInput[field] <= 0) {
                errors[field] = 'Debe ser un valor positivo.';
            }
        });

        nonNegativeFields.forEach(field => {
            if (userInput[field] < 0) {
                errors[field] = 'No puede ser un valor negativo.';
            }
        });

        if (userInput.years < 1) {
             errors.years = 'Debe ser al menos 1 año.';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setError(null);
        setResults(null);
        setRecommendation(null);
        setChartData([]);

        try {
            const consumptionData = await getFuelConsumptionData();
            
            const preset = presetConfig[routePreset];
            let annualKm: number;
            let annualCityKm: number;
            let annualHighwayKm: number;

            if (userInput.estimatedAnnualKm > 0) {
                annualKm = userInput.estimatedAnnualKm;
                annualCityKm = annualKm * preset.city;
                annualHighwayKm = annualKm * preset.highway;
            } else {
                const weekdayCityKmPerTrip = userInput.weekdayCommuteKm * preset.city;
                const weekdayHighwayKmPerTrip = userInput.weekdayCommuteKm * preset.highway;
                const weekendCityKmTotal = userInput.weekendTripKm * preset.city;
                const weekendHighwayKmTotal = userInput.weekendTripKm * preset.highway;
                
                annualCityKm = (weekdayCityKmPerTrip * 2 * 5 + weekendCityKmTotal) * 52;
                annualHighwayKm = (weekdayHighwayKmPerTrip * 2 * 5 + weekendHighwayKmTotal) * 52;
                annualKm = annualCityKm + annualHighwayKm;
            }

            const purchasePrices: { [key: string]: number } = {
                'gasolina': userInput.purchaseGasoline, 'diesel': userInput.purchaseDiesel, 'glp': userInput.purchaseLPG,
                'hibrido': userInput.purchaseHEV, 'phev': userInput.purchasePHEV
            };
             const fuelPrices: { [key: string]: number } = {
                'gasolina': userInput.priceGasoline, 'diesel': userInput.priceDiesel, 'glp': userInput.priceLPG
            };
             const carIcons: { [key: string]: React.ComponentType<{ className?: string }> } = {
                'Gasolina': GasolineIcon, 'Diésel': DieselIcon, 'GLP': LPGIcon,
                'Híbrido (HEV)': HybridIcon, 'Híbrido Enchufable (PHEV)': PHEVIcon
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
                
                return { name: car.type, icon: carIcons[car.type], totalCost, annualFuelCost,
                    amortizationYears: null, purchasePrice, annualKm };
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
            
            const sortedResults = calculatedResults.sort((a, b) => a.totalCost - b.totalCost);
            setResults(sortedResults);

            const newChartData = [];
            for (let year = 0; year <= userInput.years; year++) {
                const yearData: { [key: string]: number | string } = { year: year };
                sortedResults.forEach(res => {
                    yearData[res.name] = Math.round(res.purchasePrice + (res.annualFuelCost * year));
                });
                newChartData.push(yearData);
            }
            setChartData(newChartData);

            const geminiRecommendation = await getRecommendation(calculatedResults, userInput.years);
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
                        
                        <div className="space-y-6 p-4 rounded-lg bg-slate-50 border lg:col-span-1">
                             <h2 className="text-xl font-bold text-sky-700 border-b pb-2">1. Tus Trayectos</h2>
                             <div className="space-y-4 p-3 rounded-md border bg-white">
                                <h3 className="text-sm font-semibold text-slate-500">Cálculo de Ruta con IA (Opcional)</h3>
                                <InputField label="Dirección de Casa" name="homeAddress" value={homeAddress} onChange={handleInputChange} type="text" placeholder="Calle, Número, Ciudad"/>
                                <InputField label="Dirección del Trabajo" name="workAddress" value={workAddress} onChange={handleInputChange} type="text" placeholder="Calle, Número, Ciudad"/>
                                <button type="button" onClick={handleRouteCalculation} disabled={isCalculatingRoute} className="w-full bg-slate-600 text-white text-sm font-bold py-2 px-4 rounded-md hover:bg-slate-700 disabled:bg-slate-400 transition-colors">
                                    {isCalculatingRoute ? 'Calculando...' : 'Estimar Ruta con IA'}
                                </button>
                             </div>
                             <InputField label="KM ida al trabajo" name="weekdayCommuteKm" value={userInput.weekdayCommuteKm} onChange={handleInputChange} unit="km" error={formErrors.weekdayCommuteKm}/>
                             <InputField label="KM totales del fin de semana" name="weekendTripKm" value={userInput.weekendTripKm} onChange={handleInputChange} unit="km" error={formErrors.weekendTripKm}/>
                             <div>
                                <InputField 
                                    label="Opcional: Kilómetros Anuales Totales" 
                                    name="estimatedAnnualKm" 
                                    value={userInput.estimatedAnnualKm} 
                                    onChange={handleInputChange} 
                                    unit="km/año" 
                                    error={formErrors.estimatedAnnualKm}
                                    placeholder="Ej: 15000"
                                />
                                {!formErrors.estimatedAnnualKm && (
                                     <p className="mt-1 text-xs text-slate-500">Si se introduce un valor, anulará el cálculo de trayectos.</p>
                                )}
                             </div>
                             <div>
                                 <h3 className="text-md font-semibold text-slate-700 mb-2">Tipo de Ruta Predominante</h3>
                                 <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                     {(['urban', 'mixed', 'highway'] as RoutePreset[]).map(preset => (
                                         <button key={preset} type="button" onClick={() => setRoutePreset(preset)}
                                             className={`w-full text-center px-3 py-2 rounded-md border-2 transition-all ${routePreset === preset ? 'bg-sky-500 border-sky-500 text-white font-bold' : 'bg-white border-slate-300 text-slate-700 hover:border-sky-400'}`}>
                                             <span className="block text-sm font-semibold">{presetConfig[preset].label}</span>
                                             <span className="block text-xs">{presetConfig[preset].description}</span>
                                         </button>
                                     ))}
                                 </div>
                             </div>
                        </div>
                        
                        <div className="space-y-6 p-4 rounded-lg bg-slate-50 border">
                             <h2 className="text-xl font-bold text-sky-700 border-b pb-2">2. Precios y Costes</h2>
                             <InputField label="Años con el vehículo" name="years" value={userInput.years} onChange={handleInputChange} unit="años" error={formErrors.years}/>
                             <h3 className="text-md font-semibold text-slate-700 pt-4">Precios de Combustible</h3>
                             <InputField label="Gasolina" name="priceGasoline" value={userInput.priceGasoline} onChange={handleInputChange} step={0.01} unit="€/L" error={formErrors.priceGasoline}/>
                             <InputField label="Diésel" name="priceDiesel" value={userInput.priceDiesel} onChange={handleInputChange} step={0.01} unit="€/L" error={formErrors.priceDiesel}/>
                             <InputField label="GLP" name="priceLPG" value={userInput.priceLPG} onChange={handleInputChange} step={0.01} unit="€/L" error={formErrors.priceLPG}/>
                             <InputField label="Electricidad" name="priceElectricity" value={userInput.priceElectricity} onChange={handleInputChange} step={0.01} unit="€/kWh" error={formErrors.priceElectricity}/>
                        </div>

                        <div className="space-y-6 p-4 rounded-lg bg-slate-50 border">
                           <h2 className="text-xl font-bold text-sky-700 border-b pb-2">3. Precios de Compra</h2>
                             <InputField label="Vehículo de Gasolina" name="purchaseGasoline" value={userInput.purchaseGasoline} onChange={handleInputChange} step={500} unit="€" error={formErrors.purchaseGasoline}/>
                             <InputField label="Vehículo Diésel" name="purchaseDiesel" value={userInput.purchaseDiesel} onChange={handleInputChange} step={500} unit="€" error={formErrors.purchaseDiesel}/>
                             <InputField label="Vehículo de GLP" name="purchaseLPG" value={userInput.purchaseLPG} onChange={handleInputChange} step={500} unit="€" error={formErrors.purchaseLPG}/>
                             <InputField label="Vehículo Híbrido (HEV)" name="purchaseHEV" value={userInput.purchaseHEV} onChange={handleInputChange} step={500} unit="€" error={formErrors.purchaseHEV}/>
                             <InputField label="Híbrido Enchufable (PHEV)" name="purchasePHEV" value={userInput.purchasePHEV} onChange={handleInputChange} step={500} unit="€" error={formErrors.purchasePHEV}/>
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
                        <h2 className="text-3xl font-bold text-center mb-6">Resultados del Análisis</h2>
                        
                        <div className="text-center mb-8 p-4 bg-slate-100 rounded-lg max-w-3xl mx-auto">
                           <p className="text-slate-700">
                               Análisis para un recorrido anual estimado de <span className="font-bold text-sky-600">{Math.round(bestResult.annualKm).toLocaleString('es-ES')} km</span> durante <span className="font-bold text-sky-600">{userInput.years} años</span>.
                           </p>
                       </div>

                        <div className="mb-10 p-6 bg-sky-50 border-l-4 border-sky-500 rounded-r-lg">
                           <h3 className="text-xl font-bold text-sky-800 mb-2">Recomendación de Gemini</h3>
                           <p className="text-slate-700 whitespace-pre-wrap">{recommendation}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-12">
                            {results.map(res => <ResultsCard key={res.name} result={res} years={userInput.years} isBest={res.name === bestResult.name} />)}
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
                             <h3 className="text-xl font-bold text-slate-800 mb-4 text-center">Evolución del Coste Total a {userInput.years} años</h3>
                             <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="year" unit=" año(s)" label={{ value: 'Años de uso', position: 'insideBottom', offset: -15 }} />
                                    <YAxis width={80} unit="€" tickFormatter={(value) => new Intl.NumberFormat('es-ES').format(value as number)}/>
                                    <Tooltip formatter={(value, name) => [`${new Intl.NumberFormat('es-ES').format(value as number)} €`, name]}/>
                                    <Legend />
                                    {results.map(res => (
                                        <Line key={res.name} type="monotone" dataKey={res.name} stroke={carColors[res.name] || '#737373'} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                    ))}
                                </LineChart>
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