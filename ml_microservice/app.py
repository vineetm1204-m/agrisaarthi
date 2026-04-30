from flask import Flask, request, jsonify
from flask_cors import CORS
import math
from datetime import datetime
import os
import random
try:
    import joblib
except ImportError:
    joblib = None

# Try to load ML model
MODEL_PATH = "F:\PROGRAMMING LANGUAGES\AgriSaarthi\agrisaarthi\ml_microservice\models\irrigation_model.pkl"
irrigation_model = None
if joblib and os.path.exists(MODEL_PATH):
    try:
        irrigation_model = joblib.load(MODEL_PATH)
    except Exception as e:
        print("Could not load ML model:", e)

app = Flask(__name__)
CORS(app)

# Standard FAO-56 Kc table for top Indian crops (simplified)
KC_TABLE = {
    "Wheat": {"init": 0.3, "mid": 1.15, "end": 0.25, "duration": 120},
    "Rice": {"init": 1.05, "mid": 1.20, "end": 0.90, "duration": 150},
    "Sugarcane": {"init": 0.40, "mid": 1.25, "end": 0.75, "duration": 365},
    "Cotton": {"init": 0.35, "mid": 1.15, "end": 0.50, "duration": 180},
    "Maize": {"init": 0.30, "mid": 1.20, "end": 0.35, "duration": 100},
}

SOIL_WATER_HOLDING = {
    "Loamy": 0.15,
    "Clay": 0.20,
    "Sandy": 0.08,
    "Silty": 0.18,
}

@app.route('/api/irrigation/recommend', methods=['POST'])
def recommend_irrigation():
    try:
        data = request.json
        crop_type = data.get('crop_type', 'Wheat')
        area_acres = float(data.get('area_acres', 1))
        soil_type = data.get('soil_type', 'Loamy')
        lat = float(data.get('lat', 20.0))
        lng = float(data.get('lng', 80.0))
        sowing_date_str = data.get('sowing_date', '2025-01-01')

        # 1. Fetch weather from OpenWeatherMap (Mocked for now to avoid exposing API keys)
        # In a real scenario, use: requests.get(f"https://api.openweathermap.org/data/2.5/onecall?lat={lat}&lon={lng}...")
        mean_temp = 28.5
        max_temp = 34.0
        min_temp = 23.0
        humidity = 65
        wind_speed = 3.2
        precipitation_forecast_24h = 5.0 # mm

        # 2. Calculate reference evapotranspiration (ET0) using simplified Penman-Monteith (Hargreaves-Samani equation format)
        # ET0 = 0.0023 * (T + 17.8) * sqrt(Tdiff) * Ra
        t_diff = max_temp - min_temp
        ra = 15.0 # Extraterrestrial radiation (simplified constant for demo, varies by lat/day)
        et0 = 0.0023 * (mean_temp + 17.8) * math.sqrt(t_diff) * ra

        # 3. Multiply by crop coefficient (Kc)
        kc_data = KC_TABLE.get(crop_type, KC_TABLE["Wheat"])
        sowing_date = datetime.strptime(sowing_date_str, "%Y-%m-%d")
        days_since_sowing = (datetime.now() - sowing_date).days
        
        # Determine growth stage (init: 20%, dev: 30%, mid: 30%, late: 20%)
        duration = kc_data["duration"]
        if days_since_sowing < duration * 0.2:
            kc = kc_data["init"]
        elif days_since_sowing < duration * 0.8:
            kc = kc_data["mid"]
        else:
            kc = kc_data["end"]

        etc = et0 * kc # Crop evapotranspiration

        # 4. Subtract effective rainfall
        effective_rainfall = 0.8 * precipitation_forecast_24h

        # 5. Adjust for soil type water holding capacity
        # A simpler soil factor for this equation
        soil_factor = SOIL_WATER_HOLDING.get(soil_type, 0.15)
        
        # Net irrigation requirement (mm/day)
        net_irrigation = max(0, etc - effective_rainfall)
        
        # Water liters needed = mm * area (m2)
        area_m2 = area_acres * 4046.86
        water_liters_needed = net_irrigation * area_m2 # 1 mm over 1 m2 = 1 Liter
        
        # Irrigation hours today (assuming standard drip irrigation rate of 4 liters per hour per sq meter)
        drip_rate_lph_per_m2 = 4.0
        irrigation_hours = net_irrigation / drip_rate_lph_per_m2 if net_irrigation > 0 else 0

        # Output payload
        response = {
            "irrigation_hours_today": round(irrigation_hours, 2),
            "irrigation_time_of_day": "06:00 AM", # Best time to avoid evaporation
            "water_liters_needed": round(water_liters_needed, 2),
            "weekly_savings_vs_average": 4500, # liters saved compared to traditional flooding
            "et0_mm_day": round(et0, 2),
            "kc_coefficient": round(kc, 2),
            "effective_rainfall_mm": round(effective_rainfall, 2),
            "soil_moisture_percent": 42.5, # Estimated
            "weather_context": {
                "temp_min": min_temp,
                "temp_max": max_temp,
                "humidity": humidity,
                "wind_speed": wind_speed,
                "rain_prob": 30
            }
        }
        
        return jsonify(response)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/irrigation/simulate', methods=['POST'])
def simulate_irrigation():
    try:
        data = request.json
        crop_type = data.get('crop_type', 'Wheat')
        soil_type = data.get('soil_type', 'Loamy')
        area_acres = float(data.get('area_acres', 1))
        days = int(data.get('days', 7))
        mode = data.get('mode', 'auto') # 'auto', 'manual', 'ml'
        manual_inputs = data.get('manual_inputs', {})

        soil_moisture = float(manual_inputs.get('initial_soil_moisture', 50))
        daily_results = []
        total_irrigation_mm = 0
        total_etc_mm = 0
        
        # Crop coeff logic (simplified)
        kc_data = KC_TABLE.get(crop_type, KC_TABLE["Wheat"])
        kc = kc_data["mid"] # assume mid stage for simulation

        # Helper to generate weather
        def get_weather(day_idx, mode, manual_inputs):
            if mode == 'manual':
                return {
                    "mean_temp": float(manual_inputs.get('mean_temp', 32)),
                    "max_temp": float(manual_inputs.get('max_temp', 38)),
                    "min_temp": float(manual_inputs.get('min_temp', 24)),
                    "humidity": float(manual_inputs.get('humidity', 65)),
                    "wind_speed": float(manual_inputs.get('wind_speed', 3)),
                    "rainfall": float(manual_inputs.get('rainfall', 5))
                }
            else:
                # auto/ml simulated weather per day
                base_temp = 30 + math.sin(day_idx) * 5
                return {
                    "mean_temp": base_temp,
                    "max_temp": base_temp + 5,
                    "min_temp": base_temp - 5,
                    "humidity": 60 + random.uniform(-10, 10),
                    "wind_speed": max(1, 3 + random.uniform(-1, 1)),
                    "rainfall": max(0, 5 + random.uniform(-5, 5)) if day_idx % 3 == 0 else 0
                }

        for day in range(1, days + 1):
            weather = get_weather(day, mode, manual_inputs)
            
            # ET0 (Hargreaves-Samani)
            t_diff = max(0, weather["max_temp"] - weather["min_temp"])
            et0 = 0.0023 * (weather["mean_temp"] + 17.8) * math.sqrt(t_diff) * 15.0
            etc = et0 * kc
            total_etc_mm += etc
            
            rainfall = weather["rainfall"]
            
            # Decide irrigation
            if mode == "ml" and irrigation_model:
                # features: [mean_temp, humidity, wind_speed, soil_moisture, rainfall, crop_encoded]
                # Dummy encoding for crop: 1
                features = [[weather["mean_temp"], weather["humidity"], weather["wind_speed"], soil_moisture, rainfall, 1]]
                try:
                    irrigation_mm = float(irrigation_model.predict(features)[0])
                except Exception:
                    irrigation_mm = max(0, etc - rainfall)
            else:
                irrigation_mm = max(0, etc - rainfall)
                
            # Update soil moisture (simple bucket model: +irrigation +rainfall -etc)
            # Cap at 100% (assuming 100mm is field capacity for simplicity)
            soil_moisture = min(100, max(0, soil_moisture + rainfall + irrigation_mm - etc))
            
            total_irrigation_mm += irrigation_mm
            
            daily_results.append({
                "day": day,
                "soil_moisture": round(soil_moisture, 2),
                "rainfall": round(rainfall, 2),
                "et0": round(et0, 2),
                "etc": round(etc, 2),
                "irrigation": round(irrigation_mm, 2)
            })

        # Calculate summary
        area_m2 = area_acres * 4046.86
        total_water_used_liters = total_irrigation_mm * area_m2
        
        # Assume baseline uses 20% more water
        baseline_water = (total_etc_mm * area_m2) * 1.2
        water_saved = max(0, baseline_water - total_water_used_liters)
        efficiency = (water_saved / baseline_water * 100) if baseline_water > 0 else 0

        return jsonify({
            "summary": {
                "total_water_used": round(total_water_used_liters, 2),
                "water_saved": round(water_saved, 2),
                "efficiency_percent": round(efficiency, 2)
            },
            "daily": daily_results
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
