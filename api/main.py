from __future__ import annotations

import sys
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import List

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, model_validator


BASE_DIR = Path(__file__).resolve().parents[1]
TRAINING_DIR = BASE_DIR / "training"
MODEL_SUPPORT_DIR = TRAINING_DIR / "multiple-models"
MODEL_PATH = TRAINING_DIR / "forest-model.joblib"
WINDOW_SIZE = 100
WINDOW_STEP = 50

if str(MODEL_SUPPORT_DIR) not in sys.path:
    sys.path.insert(0, str(MODEL_SUPPORT_DIR))


FEATURE_COLUMNS = [
    "AccelX_mean",
    "AccelX_std",
    "AccelX_min",
    "AccelX_max",
    "AccelY_mean",
    "AccelY_std",
    "AccelY_min",
    "AccelY_max",
    "AccelZ_mean",
    "AccelZ_std",
    "AccelZ_min",
    "AccelZ_max",
    "GyroX_mean",
    "GyroX_std",
    "GyroX_min",
    "GyroX_max",
    "GyroY_mean",
    "GyroY_std",
    "GyroY_min",
    "GyroY_max",
    "GyroZ_mean",
    "GyroZ_std",
    "GyroZ_min",
    "GyroZ_max",
    "accel_mag_mean",
    "accel_mag_std",
    "accel_mag_min",
    "accel_mag_max",
    "gyro_mag_mean",
    "gyro_mag_std",
    "gyro_mag_min",
    "gyro_mag_max",
]


class SensorWindowRequest(BaseModel):
    ax: List[float] = Field(..., min_length=1)
    ay: List[float] = Field(..., min_length=1)
    az: List[float] = Field(..., min_length=1)
    gx: List[float] = Field(..., min_length=1)
    gy: List[float] = Field(..., min_length=1)
    gz: List[float] = Field(..., min_length=1)

    @model_validator(mode="after")
    def validate_lengths(self) -> "SensorWindowRequest":
        lengths = {
            "ax": len(self.ax),
            "ay": len(self.ay),
            "az": len(self.az),
            "gx": len(self.gx),
            "gy": len(self.gy),
            "gz": len(self.gz),
        }
        unique_lengths = set(lengths.values())
        if len(unique_lengths) != 1:
            raise ValueError(f"All sensor arrays must be the same length. Got lengths: {lengths}")
        return self


class StreamSample(BaseModel):
    sequence_number: int
    ax: float
    ay: float
    az: float
    gx: float
    gy: float
    gz: float


class StreamRequest(BaseModel):
    device_id: str = Field(..., min_length=1)
    samples: List[StreamSample] = Field(..., min_length=1)


@dataclass
class DeviceBuffer:
    ax: deque[float] = field(default_factory=lambda: deque(maxlen=WINDOW_SIZE))
    ay: deque[float] = field(default_factory=lambda: deque(maxlen=WINDOW_SIZE))
    az: deque[float] = field(default_factory=lambda: deque(maxlen=WINDOW_SIZE))
    gx: deque[float] = field(default_factory=lambda: deque(maxlen=WINDOW_SIZE))
    gy: deque[float] = field(default_factory=lambda: deque(maxlen=WINDOW_SIZE))
    gz: deque[float] = field(default_factory=lambda: deque(maxlen=WINDOW_SIZE))
    last_sequence_number: int | None = None
    samples_since_prediction: int = 0

    def append(self, sample: StreamSample) -> None:
        self.ax.append(sample.ax)
        self.ay.append(sample.ay)
        self.az.append(sample.az)
        self.gx.append(sample.gx)
        self.gy.append(sample.gy)
        self.gz.append(sample.gz)
        self.last_sequence_number = sample.sequence_number
        self.samples_since_prediction += 1

    def sample_count(self) -> int:
        return len(self.ax)

    def is_ready(self) -> bool:
        return self.sample_count() >= WINDOW_SIZE

    def should_predict(self) -> bool:
        return self.is_ready() and self.samples_since_prediction >= WINDOW_STEP

    def mark_predicted(self) -> None:
        self.samples_since_prediction = 0


def _summary(prefix: str, values: np.ndarray) -> dict[str, float]:
    return {
        f"{prefix}_mean": float(values.mean()),
        f"{prefix}_std": float(values.std(ddof=0)),
        f"{prefix}_min": float(values.min()),
        f"{prefix}_max": float(values.max()),
    }


def _build_feature_frame(payload: SensorWindowRequest) -> pd.DataFrame:
    ax = np.asarray(payload.ax, dtype=float)
    ay = np.asarray(payload.ay, dtype=float)
    az = np.asarray(payload.az, dtype=float)
    gx = np.asarray(payload.gx, dtype=float)
    gy = np.asarray(payload.gy, dtype=float)
    gz = np.asarray(payload.gz, dtype=float)

    accel_mag = np.linalg.norm(np.column_stack((ax, ay, az)), axis=1)
    gyro_mag = np.linalg.norm(np.column_stack((gx, gy, gz)), axis=1)

    features = {}
    features.update(_summary("AccelX", ax))
    features.update(_summary("AccelY", ay))
    features.update(_summary("AccelZ", az))
    features.update(_summary("GyroX", gx))
    features.update(_summary("GyroY", gy))
    features.update(_summary("GyroZ", gz))
    features.update(_summary("accel_mag", accel_mag))
    features.update(_summary("gyro_mag", gyro_mag))

    return pd.DataFrame([[features[column] for column in FEATURE_COLUMNS]], columns=FEATURE_COLUMNS)


def _load_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")
    return joblib.load(MODEL_PATH)


def _window_request_from_buffer(buffer: DeviceBuffer) -> SensorWindowRequest:
    return SensorWindowRequest(
        ax=list(buffer.ax),
        ay=list(buffer.ay),
        az=list(buffer.az),
        gx=list(buffer.gx),
        gy=list(buffer.gy),
        gz=list(buffer.gz),
    )


def _predict_from_window(model, payload: SensorWindowRequest) -> dict[str, object]:
    feature_frame = _build_feature_frame(payload)
    prediction = model.predict(feature_frame)[0]
    response: dict[str, object] = {
        "label": str(prediction),
        "confidence": None,
    }
    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(feature_frame)[0]
        classes = [str(label) for label in model.classes_]
        probability_map = {label: float(prob) for label, prob in zip(classes, probabilities)}
        response["confidence"] = probability_map.get(str(prediction))
    return response


app = FastAPI(title="Activity Prediction API")


@app.on_event("startup")
def startup() -> None:
    app.state.model = _load_model()
    app.state.device_buffers = {}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/stream")
def stream(payload: StreamRequest) -> dict[str, object]:
    try:
        model = app.state.model
        device_buffers: dict[str, DeviceBuffer] = app.state.device_buffers
    except AttributeError as exc:
        raise HTTPException(status_code=500, detail="API state is not initialized") from exc

    buffer = device_buffers.setdefault(payload.device_id, DeviceBuffer())
    accepted_samples = 0
    dropped_samples = 0
    sequence_warning = None

    for sample in payload.samples:
        if buffer.last_sequence_number is not None:
            expected = buffer.last_sequence_number + 1
            if sample.sequence_number <= buffer.last_sequence_number:
                dropped_samples += 1
                continue
            if sample.sequence_number != expected and sequence_warning is None:
                sequence_warning = (
                    f"Expected sequence_number {expected} but received {sample.sequence_number}"
                )

        buffer.append(sample)
        accepted_samples += 1

    response: dict[str, object] = {
        "device_id": payload.device_id,
        "accepted_samples": accepted_samples,
        "dropped_samples": dropped_samples,
        "buffer_sample_count": buffer.sample_count(),
        "window_size": WINDOW_SIZE,
        "step_size": WINDOW_STEP,
        "ready": buffer.is_ready(),
        "prediction_ready": False,
        "prediction": None,
        "samples_needed": max(0, WINDOW_SIZE - buffer.sample_count()),
        "last_sequence_number": buffer.last_sequence_number,
        "sequence_warning": sequence_warning,
    }

    if buffer.should_predict():
        try:
            prediction = _predict_from_window(model, _window_request_from_buffer(buffer))
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc
        buffer.mark_predicted()
        response["prediction"] = prediction
        response["prediction_ready"] = True

    return response
