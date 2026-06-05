import json
import os
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


PORT = int(os.environ.get("PORT", "8766"))


class WorkoutHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/api/ai-workout":
            self.send_error(404)
            return

        body = self.rfile.read(int(self.headers.get("Content-Length", "0") or "0"))
        try:
            payload = json.loads(body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            self._send_json({"message": "Invalid JSON."}, status=400)
            return

        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            self._send_json(
                {
                    "message": "Set OPENAI_API_KEY and restart server.py to enable AI generation.",
                    "provider": "Not configured",
                },
                status=503,
            )
            return

        try:
            workout = create_openai_workout(api_key, payload)
        except Exception as exc:
            self._send_json({"message": f"AI request failed: {exc}", "provider": "OpenAI"}, status=502)
            return

        self._send_json({"provider": "OpenAI", "workout": workout})

    def _send_json(self, payload, status=200):
        encoded = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)


def create_openai_workout(api_key, payload):
    model = os.environ.get("OPENAI_MODEL", "gpt-4.1-mini")
    prompt = build_prompt(payload)
    request_payload = {
        "model": model,
        "input": prompt,
        "text": {"format": {"type": "json_object"}},
    }
    request = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(request_payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(error_body[:500]) from exc

    text = extract_response_text(data)
    parsed = json.loads(text)
    return validate_workout(parsed)


def extract_response_text(data):
    if "output_text" in data:
        return data["output_text"]

    chunks = []
    for item in data.get("output", []):
        for content in item.get("content", []):
            if content.get("type") in ("output_text", "text"):
                chunks.append(content.get("text", ""))
    if not chunks:
        raise RuntimeError("The AI response did not include text.")
    return "".join(chunks)


def build_prompt(payload):
    exercises = payload.get("exercises", [])
    history = payload.get("history", [])
    exercise_lines = "\n".join(f"- {item.get('name')} ({item.get('category')})" for item in exercises)
    history_lines = "\n".join(
        f"- {item.get('date')} {item.get('modality')}: {', '.join(ex.get('name', '') for ex in item.get('main', []))}"
        for item in history
    )

    return f"""
You are a functional fitness coach. Create one workout for {payload.get('date')}.
Intensity: {payload.get('intensity')}. Main block exercise count: {payload.get('size')}.
Avoid recent repeats: {payload.get('avoidRecent')}.

Available exercise library:
{exercise_lines}

Saved workout history:
{history_lines or "- none"}

Return only JSON with this shape:
{{
  "title": "short title",
  "modality": "AMRAP | EMOM | OTM | E2MOM | For Time | Tabata | Chipper",
  "duration": "duration or time cap",
  "intensity": "easy | mixed | hard",
  "source": "AI",
  "warmup": [
    {{"name": "movement", "prescription": "dose", "category": "category"}}
  ],
  "main": [
    {{
      "name": "movement",
      "prescription": "dose or station label",
      "category": "category",
      "variants": [
        {{"label": "A", "text": "standard option"}},
        {{"label": "B", "text": "easier scale"}},
        {{"label": "C", "text": "harder or alternate option"}}
      ]
    }}
  ],
  "notes": "brief coaching and safety notes"
}}

Rules:
- Always include 4 warm-up items.
- Always include the requested number of main block items.
- For OTM, EMOM, and E2MOM, prescribe one station per interval, not a dense circuit.
- OTM may use 1, 2, 2.5, or 3 minute intervals. State the interval in duration and prescription.
- For interval modalities, include 2 or 3 variants per station so different athletes can scale.
- Each 1 minute station should leave 15-20 seconds of rest or transition time.
- Use English names.
- Prefer movements from the library.
- Do not prescribe unsafe maximal loading.
""".strip()


def validate_workout(workout):
    required = ["title", "modality", "duration", "warmup", "main", "notes"]
    for key in required:
        if key not in workout:
            raise RuntimeError(f"Missing key in AI workout: {key}")
    if not isinstance(workout["warmup"], list) or not isinstance(workout["main"], list):
        raise RuntimeError("AI workout warmup and main must be lists.")
    workout["source"] = "AI"
    return workout


if __name__ == "__main__":
    print(f"Serving functional workout app at http://127.0.0.1:{PORT}/")
    ThreadingHTTPServer(("127.0.0.1", PORT), WorkoutHandler).serve_forever()
