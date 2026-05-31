#!/usr/bin/env python3
"""Convert VitalDB .vital recordings to dashboard-ready JSON.

This script keeps patient data anonymous and exports only numeric tracks needed
by the local dashboard. Track names vary by device and acquisition setup, so the
aliases below are intentionally permissive.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd
from scipy.signal import spectrogram


TRACK_ALIASES = {
    "EEG": ["Conox/EEG", "BIS/EEG", "EEG", "EEG1", "SedLine/EEG", "PSI/EEG"],
    "qCON": ["Conox/qCON", "qCON", "QCON", "qCon"],
    "qNOX": ["Conox/qNOX", "qNOX", "QNOX", "qNox"],
    "BSR": ["Conox/BSR", "BIS/BSR", "SedLine/BSR", "BSR", "SR"],
    "EMG": ["Conox/EMG", "BIS/EMG", "SedLine/EMG", "EMG"],
    "SQI": ["Conox/SQI", "BIS/SQI", "SedLine/SQI", "SQI", "SignalQuality"],
}

SPECTRAL_KEYWORDS = ("dsa", "spect", "spectrum", "spectral", "psd", "power")


def first_existing(names: Iterable[str], available: Iterable[str]) -> str | None:
    available_set = set(available)
    for name in names:
        if name in available_set:
            return name
    return None


def compact_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", name.lower())


def match_track(key: str, available: Iterable[str]) -> str | None:
    available_list = list(available)
    exact = first_existing(TRACK_ALIASES[key], available_list)
    if exact:
        return exact

    wanted = [compact_name(name) for name in TRACK_ALIASES[key]]
    for track in available_list:
        compact = compact_name(track)
        if compact in wanted or any(compact.endswith(alias) for alias in wanted):
            return track

    target = compact_name(key)
    for track in available_list:
        compact = compact_name(track)
        if target in compact:
            return track
    return None


def parse_frequency_from_name(name: str) -> float | None:
    lowered = name.lower()
    if not any(keyword in lowered for keyword in SPECTRAL_KEYWORDS):
        return None
    match = re.search(r"(\d+(?:[._]\d+)?)\s*(?:hz|hertz)?", lowered)
    if not match:
        return None
    value = float(match.group(1).replace("_", "."))
    return value if 0.5 <= value <= 60 else None


def normalize_time_column(data: pd.DataFrame, interval: float) -> pd.DataFrame:
    data = data.copy()
    if "Time" in data.columns:
        data = data.rename(columns={"Time": "time"})
    if "time" not in data.columns:
        data.insert(0, "time", np.arange(len(data)) * interval)
    data["time"] = (data["time"] - data["time"].iloc[0]) / 60.0
    return data


def sanitize(values: np.ndarray) -> list[float | None]:
    clean = []
    for value in values:
        if value is None or not np.isfinite(value):
            clean.append(None)
        else:
            clean.append(float(value))
    return clean


def open_vital(path: Path):
    try:
        import vitaldb
    except ImportError as exc:
        raise SystemExit(
            "Instala dependencias con: pip install vitaldb numpy pandas scipy"
        ) from exc

    return vitaldb.VitalFile(str(path))


def load_index_frame(vital_file, interval: float) -> tuple[pd.DataFrame, dict]:
    available_tracks = list(vital_file.get_track_names())
    selected_tracks = []
    rename_map = {}
    for key in ["qCON", "qNOX", "BSR", "EMG", "SQI"]:
        track = match_track(key, available_tracks)
        if track and track not in selected_tracks:
            selected_tracks.append(track)
            rename_map[track] = key

    if not selected_tracks:
        empty = pd.DataFrame({"time": []})
        return empty, {}

    data = vital_file.to_pandas(selected_tracks, interval=interval)
    data = data.rename(columns=rename_map)
    return normalize_time_column(data, interval), rename_map


def load_eeg(vital_file, fs: float) -> tuple[np.ndarray, str | None]:
    available_tracks = list(vital_file.get_track_names())
    eeg_track = match_track("EEG", available_tracks)
    if not eeg_track:
        return np.array([], dtype=float), None
    eeg_frame = vital_file.to_pandas([eeg_track], interval=1.0 / fs)
    column = eeg_track if eeg_track in eeg_frame.columns else eeg_frame.columns[-1]
    eeg = pd.to_numeric(eeg_frame[column], errors="coerce").to_numpy(dtype=float)
    return eeg, eeg_track


def load_native_dsa(vital_file, interval: float) -> dict:
    available_tracks = list(vital_file.get_track_names())
    spectral_tracks = []
    for track in available_tracks:
        frequency = parse_frequency_from_name(track)
        if frequency is not None:
            spectral_tracks.append((frequency, track))

    if len(spectral_tracks) < 8:
        return {"frequencies": [], "times": [], "power": [], "source": "none"}

    spectral_tracks = sorted(spectral_tracks, key=lambda item: item[0])
    frequencies = [item[0] for item in spectral_tracks]
    tracks = [item[1] for item in spectral_tracks]
    frame = normalize_time_column(vital_file.to_pandas(tracks, interval=interval), interval)
    matrix = []
    for track in tracks:
        values = pd.to_numeric(frame[track], errors="coerce").interpolate(limit_direction="both")
        matrix.append(values.to_numpy(dtype=float))

    return {
        "frequencies": [round(value, 2) for value in frequencies],
        "times": frame["time"].round(4).tolist(),
        "power": normalize_power_matrix(np.array(matrix, dtype=float)).round(4).tolist(),
        "source": "native",
    }


def has_dsa_power(dsa: dict) -> bool:
    power = dsa.get("power")
    if isinstance(power, np.ndarray):
        return power.size > 0
    return bool(power)


def pick_column(frame: pd.DataFrame, key: str) -> str | None:
    return first_existing([key, key.lower(), key.upper(), *TRACK_ALIASES[key]], frame.columns)


def normalize_power_matrix(power: np.ndarray) -> np.ndarray:
    finite = power[np.isfinite(power)]
    if finite.size == 0:
        return np.zeros_like(power, dtype=float)
    low, high = np.percentile(finite, [5, 98])
    if high <= low:
        high = low + 1
    clipped = np.clip(power, low, high)
    return (clipped - low) / (high - low)


def compute_dsa(eeg: np.ndarray, fs: float) -> dict:
    eeg = pd.Series(eeg).interpolate(limit_direction="both").fillna(0).to_numpy()
    if len(eeg) < max(16, int(fs * 2)):
        return {"frequencies": [], "times": [], "power": [], "source": "none"}
    nperseg = min(int(fs * 4), len(eeg))
    noverlap = min(int(fs * 2), nperseg // 2)
    frequencies, times, power = spectrogram(
        eeg,
        fs=fs,
        window="hann",
        nperseg=nperseg,
        noverlap=noverlap,
        scaling="density",
        mode="psd",
    )
    mask = (frequencies >= 0.5) & (frequencies <= 45)
    power_db = 10 * np.log10(power[mask] + 1e-12)
    normalized = normalize_power_matrix(power_db)
    return {
        "frequencies": frequencies[mask].round(2).tolist(),
        "times": (times / 60.0).round(4).tolist(),
        "power": normalized.round(4).tolist(),
        "source": "eeg_spectrogram",
    }


def convert_payload(input_path: Path, fs: float, interval: float) -> dict:
    vital_file = open_vital(input_path)
    available_tracks = list(vital_file.get_track_names())
    frame, selected_indices = load_index_frame(vital_file, interval)
    time = frame["time"].round(4).tolist()
    indices = {"time": time}

    for key in ["qCON", "qNOX", "BSR", "EMG", "SQI"]:
        column = pick_column(frame, key)
        indices[key] = sanitize(frame[column].to_numpy()) if column else []

    eeg_values, eeg_track = load_eeg(vital_file, fs)
    dsa = load_native_dsa(vital_file, interval=2.0)
    if not has_dsa_power(dsa):
        dsa = compute_dsa(eeg_values, fs) if eeg_track else {
            "frequencies": [],
            "times": [],
            "power": [],
            "source": "none",
        }
    eeg = sanitize(eeg_values) if eeg_track else []
    if not time:
        time = dsa.get("times", [])
        indices["time"] = time

    return {
        "metadata": {
            "patient_id": "anonimized",
            "surgery_date": "",
            "start_time": "",
            "end_time": "",
            "sampling_rate": fs,
            "device": "VitalDB/Conox-compatible",
            "dsa_source": dsa.get("source", "none"),
            "eeg_track": eeg_track or "",
            "selected_tracks": selected_indices,
            "available_tracks_preview": available_tracks[:80],
        },
        "time": time,
        "eeg": eeg,
        "dsa": dsa,
        "indices": indices,
        "events": [],
    }


def convert(input_path: Path, output_path: Path, fs: float, interval: float) -> None:
    payload = convert_payload(input_path, fs, interval)
    output_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert .vital to EEG dashboard JSON.")
    parser.add_argument("input", type=Path, help="Path to .vital file")
    parser.add_argument("-o", "--output", type=Path, default=Path("dashboard-data.json"))
    parser.add_argument("--fs", type=float, default=128.0, help="EEG sampling rate in Hz")
    parser.add_argument("--interval", type=float, default=1.0, help="VitalDB resampling interval in seconds")
    args = parser.parse_args()
    convert(args.input, args.output, args.fs, args.interval)
    print(f"JSON escrito en {args.output}")


if __name__ == "__main__":
    main()
