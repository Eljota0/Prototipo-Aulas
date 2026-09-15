import json

with open('../../.system_generated/logs/transcript_full.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        if 'nivel-dos-prototipo.component.html' in line and '<!-- Panel Izquierdo: Telemetría (Medidores) -->' not in line and 'escala-wrapper' not in line:
            # Try to find the file content or something that shows what it was.
            pass
