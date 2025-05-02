from flask import Flask, request, jsonify
import joblib
import numpy as np

# حمّل الموديل الجاهز
model = joblib.load("../random_forest.joblib")  # لو الملف في فولدر برا Camera_System

app = Flask(__name__)

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        features = np.array(data["features"]).reshape(1, -1)
        prediction = model.predict(features)[0]
        return jsonify({"prediction": prediction})
    except Exception as e:
        return jsonify({"error": str(e)})

if __name__ == "__main__":
    app.run(port=5001, debug=True)
